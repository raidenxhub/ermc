import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env as privateEnv } from '$env/dynamic/private';
import { fetchVatsimMember, ratingToShortLong } from '$lib/server/vatsimMember';

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
<<<<<<< HEAD
=======

export const actions: Actions = {
	default: async ({ request, locals: { supabase, user } }) => {
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
		let member: Awaited<ReturnType<typeof fetchVatsimMember>> | null = null;
		try {
			member = await fetchVatsimMember(cid);
		} catch (e) {
			console.error('VATSIM member verify failed:', e);
			return fail(400, { message: 'Unable to verify your CID with VATSIM right now. Please try again shortly.' });
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
	}
};
