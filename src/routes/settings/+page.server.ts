import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error || !profile) throw redirect(303, '/onboarding');

	return {
        profile
    };
};

export const actions: Actions = {
    deleteAccount: async ({ locals: { supabase, user } }) => {
        if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error' });

        const serviceRole = privateEnv.SUPABASE_SECRET_KEY;
        if (!serviceRole) {
            console.error('Missing SUPABASE_SECRET_KEY');
            return fail(500, { message: 'Server configuration error' });
        }

        const admin = createClient(publicEnv.PUBLIC_SUPABASE_URL!, serviceRole);

        // Explicitly DELETE the profile first to ensure data loss
        // This handles cases where cascade might fail or be delayed
        const { error: profileError } = await admin.from('profiles').delete().eq('id', user.id);
        
        if (profileError) {
             console.error('Delete profile error:', profileError);
             // We continue to try to delete the auth user anyway
        }

        // Delete the user from Supabase Auth
        const { error } = await admin.auth.admin.deleteUser(user.id);
        
        if (error) {
            console.error('Delete auth user error:', error);
            return fail(500, { message: 'Failed to delete account. Please try again.' });
        }

        // Sign out locally
        await supabase.auth.signOut();
        throw redirect(303, '/');
    },
    
    updateProfile: async ({ request, locals: { supabase, user } }) => {
        if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error' });
        
        const formData = await request.formData();
        const cid = formData.get('cid') as string;
        
        if (!cid) return fail(400, { message: 'CID is required' });

        const { error } = await supabase.from('profiles').update({ cid }).eq('id', user.id);
        
        if (error) return fail(500, { message: 'Failed to update profile' });
        
        return { success: true };
    }
};
