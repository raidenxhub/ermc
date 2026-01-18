import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { user, supabase }, url }) => {
	// If user is already logged in, redirect to dashboard
	if (user) {
		throw redirect(303, '/dashboard');
	}

	const { data: events } = await supabase.from('events').select('*').eq('status', 'published').order('start_time', { ascending: true }).limit(6);

	const error = url.searchParams.get('error') || null;
	return { events: events || [], error };
};
