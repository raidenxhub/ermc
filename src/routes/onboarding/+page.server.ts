import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env as privateEnv } from '$env/dynamic/private';
import { fetchVatsimMember, ratingToShortLong } from '$lib/server/vatsimMember';
import { createAdminClient } from '$lib/server/supabaseAdmin';

const deleteUserCompletely = async (userId: string) => {
	const admin = createAdminClient();
	const { error: profileDeleteError } = await admin.from('profiles').delete().eq('id', userId);
	if (profileDeleteError) console.error('Profile delete failed during rejected-subdivision deletion:', profileDeleteError);
	try {
		await admin.auth.admin.deleteUser(userId);
	} catch (e) {
		console.error('Auth delete failed during rejected-subdivision deletion:', e);
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
			const { error } = await supabase
				.from('profiles')
				.update({
					name: fullName,
					email,
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
					updated_at: nowIso
				})
				.eq('id', user.id);

			if (error) {
				console.error(error);
				return fail(500, { message: 'Failed to save profile. Please try again.' });
			}

			try {
				await supabase
					.from('profiles')
					.update({ ermc_access_granted: true, ermc_access_verified_at: nowIso, updated_at: nowIso })
					.eq('id', user.id);
			} catch (e) {
				console.error('Failed to set access key flags:', e);
			}

			throw redirect(303, '/dashboard');
		} catch (e) {
			console.error('Onboarding registration failed:', e);
			return fail(500, { message: 'Registration failed. Please try again.' });
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
	cancelRegistration: async ({ request, locals: { supabase, user } }) => {
		if (!user) throw redirect(303, '/');
		if (!supabase) throw redirect(303, '/');

		try {
			const formData = await request.formData();
			const cancel_reason = (formData.get('cancel_reason') as string) || '';
			const cancel_help = (formData.get('cancel_help') as string) || '';
			const cancel_cid_experience = (formData.get('cancel_cid_experience') as string) || '';
			const cancel_return_likelihood = (formData.get('cancel_return_likelihood') as string) || '';

			const webhookUrl = privateEnv.CONTACT_DISCORD_WEBHOOK_URL;
			if (webhookUrl && (cancel_reason || cancel_help || cancel_cid_experience || cancel_return_likelihood)) {
				const email = user.email || user.user_metadata?.email || null;
				await fetch(webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						embeds: [
							{
								title: 'Onboarding cancelled',
								color: 15158332,
								fields: [
									{ name: 'User ID', value: user.id, inline: false },
									{ name: 'Email', value: typeof email === 'string' ? email : 'unknown', inline: false },
									{ name: 'Why cancelling', value: cancel_reason || 'n/a', inline: false },
									{ name: 'What would help', value: cancel_help || 'n/a', inline: false },
									{ name: 'CID verification', value: cancel_cid_experience || 'n/a', inline: false },
									{ name: 'Try again later', value: cancel_return_likelihood || 'n/a', inline: false }
								],
								footer: { text: 'ERMC Onboarding' },
								timestamp: new Date().toISOString()
							}
						]
					})
				});
			}
		} catch (e) {
			console.error('Cancel feedback webhook failed:', e);
		}

		let deletionOk = true;
		try {
			await supabase.auth.signOut();
		} catch (e) {
			console.error('Sign out failed during cancel-registration deletion:', e);
		}

		try {
			await deleteUserCompletely(user.id);
		} catch (e) {
			deletionOk = false;
			console.error('Delete failed during cancel-registration deletion:', e);
		}

		if (!deletionOk) {
			throw redirect(303, '/?error=Account%20cancellation%20failed.%20Please%20contact%20support.');
		}
		throw redirect(303, '/');
	}
};
