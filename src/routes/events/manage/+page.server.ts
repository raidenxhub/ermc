import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

	// Check permissions
	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
	
	if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
		throw redirect(303, '/dashboard');
	}

	const { data: events } = await supabase
		.from('events')
		.select('*')
		.order('start_time', { ascending: false });

	return {
		events: events || []
	};
};

export const actions: Actions = {
	deleteEvent: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const eventId = formData.get('id') as string;

		if (!eventId) return fail(400, { message: 'Missing event ID' });

		const { error } = await supabase.from('events').delete().eq('id', eventId);

		if (error) {
			console.error('Error deleting event:', error);
			return fail(500, { message: 'Failed to delete event' });
		}

		return { success: true };
	}
};
