import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { user, supabase }, url }) => {
	// If user is already logged in, redirect to dashboard
	// if (user) {
	// 	throw redirect(303, '/dashboard');
	// }

    let events = [];
    try {
        const { data, error: dbError } = await supabase.from('events').select('*').eq('status', 'published').order('start_time', { ascending: true }).limit(6);
        if (!dbError && data) {
            events = data;
        }
    } catch (e) {
        console.error('Home page event fetch failed:', e);
    }

	const error = url.searchParams.get('error') || null;
	return { events, error };
};
