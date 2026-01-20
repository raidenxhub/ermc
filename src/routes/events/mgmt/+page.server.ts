import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	// Check permissions
	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
	
	if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
		throw redirect(303, '/dashboard');
	}

    // Fix: Wrap event fetch in try/catch to avoid 500s
    let events = [];
    try {
        const { data } = await supabase
            .from('events')
            .select('*')
            .order('start_time', { ascending: false });
        if (data) events = data;
    } catch (e) {
        console.error('Events mgmt fetch error:', e);
    }

	return {
		events
	};
};

export const actions: Actions = {
	deleteEvent: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const eventId = formData.get('id') as string;

		if (!eventId) return fail(400, { message: 'Missing event ID' });

        // Delete roster entries first to avoid foreign key constraints
        const { error: rosterError } = await supabase.from('roster_entries').delete().eq('event_id', eventId);
        if (rosterError) {
            console.error('Error deleting roster entries:', rosterError);
            // Continue trying to delete event anyway, or return fail?
            // If cascade is on, this might be redundant but harmless.
        }

		const { error } = await supabase.from('events').delete().eq('id', eventId);
        
        // Also delete associated roster entries first if cascade isn't set up (usually helpful)
        // Actually supabase should handle cascade if configured, but let's be safe or check errors
        
		if (error) {
			console.error('Error deleting event:', error);
			return fail(500, { message: 'Failed to delete event' });
		}

		return { success: true };
	}
};
