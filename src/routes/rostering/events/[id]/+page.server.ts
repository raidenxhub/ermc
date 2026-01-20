import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

	const { data: event } = await supabase.from('events').select('*').eq('id', params.id).single();
	if (!event) throw redirect(303, '/');

	const { data: roster } = await supabase
		.from('roster_entries')
		.select(`*, user:profiles(*)`)
		.eq('event_id', params.id)
		.order('start_time', { ascending: true })
		.order('position', { ascending: true });

	const { data: claims } = await supabase
		.from('roster_claims')
		.select('*')
		.in(
			'roster_entry_id',
			(roster || []).map((r) => r.id)
		);
    
    // Check if user is staff/coordinator
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';

	return { event, roster: roster || [], claims: claims || [], me: user, isStaff };
};

export const actions: Actions = {
    add_slot: async ({ request, locals: { supabase, user } }) => {
        if (!user) return fail(401, { message: 'Unauthorized' });
        
        // Permission check
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';
        
        if (!isStaff) return fail(403, { message: 'Forbidden' });

        const formData = await request.formData();
        const event_id = formData.get('event_id') as string;
        const position = formData.get('position') as string;
        const airport = formData.get('airport') as string;
        const start_time = formData.get('start_time') as string;
        const end_time = formData.get('end_time') as string;

        if (!event_id || !position || !airport || !start_time || !end_time) {
            return fail(400, { message: 'Missing required fields' });
        }

        // Validate airport against event
        const { data: event } = await supabase.from('events').select('airports').eq('id', event_id).single();
        if (!event) return fail(404, { message: 'Event not found' });

        const allowed = event.airports ? event.airports.split(',').map((a: string) => a.trim().toUpperCase()) : [];
        if (!allowed.includes(airport) || !['OBBI', 'OKKK'].includes(airport)) {
             return fail(400, { message: 'Airport not allowed for this event or not managed by ERMC.' });
        }

        const fullPosition = `${airport}_${position}`;

        const { error } = await supabase.from('roster_entries').insert({
            event_id,
            airport,
            position: fullPosition,
            start_time: new Date(start_time).toISOString(),
            end_time: new Date(end_time).toISOString(),
            status: 'open'
        });

        if (error) {
            console.error('Error adding slot:', error);
            return fail(500, { message: 'Failed to add slot' });
        }

        return { success: true };
    },

	claim_primary: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		const form = await request.formData();
		const roster_entry_id = form.get('roster_entry_id') as string;
		if (!roster_entry_id) return fail(400, { message: 'Missing roster_entry_id' });

		// ensure the slot is still open
		const { data: entry } = await supabase.from('roster_entries').select('*, event:events(*)').eq('id', roster_entry_id).single();
		if (!entry) return fail(404, { message: 'Slot not found' });
		if (entry.user_id) return fail(400, { message: 'Slot already claimed' });

        // Booking Window Check: Closed 15 mins before event start
        const now = Date.now();
        const startTime = new Date(entry.event.start_time).getTime();
        if (now > startTime - 15 * 60 * 1000) {
            return fail(400, { message: 'Booking is closed (closes 15m before event).' });
        }

		// create primary claim (trigger will set roster_entries.user_id)
		const { error } = await supabase.from('roster_claims').insert({ roster_entry_id, user_id: user.id, type: 'primary' });
		if (error) {
			console.error(error);
			return fail(500, { message: 'Failed to claim slot' });
		}
		return { success: true };
	},

	claim_standby: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		const form = await request.formData();
		const roster_entry_id = form.get('roster_entry_id') as string;
		if (!roster_entry_id) return fail(400, { message: 'Missing roster_entry_id' });

		const { error } = await supabase.from('roster_claims').insert({ roster_entry_id, user_id: user.id, type: 'standby' });
		if (error) {
			console.error(error);
			return fail(500, { message: 'Failed to claim standby' });
		}
		return { success: true };
	},

	cancel_claim: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		const form = await request.formData();
		const roster_entry_id = form.get('roster_entry_id') as string;
		if (!roster_entry_id) return fail(400, { message: 'Missing roster_entry_id' });

		const { data: entry } = await supabase.from('roster_entries').select('*').eq('id', roster_entry_id).single();
		if (!entry) return fail(404, { message: 'Slot not found' });

		// 60-minute window check
		const now = Date.now();
		const start = new Date(entry.start_time).getTime();
		if (start - now <= 60 * 60 * 1000) {
			return fail(400, { message: 'Cancellations are not allowed within 60 minutes of start time.' });
		}

		// Find user's claim
		const { data: myClaims } = await supabase.from('roster_claims').select('*').eq('roster_entry_id', roster_entry_id).eq('user_id', user.id);

		if (!myClaims || myClaims.length === 0) return fail(404, { message: 'No claim to cancel' });

		// Delete all user's claims on this slot (primary or standby)
		const { error } = await supabase.from('roster_claims').delete().eq('roster_entry_id', roster_entry_id).eq('user_id', user.id);

		if (error) {
			console.error(error);
			return fail(500, { message: 'Failed to cancel claim' });
		}
		return { success: true };
	},

	knock: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		const form = await request.formData();
		const roster_entry_id = form.get('roster_entry_id') as string;
		const to_user_id = form.get('to_user_id') as string;
		const event_id = form.get('event_id') as string;
		const message = (form.get('message') as string) || null;
		if (!to_user_id || !event_id) return fail(400, { message: 'Missing target or event' });
		const { error } = await supabase.from('knocks').insert({ from_user_id: user.id, to_user_id, event_id, roster_entry_id, message });
		if (error) {
			console.error(error);
			return fail(500, { message: 'Failed to send knock' });
		}
		return { success: true };
	}
};
