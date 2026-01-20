import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user }, url }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	const next = url.searchParams.get('next') || '/dashboard';

	const { data: profile } = await supabase.from('profiles').select('name, cid, rating, subdivision').eq('id', user.id).single();

	const destination = !profile?.name || !profile?.cid || !profile?.rating || !profile?.subdivision ? '/onboarding' : next;

	return { destination };
};
