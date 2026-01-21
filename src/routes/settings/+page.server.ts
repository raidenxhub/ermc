import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { sendAccountDeletedEmail } from '$lib/server/email';

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

		const serviceRole = privateEnv.SUPABASE_SERVICE_ROLE;
		if (!serviceRole) {
			console.error('Missing SUPABASE_SERVICE_ROLE');
			return fail(500, { message: 'Server configuration error' });
		}

		const supabaseUrl = privateEnv.PUBLIC_SUPABASE_URL || publicEnv.PUBLIC_SUPABASE_URL;
		if (!supabaseUrl) {
			console.error('Missing PUBLIC_SUPABASE_URL');
			return fail(500, { message: 'Server configuration error' });
		}
		const admin = createClient(supabaseUrl, serviceRole);

		const { data: profileForEmail } = await admin.from('profiles').select('email,name,discord_username').eq('id', user.id).maybeSingle();
		const emailTo = typeof profileForEmail?.email === 'string' ? profileForEmail.email : '';
		if (emailTo) {
			const nameForEmail = (profileForEmail?.name as string) || (profileForEmail?.discord_username as string) || null;
			void sendAccountDeletedEmail({ to: emailTo, name: nameForEmail });
		}

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

	updateProfile: async ({ locals: { user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		return fail(403, { message: 'CID and VATSIM details are locked. <a href="/contact">Contact support</a> to change them.' });
	}
};
