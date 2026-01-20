import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { generateRosterSlots } from '$lib/server/vatsim';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
	if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
		throw redirect(303, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
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

		const supabaseUrl = privateEnv.PUBLIC_SUPABASE_URL || publicEnv.PUBLIC_SUPABASE_URL;
		if (!supabaseUrl) {
			console.error('Missing PUBLIC_SUPABASE_URL');
			return fail(500, { message: 'Server configuration error.' });
		}

		const toUtcIso = (value: string) => new Date(value.includes('Z') || value.includes('+') ? value : `${value}Z`).toISOString();

		const admin = createClient(supabaseUrl, serviceRole, {
			auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
		});
		const { data: eventRecord, error } = await admin.from('events').insert({
			name,
			type,
			start_time: toUtcIso(start_time),
			end_time: toUtcIso(end_time),
			airports,
			link,
			description,
			banner,
			status: 'published'
		}).select().single();

		if (error || !eventRecord) {
			console.error(error);
			return fail(500, { message: error?.message ? `Failed to create event: ${error.message}` : 'Failed to create event.' });
		}

        // Auto-generate slots
        await generateRosterSlots(admin, eventRecord);

		throw redirect(303, '/events/mgmt');
	}
};
