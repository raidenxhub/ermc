import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

	return {
        profile
    };
};

export const actions: Actions = {
    deleteAccount: async ({ locals: { supabase, user } }) => {
        if (!user) return fail(401, { message: 'Unauthorized' });

        // Delete profile (cascades should handle bookings/messages if configured, otherwise we might need manual cleanup)
        // Ideally we should soft-delete or scrub PII.
        // User asked to "DELETE account".
        
        const { error } = await supabase.from('profiles').delete().eq('id', user.id);
        
        if (error) {
            console.error('Delete account error:', error);
            return fail(500, { message: 'Failed to delete account' });
        }

        // Sign out
        await supabase.auth.signOut();
        throw redirect(303, '/');
    },
    
    updateProfile: async ({ request, locals: { supabase, user } }) => {
        if (!user) return fail(401, { message: 'Unauthorized' });
        
        const formData = await request.formData();
        const cid = formData.get('cid') as string;
        
        if (!cid) return fail(400, { message: 'CID is required' });

        const { error } = await supabase.from('profiles').update({ cid }).eq('id', user.id);
        
        if (error) return fail(500, { message: 'Failed to update profile' });
        
        return { success: true };
    }
};
