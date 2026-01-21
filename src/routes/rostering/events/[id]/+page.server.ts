import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createAdminClient } from '$lib/server/supabaseAdmin';
import { sendBookingCancelledEmail, sendBookingConfirmedEmail, sendStandbyRequestedEmail } from '$lib/server/email';

export const load: PageServerLoad = async ({ params, locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	const { data: event } = await supabase.from('events').select('*').eq('id', params.id).single();
	if (!event) throw redirect(303, '/');

	const { data: roster } = await supabase
		.from('roster_entries')
		.select(`*, user:profiles(*)`)
		.eq('event_id', params.id)
		.order('start_time', { ascending: true })
		.order('position', { ascending: true });

	const rosterDeduped = (() => {
		const byKey = new Map<string, any>();
		for (const r of roster || []) {
			const key = `${r.airport}|${r.position}|${new Date(r.start_time).toISOString()}|${new Date(r.end_time).toISOString()}`;
			const existing = byKey.get(key);
			if (!existing) {
				byKey.set(key, r);
				continue;
			}
			if (!existing.user_id && r.user_id) {
				byKey.set(key, r);
			}
		}
		return [...byKey.values()];
	})();

	const { data: claims } = await supabase
		.from('roster_claims')
		.select('*, user:profiles(id,name,cid,rating_short)')
		.in(
			'roster_entry_id',
			rosterDeduped.map((r) => r.id)
		);

	// Check if user is staff/coordinator
	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
	const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';

	return { event, roster: rosterDeduped, claims: claims || [], me: user, isStaff };
};

export const actions: Actions = {
	add_slot: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		// Permission check
		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';

		if (!isStaff) return fail(403, { message: 'Forbidden' });

		const formData = await request.formData();
		const event_id = formData.get('event_id') as string;
		const position = formData.get('position') as string;
		const airport = formData.get('airport') as string;
		const start_time = formData.get('start_time') as string;
		const end_time = formData.get('end_time') as string;

		if (!event_id || !position || !airport || !start_time || !end_time) {
			return fail(400, { message: 'Missing required fields' });
		}

		// Validate airport against event
		const { data: event } = await supabase.from('events').select('airports, id_bigint').eq('id', event_id).single();
		if (!event) return fail(404, { message: 'Event not found' });
		let eventIdBigint: string | null = (event as any).id_bigint || null;
		if (!eventIdBigint) {
			const millis = BigInt(Date.now());
			const rand = BigInt(Math.floor(Math.random() * 1000));
			eventIdBigint = String(millis * 1000n + rand);
		}

		const allowed = event.airports ? event.airports.split(',').map((a: string) => a.trim().toUpperCase()) : [];
		if (!allowed.includes(airport) || !['OBBI', 'OKKK'].includes(airport)) {
			return fail(400, { message: 'Airport not allowed for this event or not managed by ERMC.' });
		}

		const fullPosition = `${airport}_${position}`;

		const startDate = new Date(start_time);
		const endDate = new Date(end_time);
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
			return fail(400, { message: 'Invalid start or end time.' });
		}
		if (endDate.getTime() <= startDate.getTime()) {
			return fail(400, { message: 'End time must be after start time.' });
		}

		let admin;
		try {
			admin = createAdminClient();
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Server configuration error.' });
		}

		if (!(event as any).id_bigint && eventIdBigint) {
			await admin.from('events').update({ id_bigint: eventIdBigint }).eq('id', event_id);
		}

		const res = await admin.from('roster_entries').upsert(
			{
				event_id,
				event_id_bigint: eventIdBigint,
				airport,
				position: fullPosition,
				start_time: startDate.toISOString(),
				end_time: endDate.toISOString(),
				status: 'open'
			},
			{ onConflict: 'event_id,airport,position,start_time,end_time', ignoreDuplicates: true }
		);

		if (res.error?.code === '42P10') {
			const resInsert = await admin.from('roster_entries').insert({
				event_id,
				event_id_bigint: eventIdBigint,
				airport,
				position: fullPosition,
				start_time: startDate.toISOString(),
				end_time: endDate.toISOString(),
				status: 'open'
			});
			if (resInsert.error?.code === 'PGRST204') {
				const resInsert2 = await admin.from('roster_entries').insert({
					event_id,
					airport,
					position: fullPosition,
					start_time: startDate.toISOString(),
					end_time: endDate.toISOString(),
					status: 'open'
				});
				if (resInsert2.error) {
					console.error('Error adding slot:', resInsert2.error);
					return fail(500, { message: 'Failed to add slot' });
				}
			} else if (resInsert.error) {
				console.error('Error adding slot:', resInsert.error);
				return fail(500, { message: 'Failed to add slot' });
			}
		} else if (res.error?.code === 'PGRST204') {
			const res2 = await admin.from('roster_entries').upsert(
				{
					event_id,
					airport,
					position: fullPosition,
					start_time: startDate.toISOString(),
					end_time: endDate.toISOString(),
					status: 'open'
				},
				{ onConflict: 'event_id,airport,position,start_time,end_time', ignoreDuplicates: true }
			);
			if (res2.error?.code === '42P10') {
				const resInsert2 = await admin.from('roster_entries').insert({
					event_id,
					airport,
					position: fullPosition,
					start_time: startDate.toISOString(),
					end_time: endDate.toISOString(),
					status: 'open'
				});
				if (resInsert2.error) {
					console.error('Error adding slot:', resInsert2.error);
					return fail(500, { message: 'Failed to add slot' });
				}
			} else if (res2.error) {
				console.error('Error adding slot:', res2.error);
				return fail(500, { message: 'Failed to add slot' });
			}
		} else if (res.error) {
			console.error('Error adding slot:', res.error);
			return fail(500, { message: 'Failed to add slot' });
		}

		return { success: true };
	},

	claim_primary: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });
		const form = await request.formData();
		const roster_entry_id = form.get('roster_entry_id') as string;
		if (!roster_entry_id) return fail(400, { message: 'Missing roster_entry_id' });

		const { data: meProfile, error: profileError } = await supabase
			.from('profiles')
			.select('rating, rating_short, cid, email, name, discord_username, subdivision')
			.eq('id', user.id)
			.single();
		if (profileError || !meProfile?.rating || !meProfile?.cid) return fail(400, { message: 'Complete your profile before booking.' });

		// ensure the slot is still open
		const { data: entry } = await supabase.from('roster_entries').select('*, event:events(*)').eq('id', roster_entry_id).single();
		if (!entry) return fail(404, { message: 'Slot not found' });
		if (entry.user_id) return fail(400, { message: 'Slot already claimed' });

		const rawPosition = String(entry.position || '');
		const posCode = rawPosition.includes('_') ? rawPosition.split('_').pop() : rawPosition;
		const minRatingByPos: Record<string, number> = { DEL: 2, GND: 2, TWR: 3, APP: 4, CTR: 5 };
		const minRequired = minRatingByPos[posCode || ''] ?? null;
		if (!minRequired) return fail(400, { message: 'Invalid slot position.' });
		if (Number(meProfile.rating) < minRequired) {
			return fail(400, { message: `Your rating is not eligible for ${posCode}.` });
		}

		// Booking Window Check: Closed 15 mins before event start
		const now = Date.now();
		const eventAny = (entry as any).event;
		const eventObj = Array.isArray(eventAny) ? eventAny[0] : eventAny;
		const eventStart = eventObj?.start_time;
		const eventStatus = eventObj?.status;
		if (eventStatus === 'cancelled') return fail(400, { message: 'Booking is closed (event cancelled).' });
		if (!eventStart) return fail(400, { message: 'Event start time missing.' });
		const startTime = new Date(eventStart).getTime();
		if (now > startTime - 15 * 60 * 1000) {
			return fail(400, { message: 'Booking is closed (closes 15m before event).' });
		}

		// Enforce single position per time slot (no overlapping bookings)
		const { data: overlappingPrimary } = await supabase
			.from('roster_entries')
			.select('id')
			.eq('event_id', (entry as any).event_id)
			.eq('user_id', user.id)
			.lt('start_time', (entry as any).end_time)
			.gt('end_time', (entry as any).start_time)
			.limit(1);
		if ((overlappingPrimary || []).length > 0) {
			return fail(400, { message: 'You already have a booking in this time slot.' });
		}
		const { data: overlappingEntriesForStandby } = await supabase
			.from('roster_entries')
			.select('id')
			.eq('event_id', (entry as any).event_id)
			.lt('start_time', (entry as any).end_time)
			.gt('end_time', (entry as any).start_time);
		const overlappingIds = (overlappingEntriesForStandby || []).map((r: any) => r.id);
		if (overlappingIds.length > 0) {
			const { data: overlappingStandby } = await supabase
				.from('roster_claims')
				.select('id')
				.in('roster_entry_id', overlappingIds)
				.eq('user_id', user.id)
				.eq('type', 'standby')
				.limit(1);
			if ((overlappingStandby || []).length > 0) {
				return fail(400, { message: 'You already have a standby in this time slot.' });
			}
		}

		// create primary claim (trigger will set roster_entries.user_id)
		const { error } = await supabase.from('roster_claims').insert({ roster_entry_id, user_id: user.id, type: 'primary' });
		if (error) {
			console.error(error);
			return fail(500, { message: 'Failed to claim slot' });
		}

		const emailTo = typeof meProfile.email === 'string' ? meProfile.email : '';
		if (emailTo) {
			const eventAny = (entry as any).event;
			const eventObj = Array.isArray(eventAny) ? eventAny[0] : eventAny;
			const eventName = (eventObj?.name as string) || 'Event';
			const nameForEmail = (meProfile.name as string) || (meProfile.discord_username as string) || null;
			void sendBookingConfirmedEmail({
				to: emailTo,
				name: nameForEmail,
				eventName,
				subdivision: (meProfile as any).subdivision ?? null,
				airport: String(entry.airport || '') || null,
				position: String(entry.position || ''),
				startTime: String(entry.start_time || ''),
				endTime: String(entry.end_time || '')
			});
		}
		return { success: true };
	},

	claim_standby: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });
		const form = await request.formData();
		const roster_entry_id = form.get('roster_entry_id') as string;
		if (!roster_entry_id) return fail(400, { message: 'Missing roster_entry_id' });

		const { data: meProfile, error: profileError } = await supabase
			.from('profiles')
			.select('rating, cid, email, name, discord_username, subdivision')
			.eq('id', user.id)
			.single();
		if (profileError || !meProfile?.rating || !meProfile?.cid) return fail(400, { message: 'Complete your profile before booking.' });

		const { data: entry } = await supabase
			.from('roster_entries')
			.select('airport, position, start_time, end_time, event_id, event:events(name,start_time,status)')
			.eq('id', roster_entry_id)
			.single();
		if (!entry) return fail(404, { message: 'Slot not found' });

		const rawPosition = String(entry.position || '');
		const posCode = rawPosition.includes('_') ? rawPosition.split('_').pop() : rawPosition;
		const minRatingByPos: Record<string, number> = { DEL: 2, GND: 2, TWR: 3, APP: 4, CTR: 5 };
		const minRequired = minRatingByPos[posCode || ''] ?? null;
		if (!minRequired) return fail(400, { message: 'Invalid slot position.' });
		if (Number(meProfile.rating) < minRequired) {
			return fail(400, { message: `Your rating is not eligible for ${posCode}.` });
		}

		const now = Date.now();
		const eventAny = (entry as any).event;
		const eventObj = Array.isArray(eventAny) ? eventAny[0] : eventAny;
		const eventStart = eventObj?.start_time;
		const eventStatus = eventObj?.status;
		if (eventStatus === 'cancelled') return fail(400, { message: 'Booking is closed (event cancelled).' });
		if (!eventStart) return fail(400, { message: 'Event start time missing.' });
		const startTime = new Date(eventStart).getTime();
		if (now > startTime - 15 * 60 * 1000) {
			return fail(400, { message: 'Booking is closed (closes 15m before event).' });
		}

		// Enforce single position per time slot (no overlapping bookings or standbys)
		const { data: overlappingPrimary } = await supabase
			.from('roster_entries')
			.select('id')
			.eq('event_id', (entry as any).event_id)
			.eq('user_id', user.id)
			.lt('start_time', (entry as any).end_time)
			.gt('end_time', (entry as any).start_time)
			.limit(1);
		if ((overlappingPrimary || []).length > 0) {
			return fail(400, { message: 'You already have a booking in this time slot.' });
		}
		const { data: overlappingEntries } = await supabase
			.from('roster_entries')
			.select('id')
			.eq('event_id', (entry as any).event_id)
			.lt('start_time', (entry as any).end_time)
			.gt('end_time', (entry as any).start_time);
		const overlappingIds = (overlappingEntries || []).map((r: any) => r.id);
		if (overlappingIds.length > 0) {
			const { data: overlappingStandby } = await supabase
				.from('roster_claims')
				.select('id')
				.in('roster_entry_id', overlappingIds)
				.eq('user_id', user.id)
				.eq('type', 'standby')
				.limit(1);
			if ((overlappingStandby || []).length > 0) {
				return fail(400, { message: 'You already have a standby in this time slot.' });
			}
		}

		const { data: existing } = await supabase
			.from('roster_claims')
			.select('id')
			.eq('roster_entry_id', roster_entry_id)
			.eq('user_id', user.id)
			.eq('type', 'standby')
			.maybeSingle();
		if (existing?.id) return fail(400, { message: 'Already on standby for this slot.' });

		const { error } = await supabase.from('roster_claims').insert({ roster_entry_id, user_id: user.id, type: 'standby' });
		if (error) {
			console.error(error);
			return fail(500, { message: 'Failed to claim standby' });
		}

		const emailTo = typeof meProfile.email === 'string' ? meProfile.email : '';
		if (emailTo) {
			const eventAny = (entry as any).event;
			const eventObj = Array.isArray(eventAny) ? eventAny[0] : eventAny;
			const eventName = (eventObj?.name as string) || 'Event';
			const nameForEmail = (meProfile.name as string) || (meProfile.discord_username as string) || null;
			void sendStandbyRequestedEmail({
				to: emailTo,
				name: nameForEmail,
				eventName,
				subdivision: (meProfile as any).subdivision ?? null,
				airport: String((entry as any).airport || '') || null,
				position: String((entry as any).position || ''),
				startTime: String((entry as any).start_time || '') || null,
				endTime: String((entry as any).end_time || '') || null
			});
		}
		return { success: true };
	},

	cancel_claim: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });
		const form = await request.formData();
		const roster_entry_id = form.get('roster_entry_id') as string;
		if (!roster_entry_id) return fail(400, { message: 'Missing roster_entry_id' });

		const { data: entry } = await supabase.from('roster_entries').select('*').eq('id', roster_entry_id).single();
		if (!entry) return fail(404, { message: 'Slot not found' });

		// 60-minute window check
		const now = Date.now();
		const start = new Date(entry.start_time).getTime();
		if (start - now <= 60 * 60 * 1000) {
			return fail(400, { message: 'Cancellations are not allowed within 60 minutes of start time.' });
		}

		const wasPrimary = entry.user_id === user.id;

		// Find user's claim
		const { data: myClaims } = await supabase.from('roster_claims').select('*').eq('roster_entry_id', roster_entry_id).eq('user_id', user.id);

		if (!myClaims || myClaims.length === 0) return fail(404, { message: 'No claim to cancel' });

		// Delete all user's claims on this slot (primary or standby)
		const { error } = await supabase.from('roster_claims').delete().eq('roster_entry_id', roster_entry_id).eq('user_id', user.id);

		if (error) {
			console.error(error);
			return fail(500, { message: 'Failed to cancel claim' });
		}
		if (wasPrimary) {
			const { data: current } = await supabase.from('roster_entries').select('user_id').eq('id', roster_entry_id).single();
			if (!current?.user_id) {
				const standbyQuery = supabase
					.from('roster_claims')
					.select('id, user_id')
					.eq('roster_entry_id', roster_entry_id)
					.eq('type', 'standby')
					.limit(1);

				const byCreated = await standbyQuery.order('created_at', { ascending: true }).maybeSingle();
				const byId = byCreated.error ? await standbyQuery.order('id', { ascending: true }).maybeSingle() : byCreated;
				const standbyNext = byId.data;

				if (standbyNext?.user_id) {
					await supabase.from('roster_claims').delete().eq('id', standbyNext.id);
					await supabase.from('roster_claims').insert({ roster_entry_id, user_id: standbyNext.user_id, type: 'primary' });

					const { data: promotedProfile } = await supabase
						.from('profiles')
						.select('email,name,discord_username,subdivision')
						.eq('id', standbyNext.user_id)
						.maybeSingle();
					const emailTo = typeof promotedProfile?.email === 'string' ? promotedProfile.email : '';
					if (emailTo) {
						const { data: ev } = await supabase.from('events').select('name').eq('id', entry.event_id).maybeSingle();
						const eventName = (ev?.name as string) || 'Event';
						const nameForEmail = (promotedProfile?.name as string) || (promotedProfile?.discord_username as string) || null;
						void sendBookingConfirmedEmail({
							to: emailTo,
							name: nameForEmail,
							eventName,
							subdivision: (promotedProfile as any)?.subdivision ?? null,
							airport: String(entry.airport || '') || null,
							position: String(entry.position || ''),
							startTime: String(entry.start_time || ''),
							endTime: String(entry.end_time || '')
						});
					}
				}
			}
		}

		const { data: cancelledProfile } = await supabase
			.from('profiles')
			.select('email,name,discord_username,subdivision')
			.eq('id', user.id)
			.maybeSingle();
		const cancelledEmail = typeof cancelledProfile?.email === 'string' ? cancelledProfile.email : '';
		if (cancelledEmail) {
			const { data: ev } = await supabase.from('events').select('name').eq('id', entry.event_id).maybeSingle();
			const eventName = (ev?.name as string) || 'Event';
			const nameForEmail = (cancelledProfile?.name as string) || (cancelledProfile?.discord_username as string) || null;
			void sendBookingCancelledEmail({
				to: cancelledEmail,
				name: nameForEmail,
				eventName,
				subdivision: (cancelledProfile as any)?.subdivision ?? null,
				airport: String(entry.airport || '') || null,
				position: String(entry.position || ''),
				startTime: String(entry.start_time || ''),
				endTime: String(entry.end_time || '')
			});
		}

		return { success: true };
	},

	knock: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });
		const form = await request.formData();
		const roster_entry_id = form.get('roster_entry_id') as string;
		const to_user_id = form.get('to_user_id') as string;
		const event_id = form.get('event_id') as string;
		const message = (form.get('message') as string) || null;
		if (!to_user_id || !event_id) return fail(400, { message: 'Missing target or event' });
		const { error } = await supabase.from('knocks').insert({ from_user_id: user.id, to_user_id, event_id, roster_entry_id, message });
		if (error) {
			console.error(error);
			return fail(500, { message: 'Failed to send knock' });
		}
		return { success: true };
	}
};
