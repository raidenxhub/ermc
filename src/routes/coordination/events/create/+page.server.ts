import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env as privateEnv } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

	if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
		throw redirect(303, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
			return fail(403, { message: 'Forbidden' });
		}

		const form = await request.formData();
		const name = (form.get('name') as string) || '';
		const type = (form.get('type') as string) || '';
		const start_time = (form.get('start_time') as string) || '';
		const end_time = (form.get('end_time') as string) || '';
		const airports = (form.get('airports') as string) || '';
		const link = (form.get('link') as string) || '';
		const description = (form.get('description') as string) || '';
		const banner = (form.get('banner') as string) || '';

		if (!name || !start_time || !end_time) {
			return fail(400, { message: 'Please provide required fields.' });
		}

		const serviceRole = privateEnv.SUPABASE_SECRET_KEY;
		if (!serviceRole) {
			console.error('Missing SUPABASE_SECRET_KEY');
			return fail(500, { message: 'Server configuration error.' });
		}

		const admin = createClient(PUBLIC_SUPABASE_URL, serviceRole);
		const { error } = await admin.from('events').insert({
			name,
			type,
			start_time,
			end_time,
			airports,
			link,
			description,
			banner,
			status: 'published'
		});

		if (error) {
			console.error(error);
			return fail(500, { message: 'Failed to create event.' });
		}

		throw redirect(303, '/dashboard');
	}
};
