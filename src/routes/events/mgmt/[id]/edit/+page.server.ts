import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createAdminClient } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async ({ locals: { supabase, user }, params }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
	const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';
	if (!isStaff) throw redirect(303, '/dashboard');

	const { data: event } = await supabase.from('events').select('*').eq('id', params.id).maybeSingle();
	if (!event) throw redirect(303, '/events/mgmt');
	if (event.vatsim_id)
		throw redirect(303, '/events/mgmt?error=VATSIM%20events%20cannot%20be%20edited.%20Only%20manually%20created%20events%20are%20editable.');

	return { event };
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, user }, params }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';
		if (!isStaff) return fail(403, { message: 'Forbidden' });

		const form = await request.formData();
		const name = (form.get('name') as string) || '';
		const type = (form.get('type') as string) || '';
		const start_time = (form.get('start_time') as string) || '';
		const end_time = (form.get('end_time') as string) || '';
		const airports = (form.get('airports') as string) || '';
		const link = (form.get('link') as string) || '';
		const description = (form.get('description') as string) || '';
		const banner = (form.get('banner') as string) || '';

		if (!name || !start_time || !end_time) return fail(400, { message: 'Please provide required fields.' });

		const toUtcIso = (value: string) => new Date(value.includes('Z') || value.includes('+') ? value : `${value}Z`).toISOString();
		const stripEmojiCodes = (value: string) =>
			value
				.replace(/:[a-z0-9_+-]+:/gi, '')
				.replace(/(\*\*|__|\*|_|`)/g, '')
				.replace(/\s+/g, ' ')
				.trim();
		const short_description = stripEmojiCodes(description).slice(0, 160) || null;

		const admin = createAdminClient();

		const { data: existing } = await admin.from('events').select('id, start_time, end_time, vatsim_id').eq('id', params.id).maybeSingle();
		if (!existing) return fail(404, { message: 'Event not found.' });
		if ((existing as any).vatsim_id) return fail(400, { message: 'VATSIM events cannot be edited.' });

		const oldStart = new Date(existing.start_time);
		const newStart = new Date(toUtcIso(start_time));
		const newEnd = new Date(toUtcIso(end_time));
		if (Number.isNaN(oldStart.getTime()) || Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime())) {
			return fail(400, { message: 'Invalid start or end time.' });
		}
		if (newEnd.getTime() <= newStart.getTime()) return fail(400, { message: 'End time must be after start time.' });

		const deltaMs = newStart.getTime() - oldStart.getTime();

		const res = await admin
			.from('events')
			.update({
				name,
				type,
				start_time: newStart.toISOString(),
				end_time: newEnd.toISOString(),
				airports,
				link,
				short_description,
				description: stripEmojiCodes(description),
				banner
			})
			.eq('id', params.id);

		if (res.error) return fail(500, { message: 'Failed to update event.' });

		const { data: rosterEntries } = await admin.from('roster_entries').select('id, start_time, end_time').eq('event_id', params.id);
		const updates: Array<{ id: string; start_time: string; end_time: string }> = [];
		const deletes: string[] = [];
		for (const entry of rosterEntries || []) {
			const rs = new Date(entry.start_time);
			const re = new Date(entry.end_time);
			if (Number.isNaN(rs.getTime()) || Number.isNaN(re.getTime())) continue;
			let nextStart = new Date(rs.getTime() + deltaMs);
			let nextEnd = new Date(re.getTime() + deltaMs);
			if (nextStart.getTime() < newStart.getTime()) nextStart = newStart;
			if (nextEnd.getTime() > newEnd.getTime()) nextEnd = newEnd;
			if (nextEnd.getTime() <= nextStart.getTime()) {
				deletes.push(entry.id);
				continue;
			}
			updates.push({ id: entry.id, start_time: nextStart.toISOString(), end_time: nextEnd.toISOString() });
		}
		if (updates.length) {
			await admin.from('roster_entries').upsert(updates, { onConflict: 'id' });
		}
		if (deletes.length) {
			await admin.from('roster_entries').delete().in('id', deletes);
		}

		throw redirect(303, `/events/mgmt/${params.id}`);
	}
};
