import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { randomUUID } from 'crypto';
import { generateRosterSlots } from '$lib/server/vatsim';
import { createAdminClient } from '$lib/server/supabaseAdmin';

const makeIdBigint = () => {
	const millis = BigInt(Date.now());
	const rand = BigInt(Math.floor(Math.random() * 1000));
	return millis * 1000n + rand;
};

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
	if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
		throw redirect(303, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

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

		const toUtcIso = (value: string) => new Date(value.includes('Z') || value.includes('+') ? value : `${value}Z`).toISOString();
		const stripEmojiCodes = (value: string) =>
			value
				.replace(/:[a-z0-9_+-]+:/gi, '')
				.replace(/(\*\*|__|\*|_|`)/g, '')
				.replace(/\s+/g, ' ')
				.trim();
		const short_description = stripEmojiCodes(description).slice(0, 160) || null;

		let admin;
		try {
			admin = createAdminClient();
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Server configuration error.' });
		}
		const { data: eventRecord, error } = await admin
			.from('events')
			.insert({
				id: randomUUID(),
				id_bigint: String(makeIdBigint()),
				name,
				type,
				start_time: toUtcIso(start_time),
				end_time: toUtcIso(end_time),
				airports,
				link,
				short_description,
				description: stripEmojiCodes(description) || null,
				banner,
				status: 'published'
			})
			.select()
			.single();

		if (error || !eventRecord) {
			console.error(error);
			return fail(500, { message: error?.message ? `Failed to create event: ${error.message}` : 'Failed to create event.' });
		}

		// Auto-generate slots
		await generateRosterSlots(admin, eventRecord);

		throw redirect(303, '/events/mgmt');
	}
};
