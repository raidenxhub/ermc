import type { LayoutServerLoad } from './$types';
import { syncEvents } from '$lib/server/vatsim';

export const load: LayoutServerLoad = async ({ locals: { supabase, user } }) => {
    let profile = null;
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        profile = data;
    }

    // Sync with VATSIM (ensures DB is up to date)
    // We catch errors so the site doesn't crash if VATSIM API is down
    try {
        await syncEvents(supabase);
    } catch (e) {
        console.error('Failed to sync VATSIM events:', e);
    }

    // Fetch all events (manual + vatsim) from DB
    const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true })
        .gte('end_time', new Date().toISOString()); // Only future/ongoing events? User didn't specify, but usually best. 
        // Actually user wants "events", maybe all? Let's stick to future/ongoing for the global list to avoid clutter.
    
    // Merge auth user with profile data so navbar works correctly
	return { 
        user: profile ? { ...user, ...profile } : user, 
        events: events || []
    };
};
