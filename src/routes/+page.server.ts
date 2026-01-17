import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const { data: events } = await supabase.from('events').select('*').eq('status', 'published').order('start_time', { ascending: true }).limit(6);

	const error = url.searchParams.get('error') || null;
	return { events: events || [], error };
};
