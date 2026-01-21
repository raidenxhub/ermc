import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env as privateEnv } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals: { supabase, user }, url }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	const returnTo = url.searchParams.get('returnTo') || '/dashboard';

	const { data: profile } = await supabase.from('profiles').select('ermc_access_granted').eq('id', user.id).single();
	if (profile?.ermc_access_granted) throw redirect(303, returnTo);

	return { returnTo };
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, user }, url }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const expectedKey = privateEnv.ACCESS_KEY;
		if (!expectedKey) return fail(500, { message: 'Server configuration error.' });

		const formData = await request.formData();
		const accessKey = (formData.get('access_key') as string) || '';
		const returnTo = (formData.get('returnTo') as string) || url.searchParams.get('returnTo') || '/dashboard';

		if (!accessKey || accessKey !== expectedKey) return fail(400, { message: 'Invalid access key.' });

		const { error } = await supabase
			.from('profiles')
			.update({ ermc_access_granted: true, ermc_access_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
			.eq('id', user.id);

		if (error) {
			console.error(error);
			return fail(500, { message: 'Failed to verify access key.' });
		}

		throw redirect(303, returnTo);
	}
};
