import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createAdminClient } from '$lib/server/supabaseAdmin';
import { sendEventCancelledEmail } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	// Check permissions
	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

	if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
		throw redirect(303, '/dashboard');
	}

	// Fix: Wrap event fetch in try/catch to avoid 500s
	let events = [];
	try {
		const { data } = await supabase.from('events').select('*').order('start_time', { ascending: false });
		if (data) events = data;
	} catch (e) {
		console.error('Events mgmt fetch error:', e);
	}

	return {
		events
	};
};

export const actions: Actions = {
	addSlot: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const eventId = formData.get('event_id') as string;
		const airport = (formData.get('airport') as string) || '';
		const position = (formData.get('position') as string) || '';
		const start_time = (formData.get('start_time') as string) || '';
		const end_time = (formData.get('end_time') as string) || '';

		if (!eventId || !airport || !position || !start_time || !end_time) return fail(400, { message: 'Missing required fields' });

		const startDate = new Date(start_time);
		const endDate = new Date(end_time);
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
			return fail(400, { message: 'Invalid start or end time.' });
		}
		if (endDate.getTime() <= startDate.getTime()) {
			return fail(400, { message: 'End time must be after start time.' });
		}

		const normalizedAirport = airport.trim().toUpperCase();
		const normalizedPosition = position.trim().toUpperCase();

		let admin;
		try {
			admin = createAdminClient();
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Server configuration error.' });
		}

		const { data: eventRow, error: eventError } = await admin.from('events').select('airports, id_bigint').eq('id', eventId).single();
		if (eventError || !eventRow) return fail(404, { message: 'Event not found' });
		let eventIdBigint: string | null = (eventRow as any).id_bigint || null;
		if (!eventIdBigint) {
			const millis = BigInt(Date.now());
			const rand = BigInt(Math.floor(Math.random() * 1000));
			eventIdBigint = String(millis * 1000n + rand);
			await admin.from('events').update({ id_bigint: eventIdBigint }).eq('id', eventId);
		}

		const allowed = eventRow.airports ? eventRow.airports.split(',').map((a: string) => a.trim().toUpperCase()) : [];
		if (!allowed.includes(normalizedAirport) || !['OBBI', 'OKKK'].includes(normalizedAirport)) {
			return fail(400, { message: 'Airport not allowed for this event or not managed by ERMC.' });
		}

		const fullPosition = `${normalizedAirport}_${normalizedPosition}`;

		const res = await admin.from('roster_entries').insert({
			event_id: eventId,
			event_id_bigint: eventIdBigint,
			airport: normalizedAirport,
			position: fullPosition,
			start_time: startDate.toISOString(),
			end_time: endDate.toISOString(),
			status: 'open'
		});

		if (res.error?.code === 'PGRST204') {
			const res2 = await admin.from('roster_entries').insert({
				event_id: eventId,
				airport: normalizedAirport,
				position: fullPosition,
				start_time: startDate.toISOString(),
				end_time: endDate.toISOString(),
				status: 'open'
			});
			if (res2.error) {
				console.error('Error adding slot:', res2.error);
				return fail(500, { message: 'Failed to add slot' });
			}
		} else if (res.error) {
			console.error('Error adding slot:', res.error);
			return fail(500, { message: 'Failed to add slot' });
		}

		return { success: true };
	},
	cancelEvent: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const eventId = formData.get('id') as string;
		if (!eventId) return fail(400, { message: 'Missing event ID' });

		let admin;
		try {
			admin = createAdminClient();
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Server configuration error.' });
		}

		const now = Date.now();
		const cancelled_at = new Date(now).toISOString();
		const delete_at = new Date(now + 10 * 60 * 1000).toISOString();

		const res = await admin.from('events').update({ status: 'cancelled', cancelled_at, delete_at }).eq('id', eventId);
		if (res.error?.code === 'PGRST204') {
			const res2 = await admin.from('events').update({ status: 'cancelled' }).eq('id', eventId);
			if (res2.error) return fail(500, { message: 'Failed to cancel event' });
		} else if (res.error) {
			return fail(500, { message: 'Failed to cancel event' });
		}

		const { data: eventRow } = await admin.from('events').select('name,start_time,end_time').eq('id', eventId).maybeSingle();
		const { data: rosterRows } = await admin
			.from('roster_entries')
			.select('user:profiles(email,name,discord_username)')
			.eq('event_id', eventId)
			.not('user_id', 'is', null);
		const eventName = (eventRow?.name as string) || 'Event';
		const startTime = (eventRow?.start_time as string) || '';
		const endTime = (eventRow?.end_time as string) || '';
		for (const row of rosterRows || []) {
			const u = (row as any).user;
			const emailTo = typeof u?.email === 'string' ? u.email : '';
			if (!emailTo) continue;
			const nameForEmail = (u?.name as string) || (u?.discord_username as string) || null;
			void sendEventCancelledEmail({ to: emailTo, name: nameForEmail, eventName, startTime, endTime });
		}

		return { success: true };
	},
	delayEvent: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const eventId = formData.get('id') as string;
		const newStartRaw = (formData.get('new_start_time') as string) || '';
		const minutesRaw = formData.get('minutes');
		const minutes = minutesRaw !== null ? Number(minutesRaw) : NaN;

		if (!eventId) return fail(400, { message: 'Missing event ID' });

		let admin;
		try {
			admin = createAdminClient();
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Server configuration error.' });
		}

		const { data: eventRow, error: eventError } = await admin
			.from('events')
			.select('id, start_time, end_time, status')
			.eq('id', eventId)
			.single();
		if (eventError || !eventRow) return fail(404, { message: 'Event not found' });
		if (eventRow.status === 'cancelled') return fail(400, { message: 'Cannot delay a cancelled event.' });

		const start = new Date(eventRow.start_time);
		const end = new Date(eventRow.end_time);
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fail(400, { message: 'Event has invalid times' });

		let deltaMs: number | null = null;
		if (newStartRaw) {
			const newStartDate = new Date(newStartRaw);
			if (Number.isNaN(newStartDate.getTime())) return fail(400, { message: 'Invalid new start time.' });
			deltaMs = newStartDate.getTime() - start.getTime();
		} else if (Number.isFinite(minutes) && minutes > 0 && minutes <= 24 * 60) {
			deltaMs = minutes * 60 * 1000;
		}

		if (deltaMs === null || deltaMs === 0) return fail(400, { message: 'Invalid delay amount.' });

		const newStart = new Date(start.getTime() + deltaMs).toISOString();
		const newEnd = new Date(end.getTime() + deltaMs).toISOString();

		const { error: updateEventError } = await admin.from('events').update({ start_time: newStart, end_time: newEnd }).eq('id', eventId);
		if (updateEventError) return fail(500, { message: 'Failed to delay event' });

		const { data: rosterEntries, error: rosterFetchError } = await admin
			.from('roster_entries')
			.select('id, start_time, end_time')
			.eq('event_id', eventId);
		if (rosterFetchError) return fail(500, { message: 'Failed to update roster entries' });

		if (rosterEntries && rosterEntries.length > 0) {
			const updatedEntries = rosterEntries
				.map((r) => {
					const rs = new Date(r.start_time);
					const re = new Date(r.end_time);
					if (Number.isNaN(rs.getTime()) || Number.isNaN(re.getTime())) return null;
					return {
						id: r.id,
						start_time: new Date(rs.getTime() + deltaMs).toISOString(),
						end_time: new Date(re.getTime() + deltaMs).toISOString()
					};
				})
				.filter(Boolean);

			if (updatedEntries.length > 0) {
				const { error: rosterUpdateError } = await admin.from('roster_entries').upsert(updatedEntries, { onConflict: 'id' });
				if (rosterUpdateError) return fail(500, { message: 'Failed to update roster entries' });
			}
		}

		return { success: true };
	},
	deleteEvent: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'coordinator')) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const eventId = formData.get('id') as string;

		if (!eventId) return fail(400, { message: 'Missing event ID' });

		let admin;
		try {
			admin = createAdminClient();
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Server configuration error.' });
		}

		const { data: eventRow } = await admin.from('events').select('vatsim_id').eq('id', eventId).maybeSingle();
		if (eventRow?.vatsim_id) {
			const sup = await admin.from('vatsim_event_suppressions').upsert({ vatsim_id: eventRow.vatsim_id }, { onConflict: 'vatsim_id' });
			if (sup.error?.code === 'PGRST404') {
				// table doesn't exist yet, ignore
			}
		}

		// Delete roster entries first to avoid foreign key constraints
		const { error: rosterError } = await admin.from('roster_entries').delete().eq('event_id', eventId);
		if (rosterError) {
			console.error('Error deleting roster entries:', rosterError);
			// Continue trying to delete event anyway, or return fail?
			// If cascade is on, this might be redundant but harmless.
		}

		const { error } = await admin.from('events').delete().eq('id', eventId);

		// Also delete associated roster entries first if cascade isn't set up (usually helpful)
		// Actually supabase should handle cascade if configured, but let's be safe or check errors

		if (error) {
			console.error('Error deleting event:', error);
			return fail(500, { message: 'Failed to delete event' });
		}

		return { success: true };
	}
};
