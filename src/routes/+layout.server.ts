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
        // Run sync in background or with a timeout to prevent blocking the entire site load
        // Actually, for layout load, it's better to fire and forget if it takes too long,
        // but we need the data. Let's rely on the fact that Vercel has timeouts.
        // A better approach for production is a cron job, but for now let's wrap in a timeout race.
        
        // However, the 500 error is likely due to the fetch failing or Supabase issues.
        // Let's make sure we catch errors inside syncEvents too (which we do).
        
        // Critical: Don't let sync fail the whole page load.
        syncEvents(supabase).catch(err => console.error('Background sync failed:', err));
    } catch (e) {
        console.error('Failed to initiate VATSIM sync:', e);
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
