import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

    // Fetch events that end in the future OR ended less than 30 minutes ago
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true })
        .gte('end_time', thirtyMinutesAgo);

	return {
        user,
        events: events || []
    };
};
