import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { fetchOnlineControllers, fetchMetars } from '$lib/server/vatsimData';
import { syncEvents } from '$lib/server/vatsim';
import { createAdminClient } from '$lib/server/supabaseAdmin';
import { cleanupExpiredCancelledEvents } from '$lib/server/eventsMaintenance';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	try {
		const admin = createAdminClient();
		await cleanupExpiredCancelledEvents(admin);
		await syncEvents(admin);
	} catch (e) {
		console.error('Dashboard syncEvents failed:', e);
	}

	// Fetch user profile
	const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
	if (profileError || !profile) {
		throw redirect(303, '/onboarding');
	}

	// Fetch roster entries for user
	const { data: rosterEntries } = await supabase
		.from('roster_entries')
		.select(
			`
            *,
            event:events(*)
        `
		)
		.eq('user_id', user.id)
		.gte('start_time', new Date().toISOString())
		.order('start_time', { ascending: true });

	const thankYouWindowStart = new Date(Date.now() - 30 * 60 * 1000).toISOString();
	const { data: recentlyEndedBooking } = await supabase
		.from('roster_entries')
		.select('*, event:events(id,name,end_time,status)')
		.eq('user_id', user.id)
		.lt('end_time', new Date().toISOString())
		.gte('end_time', thankYouWindowStart)
		.order('end_time', { ascending: false })
		.limit(1)
		.maybeSingle();

	// Combine user data
	const userData = {
		...user,
		...profile,
		rosterEntries: rosterEntries || []
	};

	// Check if profile is complete
	const profileComplete = !!(profile?.cid && profile?.rating);

	// Fetch upcoming events for the dashboard
	const { data: upcomingEvents } = await supabase
		.from('events')
		.select('*')
		.gte('start_time', new Date().toISOString())
		.in('status', ['published', 'cancelled'])
		.order('start_time', { ascending: true })
		.limit(5);

	// Fetch VATSIM Public Data (Parallel)
	const [onlineControllers, metars] = await Promise.all([fetchOnlineControllers(), fetchMetars()]);

	return {
		user: userData,
		upcomingEvents: upcomingEvents || [],
		profileComplete,
		onlineControllers,
		metars,
		recentlyEndedBooking: recentlyEndedBooking || null
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		void request;
		return fail(403, { message: 'CID and VATSIM details are locked. Contact support to change them.' });
	}
};
