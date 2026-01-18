import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

	// Fetch user's completed sessions (mock logic or real if logbook exists)
	// For now we calculate based on past roster entries
	const { data: history } = await supabase
		.from('roster_entries')
		.select('*, event:events(name)')
		.eq('user_id', user.id)
		.lt('end_time', new Date().toISOString())
		.order('start_time', { ascending: false });

	const totalEvents = history?.length || 0;
	// Calculate rough hours
	const totalHours = history?.reduce((acc, entry) => {
		const start = new Date(entry.start_time).getTime();
		const end = new Date(entry.end_time).getTime();
		return acc + (end - start) / (1000 * 60 * 60);
	}, 0) || 0;

	return {
		history: history || [],
		stats: {
			totalEvents,
			totalHours: totalHours.toFixed(1)
		}
	};
};
