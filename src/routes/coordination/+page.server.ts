import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { fetchOnlineControllers } from '$lib/server/vatsimData';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

    try {
        const now = new Date().toISOString();

        // 1. Fetch active events (current time is within start/end window)
        const { data: activeEvents, error: eventError } = await supabase
            .from('events')
            .select('*')
            .lte('start_time', now)
            .gte('end_time', now)
            .eq('status', 'published');

        if (eventError) {
            console.error('Error fetching active events:', eventError);
            return { user, access: false, reason: 'System error checking events.' };
        }

        if (!activeEvents || activeEvents.length === 0) {
            return { user, access: false, reason: 'No active events at this time.' };
        }

        const eventIds = activeEvents.map(e => e.id);

        // 2. Check if user has a booking for any of these events
        const { data: myBooking, error: bookingError } = await supabase
            .from('roster_entries')
            .select('*, event:events(*)')
            .in('event_id', eventIds)
            .eq('user_id', user.id)
            .maybeSingle();

        if (bookingError) {
             console.error('Error fetching booking:', bookingError);
             return { user, access: false, reason: 'System error checking bookings.' };
        }

        if (!myBooking) {
            return { user, access: false, reason: 'You do not have a booked slot for any currently active event.' };
        }

        const slurperUrl = new URL('https://slurper.vatsim.net/users/info');
        slurperUrl.searchParams.set('cid', String(user.cid));
        const slurperRes = await fetch(slurperUrl.toString());
        const slurperText = slurperRes.ok ? (await slurperRes.text()).trim() : '';
        const slurperLine = slurperText ? slurperText.split(/\r?\n/)[0].trim() : '';
        const slurperParts = slurperLine ? slurperLine.split(',') : [];
        const slurperType = (slurperParts[2] || '').trim().toLowerCase();
        const slurperCallsign = (slurperParts[1] || '').trim();

        if (!slurperCallsign || slurperType !== 'atc') {
            return { 
                user, 
                access: false, 
                reason: 'You are not detected online on VATSIM. Please log in with your booked callsign.',
                booking: myBooking
            };
        }

        // 5. Verify Callsign Match (Loose check: Booked 'OBBI_TWR' should match 'OBBI_TWR' or 'OBBI_V_TWR')
        const bookedPos = (myBooking.position || '').replace(/_/g, '');
        const onlineCallsign = slurperCallsign.replace(/_/g, '');

        if (!onlineCallsign.includes(bookedPos) && !bookedPos.includes(onlineCallsign)) {
            return { 
                user, 
                access: false, 
                reason: `Callsign mismatch. Booked: ${myBooking.position}, Online: ${slurperCallsign}`,
                booking: myBooking
            };
        }

        // 3. Fetch VATSIM Online Data
        const onlineControllers = await fetchOnlineControllers();
        const safeControllers = Array.isArray(onlineControllers) ? onlineControllers : [];

        // 6. Fetch all other booked controllers for this event who are ALSO online
        const { data: eventRoster } = await supabase
            .from('roster_entries')
            .select('*, user:profiles(*)')
            .eq('event_id', myBooking.event_id)
            .not('user_id', 'is', null);

        const onlineRoster = eventRoster?.map(entry => {
            const controller = safeControllers.find(c => c.cid == entry.user?.cid);
            return {
                ...entry,
                isOnline: !!controller,
                controllerData: controller || null
            };
        }) || [];

        const { data: messages } = await supabase
            .from('messages')
            .select('*, user:profiles(*)')
            .eq('event_id', myBooking.event_id)
            .order('created_at', { ascending: false })
            .limit(50);

        return {
            user,
            access: true,
            event: myBooking.event,
            booking: myBooking,
            onlineRoster,
            messages: messages?.reverse() || []
        };
    } catch (e) {
        console.error('Unexpected error in coordination load:', e);
        return { user, access: false, reason: 'Internal Server Error. Please contact staff.' };
    }
};

export const actions: Actions = {
    sendMessage: async ({ request, locals: { supabase, user } }) => {
        if (!user) return fail(401, { message: 'Unauthorized' });
        const formData = await request.formData();
        const event_id = formData.get('event_id') as string;
        const content = formData.get('content') as string;

        if (!event_id || !content) return fail(400, { message: 'Missing fields' });

        const { error } = await supabase.from('messages').insert({
            event_id,
            user_id: user.id,
            content
        });

        if (error) return fail(500, { message: 'Failed to send message' });
        return { success: true };
    },

    knock: async ({ request, locals: { supabase, user } }) => {
        if (!user) return fail(401, { message: 'Unauthorized' });
        const formData = await request.formData();
        const to_user_id = formData.get('to_user_id') as string;
        const event_id = formData.get('event_id') as string;

        if (!to_user_id || !event_id) return fail(400, { message: 'Missing fields' });

        const { error } = await supabase.from('knocks').insert({
            from_user_id: user.id,
            to_user_id,
            event_id,
            message: 'Knock knock!'
        });

        if (error) return fail(500, { message: 'Failed to knock' });
        return { success: true };
    }
};
