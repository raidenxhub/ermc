import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createAdminClient } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async ({ locals: { user } }) => {
	if (user) throw redirect(303, '/dashboard');
	return {};
};

export const actions: Actions = {
	login: async ({ request, locals: { supabase } }) => {
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const form = await request.formData();
		const cid = String(form.get('cid') || '').trim();
		const full_name = String(form.get('full_name') || '').trim();

		if (!cid || !full_name) return fail(400, { message: 'Enter CID and Full Name.' });

		// Only allow the predefined test account
		if (cid !== '000000' || full_name.toLowerCase() !== 'ermc vatsim test #1') {
			return fail(403, { message: 'Invalid test credentials.' });
		}

		const admin = createAdminClient();

		// Resolve the test auth user via profile email
		const { data: profile } = await admin
			.from('profiles')
			.select('id,email,ermc_access_granted,cid,rating,name')
			.eq('cid', cid)
			.eq('name', full_name)
			.maybeSingle();

		if (!profile?.email || !profile?.id) return fail(404, { message: 'Test account not found. Run test account setup.' });
		if (!profile.ermc_access_granted || !profile.cid || !profile.rating || !profile.name) {
			return fail(400, { message: 'Test account is incomplete. Contact staff.' });
		}

		// Rotate password and sign in on server (sets session cookies)
		const newPassword = `DEV_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
		await admin.auth.admin.updateUserById(profile.id, { password: newPassword });

		const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password: newPassword });
		if (error) {
			console.error('Dev login sign-in failed:', error);
			return fail(500, { message: 'Login failed.' });
		}

		throw redirect(303, '/dashboard');
	}
};
