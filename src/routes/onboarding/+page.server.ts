import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env as privateEnv } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) {
		throw redirect(303, '/auth/login');
	}
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

	if (profile && profile.name && profile.email && profile.cid && profile.rating && profile.subdivision) {
		throw redirect(303, '/dashboard');
	}

	return {
		user
	};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const formData = await request.formData();
		const fullName = (formData.get('full_name') as string) || '';
		const cid = (formData.get('cid') as string) || '';
		const rating = parseInt((formData.get('rating') as string) || '0');
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
		if (!fullName || !cid || !rating || !subdivision) {
			return fail(400, { message: 'Please fill in all required fields.' });
		}

		const ratings: Record<number, string> = {
			1: 'OBS',
			2: 'S1',
			3: 'S2',
			4: 'S3',
			5: 'C1',
			7: 'C3',
			8: 'I1',
			10: 'I3',
			11: 'SUP',
			12: 'ADM'
		};
		const rating_short = ratings[rating] || 'OBS';

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
