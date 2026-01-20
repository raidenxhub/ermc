import type { PageServerLoad } from './$types';
import { syncEvents } from '$lib/server/vatsim';
import { createAdminClient } from '$lib/server/supabaseAdmin';
import { cleanupExpiredCancelledEvents } from '$lib/server/eventsMaintenance';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	// If user is already logged in, redirect to dashboard
	// if (user) {
	// 	throw redirect(303, '/dashboard');
	// }

	if (!supabase) {
		const error = url.searchParams.get('error') || null;
		return { events: [], error };
	}

	try {
		const admin = createAdminClient();
		await cleanupExpiredCancelledEvents(admin);
		await syncEvents(admin);
	} catch (e) {
		console.error('Home page syncEvents failed:', e);
	}

	let events = [];
	try {
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
		const { data, error: dbError } = await supabase
			.from('events')
			.select('*')
			.eq('status', 'published')
			.order('start_time', { ascending: true })
			.gte('end_time', fiveMinutesAgo)
			.limit(6);
		if (!dbError && data) {
			events = data;
		}
	} catch (e) {
		console.error('Home page event fetch failed:', e);
	}

	const error = url.searchParams.get('error') || null;
	return { events, error };
};
