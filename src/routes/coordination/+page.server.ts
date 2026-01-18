import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { fetchOnlineControllers } from '$lib/server/vatsimData';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

    const now = new Date().toISOString();

    // 1. Fetch active events (current time is within start/end window)
    const { data: activeEvents } = await supabase
        .from('events')
        .select('*')
        .lte('start_time', now)
        .gte('end_time', now)
        .eq('status', 'published');

    if (!activeEvents || activeEvents.length === 0) {
        return { user, access: false, reason: 'No active events at this time.' };
    }

    const eventIds = activeEvents.map(e => e.id);

    // 2. Check if user has a booking for any of these events
    const { data: myBooking } = await supabase
        .from('roster_entries')
        .select('*, event:events(*)')
        .in('event_id', eventIds)
        .eq('user_id', user.id)
        .maybeSingle();

    if (!myBooking) {
        return { user, access: false, reason: 'You do not have a booked slot for any currently active event.' };
    }

    // 3. Fetch VATSIM Online Data
    const onlineControllers = await fetchOnlineControllers();
    
    // 4. Verify User is Online
    const myControllerData = onlineControllers.find(c => c.cid == user.cid);

    if (!myControllerData) {
        // Strict mode: User MUST be online
        // For development/testing, we might want to relax this or allow a "debug" override.
        // But user said "must be online".
        // Let's pass the data anyway but flag it in the UI so the user knows they need to log on.
        // Actually, user said "only if they are detected online... can they chat".
        // So we deny full access but maybe show a "Waiting for connection" screen.
        return { 
            user, 
            access: false, 
            reason: 'You are not detected online on VATSIM. Please log in with your booked callsign.',
            booking: myBooking
        };
    }

    // 5. Verify Callsign Match (Loose check: Booked 'OBBI_TWR' should match 'OBBI_TWR' or 'OBBI_V_TWR')
    // We'll normalize by removing underscores and comparing, or just simple inclusion.
    const bookedPos = myBooking.position.replace(/_/g, '');
    const onlineCallsign = myControllerData.callsign.replace(/_/g, '');

    // Allow some flexibility (e.g. booked TWR, online as TWR)
    // If booked position is in the callsign, it's probably fine.
    // e.g. Booked: OBBI_TWR -> OBBITWR. Online: OBBI_TWR -> OBBITWR. Match.
    if (!onlineCallsign.includes(bookedPos) && !bookedPos.includes(onlineCallsign)) {
         return { 
            user, 
            access: false, 
            reason: `Callsign mismatch. Booked: ${myBooking.position}, Online: ${myControllerData.callsign}`,
            booking: myBooking
        };
    }

    // 6. Fetch all other booked controllers for this event who are ALSO online
    // First get all roster entries for this event
    const { data: eventRoster } = await supabase
        .from('roster_entries')
        .select('*, user:profiles(*)')
        .eq('event_id', myBooking.event_id)
        .not('user_id', 'is', null);

    // Filter to those who are online
    const onlineRoster = eventRoster?.map(entry => {
        const controller = onlineControllers.find(c => c.cid == entry.user?.cid);
        return {
            ...entry,
            isOnline: !!controller,
            controllerData: controller || null
        };
    }) || [];

    // Fetch chat history (last 50 messages)
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
