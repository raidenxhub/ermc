import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { syncEvents } from '$lib/server/vatsim';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

	if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
		throw redirect(303, '/dashboard');
	}

	const { data: events } = await supabase.from('events').select('*').order('start_time', { ascending: true });

	return { events: events || [] };
};

export const actions: Actions = {
	sync: async ({ locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
			return fail(403, { message: 'Forbidden' });
		}
		try {
			await syncEvents(supabase);
			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Failed to sync events' });
		}
	}
};
