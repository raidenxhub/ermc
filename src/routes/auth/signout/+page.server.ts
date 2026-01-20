import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');
	await supabase.auth.signOut();
	throw redirect(303, '/');
};
