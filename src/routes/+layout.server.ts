import type { LayoutServerLoad } from './$types';
import { syncEvents } from '$lib/server/vatsim';

export const load: LayoutServerLoad = async ({ locals: { supabase, user } }) => {
    let profile = null;
    
    // Wrap profile fetch in try/catch to prevent 500s if DB fails
    if (user) {
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (!error && data) {
                profile = data;
            } else if (error) {
                console.error('Layout profile fetch error:', error);
            }
        } catch (err) {
            console.error('Layout profile fetch crash:', err);
        }
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
        // NOTE: On serverless (Vercel), background tasks might be killed when response is sent.
        // But waiting for it causes 500s if it times out. 
        // For now, we accept it might not finish every time on serverless, but at least it won't crash.
        // Ideally we use a cron job.
        syncEvents(supabase).catch(err => console.error('Background sync failed:', err));
    } catch (e) {
        console.error('Failed to initiate VATSIM sync:', e);
    }

    // Fetch all events (manual + vatsim) from DB
    let events = [];
    try {
        // Fetch events that end in the future OR ended less than 30 minutes ago
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('start_time', { ascending: true })
            .gte('end_time', thirtyMinutesAgo);
        
        if (!error && data) {
            events = data;
        }
    } catch (err) {
        console.error('DB Fetch Error:', err);
        // Don't crash, just return empty events
    }
    
    // Merge auth user with profile data so navbar works correctly
	return { 
        user: profile ? { ...user, ...profile } : user, 
        events: events || []
    };
};
