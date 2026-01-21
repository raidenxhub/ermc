import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user }, url }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	const next = url.searchParams.get('next') || '/dashboard';

	const { data: profile } = await supabase.from('profiles').select('name, cid, rating, subdivision, ermc_access_granted').eq('id', user.id).single();

	// Strict check: if any required field is missing, force onboarding
	// Also check ermc_access_granted to match hooks logic
	const needsOnboarding = 
		!profile ||
		!profile.name || 
		!profile.cid || 
		!profile.rating || 
		!profile.subdivision || 
		!profile.ermc_access_granted;

	const destination = needsOnboarding ? '/onboarding' : next;

	return { destination };
};
