import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

    const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true })
        .gte('end_time', new Date().toISOString());

	return {
        user,
        events: events || []
    };
};
