import type { LayoutServerLoad } from './$types';
import { fetchVatsimEvents } from '$lib/server/vatsim';

export const load: LayoutServerLoad = async ({ locals: { supabase, user } }) => {
    let profile = null;
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        profile = data;
    }

	const events = await fetchVatsimEvents();
    
    // Merge auth user with profile data so navbar works correctly
	return { 
        user: profile ? { ...user, ...profile } : user, 
        events 
    };
};
