import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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
		console.error('Rostering syncEvents failed:', e);
	}

	const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

	const { data: events } = await supabase
		.from('events')
		.select('*')
		.in('status', ['published', 'cancelled'])
		.order('start_time', { ascending: true })
		.gte('end_time', fiveMinutesAgo);

	const eventIds = (events || []).map((e: any) => e.id).filter(Boolean);
	let bookedEventIds: string[] = [];
	if (eventIds.length > 0) {
		const { data: myPrimary } = await supabase.from('roster_entries').select('event_id').eq('user_id', user.id).in('event_id', eventIds);
		const primaryIds = (myPrimary || []).map((r: any) => r.event_id).filter(Boolean);

		const { data: myStandby } = await supabase
			.from('roster_claims')
			.select('roster_entry:roster_entries(event_id)')
			.eq('user_id', user.id)
			.eq('type', 'standby');
		const standbyIds = (myStandby || [])
			.map((r: any) => r.roster_entry?.event_id)
			.filter((v: any) => typeof v === 'string' && eventIds.includes(v));

		bookedEventIds = Array.from(new Set([...primaryIds, ...standbyIds]));
	}

	return {
		user,
		events: events || [],
		bookedEventIds
	};
};
