import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env as privateEnv } from '$env/dynamic/private';
import { fetchVatsimMember, ratingToShortLong } from '$lib/server/vatsimMember';
import { createAdminClient } from '$lib/server/supabaseAdmin';

const deleteUserCompletely = async (userId: string) => {
	try {
		console.log(`[deleteUserCompletely] Starting deletion for user ${userId}`);
		const admin = createAdminClient();
		const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
		if (deleteUserError) {
			console.error(`[deleteUserCompletely] Failed to delete auth user ${userId}:`, deleteUserError);
			throw deleteUserError;
		}
		console.log(`[deleteUserCompletely] Successfully deleted auth user ${userId}`);
	} catch (e) {
		console.error(`[deleteUserCompletely] Exception while deleting user ${userId}:`, e);
		throw e;
	}
};

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) {
		throw redirect(303, '/auth/login');
	}
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

	if (profile && profile.ermc_access_granted && profile.name && profile.cid && profile.rating && profile.subdivision) {
		throw redirect(303, '/dashboard');
	}

	return {
		user,
		profile
	};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, user } }) => {
		try {
			if (!user) return fail(401, { message: 'Unauthorized' });
			if (!supabase) return fail(500, { message: 'Server configuration error.' });

			const formData = await request.formData();
			const fullName = (formData.get('full_name') as string) || '';
			const cid = (formData.get('cid') as string) || '';
			const subdivision = 'Khaleej vACC';
			const isStaff = formData.get('is_staff') === 'on';
			const position = (formData.get('position') as string) || null;
			const terms = formData.get('terms') === 'on';
			const accessKey = (formData.get('access_key') as string) || '';

			if (!terms) {
				return fail(400, { message: 'You must accept the Terms of Service, Privacy Policy, and Terms of Use.' });
			}
			const expectedKey = privateEnv.ACCESS_KEY;
			if (!expectedKey) {
				console.error('Missing ACCESS_KEY');
				return fail(500, { message: 'Server configuration error.' });
			}
			if (!accessKey || accessKey !== expectedKey) {
				return fail(400, { message: 'Invalid access key.' });
			}
			if (!fullName || !cid || !subdivision) {
				return fail(400, { message: 'Please fill in all required fields.' });
			}
			if (isStaff && (!position || position.trim().length === 0)) {
				return fail(400, { message: 'Please enter your staff position.' });
			}

			let member: Awaited<ReturnType<typeof fetchVatsimMember>>;
			try {
				member = await fetchVatsimMember(cid);
			} catch (e) {
				console.error('VATSIM member verify failed:', e);
				return fail(400, { message: 'Unable to verify your CID with VATSIM right now. Please try again shortly.' });
			}

			const vatsimSubdivisionId = member.subdivision_id != null ? String(member.subdivision_id).trim() : '';
			if (vatsimSubdivisionId.toUpperCase() !== 'KHLJ') {
				const displaySubdivision = vatsimSubdivisionId || 'unknown';
				try {
					await supabase.auth.signOut();
				} catch (e) {
					console.error('Sign out failed during rejected-subdivision deletion:', e);
				}
				try {
					await deleteUserCompletely(user.id);
				} catch (e) {
					console.error('Delete failed during rejected-subdivision deletion:', e);
				}
				return fail(400, {
					message: `We do not currently offer our services to your VATSIM subdivision (${displaySubdivision}). ERMC is only available for KHLJ at this time.`,
					rejectedSubdivision: true,
					vatsimSubdivisionId
				});
			}

			const rating = Number(member.rating);
			if (!Number.isFinite(rating) || rating <= 0) return fail(400, { message: 'Unable to verify your VATSIM rating.' });
			if (rating === 1) return fail(400, { message: 'Observer (OBS) is not eligible to control. Please select S1 or higher.' });

			const ratingInfo = ratingToShortLong(rating);
			const rating_short = ratingInfo.short;
			const rating_long = ratingInfo.long;

			const email = user.email || user.user_metadata?.email || null;

			const nowIso = new Date().toISOString();
			
			// Use upsert instead of update to ensure row exists and avoid race conditions
			const { error } = await supabase
				.from('profiles')
				.upsert({
					id: user.id, // Explicitly provide ID for upsert
					name: fullName,
					email: email || null,
					cid,
					rating,
					rating_short,
					rating_long,
					vatsim_region_id: member.region_id != null ? String(member.region_id) : null,
					vatsim_division_id: member.division_id != null ? String(member.division_id) : null,
					vatsim_subdivision_id: member.subdivision_id != null ? String(member.subdivision_id) : null,
					vatsim_country: member.country ?? null,
					vatsim_countystate: member.countystate ?? null,
					vatsim_pilotrating: member.pilotrating != null ? String(member.pilotrating) : null,
					subdivision,
					role: isStaff ? 'staff' : 'guest',
					position,
					updated_at: nowIso,
					ermc_access_granted: true,
					ermc_access_verified_at: nowIso
				}, { onConflict: 'id' });

			if (error) {
				const errorId = crypto.randomUUID();
				console.error('Profile upsert failed:', errorId, error);
				// If error is 23505 (unique violation), it might be CID collision if CID is unique
				if (error.code === '23505' && error.message?.includes('cid')) {
					return fail(400, { message: 'This CID is already registered to another user.' });
				}
				return fail(500, { message: `Failed to save profile. (Error: ${errorId})` });
			}

			// Removed separate update for access_granted since we included it in upsert
			throw redirect(303, '/dashboard');
		} catch (e) {
			if (typeof e === 'object' && e && 'status' in e) {
				const status = Number((e as { status?: number }).status);
				if (Number.isFinite(status) && status >= 300 && status < 400) throw e;
			}
			const errorId =
				typeof globalThis !== 'undefined' && (globalThis as any)?.crypto?.randomUUID
					? (globalThis as any).crypto.randomUUID()
					: String(Date.now());
			console.error('Onboarding registration failed:', errorId, e);
			return fail(500, { message: `Registration failed. Please try again. (Error: ${errorId})` });
		}
	},
	deleteRejectedAccount: async ({ locals: { supabase, user } }) => {
		if (!user) throw redirect(303, '/');
		if (!supabase) throw redirect(303, '/');

		try {
			await supabase.auth.signOut();
		} catch (e) {
			console.error('Sign out failed during rejected-subdivision deletion:', e);
		}

		try {
			await deleteUserCompletely(user.id);
		} catch (e) {
			console.error('Delete failed during rejected-subdivision deletion:', e);
		}

		throw redirect(303, '/');
	},
	cancelRegistration: async ({ locals: { supabase, user } }) => {
		if (!user) throw redirect(303, '/');
		if (!supabase) throw redirect(303, '/');

		console.log('[cancelRegistration] Started for user', user.id);

		try {
			if (!privateEnv.SUPABASE_SERVICE_ROLE) {
				const errorId = crypto.randomUUID();
				console.error('[cancelRegistration] Missing SUPABASE_SERVICE_ROLE:', errorId);
				// Try to sign out at least
				try {
					await supabase.auth.signOut();
				} catch (e) {
					console.error('Sign out failed:', e);
				}
				throw redirect(303, `/?error=${encodeURIComponent(`Service configuration error. (Error: ${errorId})`)}`);
			}

			// Sign out first
			try {
				await supabase.auth.signOut();
			} catch (e) {
				console.error('[cancelRegistration] Sign out failed:', e);
			}

			// Then delete
			await deleteUserCompletely(user.id);

			console.log('[cancelRegistration] Success, redirecting to home');
			throw redirect(303, '/?cancelled=1');
		} catch (e) {
			// Rethrow redirects
			if (e && typeof e === 'object' && 'status' in e) {
				const s = (e as any).status;
				if (s >= 300 && s < 400) throw e;
			}

            // Check if user is already deleted (e.g. invalid grant or user not found)
            const errString = String(e);
            if (errString.includes('User not found') || errString.includes('Auth session missing')) {
                console.warn('[cancelRegistration] User likely already deleted:', e);
                throw redirect(303, '/?cancelled=1');
            }

			const errorId = crypto.randomUUID();
			console.error('[cancelRegistration] Unexpected error:', errorId, e);
			throw redirect(303, `/?error=${encodeURIComponent(`Cancellation failed. (Error: ${errorId})`)}`);
		}
	}
};
