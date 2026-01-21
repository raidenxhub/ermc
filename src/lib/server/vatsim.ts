import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { VatsimEvent } from '$lib/types';
import { VATSIM_HOSTNAME } from '$env/static/private';

export async function fetchVatsimEvents(fetchFn: typeof fetch = fetch, urlPathname = '/server/vatsim') {
	const api = new URL('https://' + (VATSIM_HOSTNAME || 'my.vatsim.net'));

	let events: VatsimEvent[] | null = null;

	try {
		const response = await fetchFn(new URL('api/v2/events/view/division/mena', api), { headers: { Accept: 'application/json' } });

		if (!response.ok) throw new Error(`[${urlPathname}] Error Fetching Events: ${response.status}: ${response.statusText}`);

		const { data }: { data: VatsimEvent[] } = await response.json();

		events = data.filter((event) =>
			(event.airports || []).some((airport) => {
				const icao = typeof airport === 'string' ? airport : airport?.icao;
				return icao === 'OBBI' || icao === 'OKKK';
			})
		);
	} catch (err) {
		console.error(`[${urlPathname}] Error Fetching Events:`);
		console.error(err);
	}

	if (!events) return [];

	return events;
}

export async function generateRosterSlots(
	supabase: SupabaseClient,
	eventRecord: { id: string; id_bigint?: string | null; airports?: string | null; start_time: string; end_time: string }
) {
	if (!eventRecord.airports) return;

	let eventIdBigint: string | null = (eventRecord as any).id_bigint || null;
	if (!eventIdBigint) {
		const { data } = await supabase.from('events').select('id_bigint, vatsim_id').eq('id', eventRecord.id).maybeSingle();
		eventIdBigint = (data as any)?.id_bigint || null;
		if (!eventIdBigint && (data as any)?.vatsim_id) {
			eventIdBigint = String((data as any).vatsim_id);
			await supabase.from('events').update({ id_bigint: eventIdBigint }).eq('id', eventRecord.id);
		}
	}
	if (!eventIdBigint) {
		const millis = BigInt(Date.now());
		const rand = BigInt(Math.floor(Math.random() * 1000));
		eventIdBigint = String(millis * 1000n + rand);
		await supabase.from('events').update({ id_bigint: eventIdBigint }).eq('id', eventRecord.id);
	}

	const managedAirports = new Set(['OBBI', 'OKKK']);
	const airports = eventRecord.airports
		.split(',')
		.map((a) => a.trim().toUpperCase())
		.filter((a) => a.length > 0)
		.filter((a) => managedAirports.has(a));

	if (airports.length === 0) return;

	const { data: existingRows } = await supabase
		.from('roster_entries')
		.select('airport, position, start_time, end_time')
		.eq('event_id', eventRecord.id)
		.in('airport', airports);

	const existing = new Set(
		(existingRows || []).map((r) => `${r.airport}|${r.position}|${new Date(r.start_time).toISOString()}|${new Date(r.end_time).toISOString()}`)
	);

	const positions = ['DEL', 'GND', 'TWR', 'APP', 'CTR'];
	const entriesToInsert = [];

	const startTime = new Date(eventRecord.start_time);
	const endTime = new Date(eventRecord.end_time);
	const durationMs = endTime.getTime() - startTime.getTime();
	const durationHours = durationMs / (1000 * 60 * 60);

	// Determine slot duration in milliseconds
	// <= 90m -> single slot (no splitting)
	// 2h -> two 1h slots
	// 3h+ -> 90m sequencing
	const oneHourMs = 60 * 60 * 1000;
	const ninetyMinMs = 90 * 60 * 1000;
	let slotDurationMs = oneHourMs;
	if (durationMs > 0 && durationMs <= ninetyMinMs) {
		slotDurationMs = durationMs;
	} else if (durationHours >= 3) {
		slotDurationMs = ninetyMinMs;
	}

	for (const airport of airports) {
		for (const pos of positions) {
			let currentSlotStart = new Date(startTime);

			while (currentSlotStart.getTime() < endTime.getTime()) {
				const remainingMs = endTime.getTime() - currentSlotStart.getTime();
				const currentSlotEnd = remainingMs <= slotDurationMs ? new Date(endTime) : new Date(currentSlotStart.getTime() + slotDurationMs);

				// Don't create tiny sliver slots (e.g. < 15 mins) unless it's the only slot
				if (currentSlotEnd.getTime() - currentSlotStart.getTime() < 15 * 60 * 1000 && currentSlotStart.getTime() !== startTime.getTime()) {
					break;
				}

				// Use format like OBBI_TWR or OBBI_STBY
				const positionName = `${airport}_${pos}`;

				const startIso = currentSlotStart.toISOString();
				const endIso = currentSlotEnd.toISOString();
				const key = `${airport}|${positionName}|${startIso}|${endIso}`;
				if (!existing.has(key)) {
					entriesToInsert.push({
						event_id: eventRecord.id,
						event_id_bigint: eventIdBigint,
						airport,
						position: positionName,
						start_time: startIso,
						end_time: endIso,
						status: 'open'
					});
				}

				currentSlotStart = currentSlotEnd;
			}
		}
	}

	if (entriesToInsert.length > 0) {
		const res = await supabase
			.from('roster_entries')
			.upsert(entriesToInsert, { onConflict: 'event_id,airport,position,start_time,end_time', ignoreDuplicates: true });
		if (res.error?.code === '42P10') {
			const resInsert = await supabase.from('roster_entries').insert(entriesToInsert);
			if (resInsert.error?.code === 'PGRST204') {
				const stripped = entriesToInsert.map(({ event_id_bigint: _event_id_bigint, ...rest }) => rest);
				const resInsert2 = await supabase.from('roster_entries').insert(stripped as any);
				if (resInsert2.error) console.error('Error generating slots:', resInsert2.error);
			} else if (resInsert.error) {
				console.error('Error generating slots:', resInsert.error);
			}
		} else if (res.error?.code === 'PGRST204') {
			const stripped = entriesToInsert.map(({ event_id_bigint: _event_id_bigint, ...rest }) => rest);
			const res2 = await supabase
				.from('roster_entries')
				.upsert(stripped as any, { onConflict: 'event_id,airport,position,start_time,end_time', ignoreDuplicates: true });
			if (res2.error?.code === '42P10') {
				const resInsert2 = await supabase.from('roster_entries').insert(stripped as any);
				if (resInsert2.error) console.error('Error generating slots:', resInsert2.error);
			} else if (res2.error) {
				console.error('Error generating slots:', res2.error);
			}
		} else if (res.error) {
			console.error('Error generating slots:', res.error);
		}
	}
}

export async function syncEvents(supabase: SupabaseClient) {
	const toUtcIsoSafe = (value: unknown) => {
		if (typeof value !== 'string') return null;
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return null;
		return d.toISOString();
	};

	try {
		const nowIso = new Date().toISOString();
		let events = await fetchVatsimEvents(fetch, '/server/vatsim');
		const supSet = await supabase.from('vatsim_event_suppressions').select('vatsim_id');
		if (!supSet.error && Array.isArray(supSet.data) && supSet.data.length > 0) {
			const suppressed = new Set<number>(supSet.data.map((r: any) => r.vatsim_id).filter((v: any) => typeof v === 'number'));
			events = events.filter((e) => !suppressed.has(e.id));
		}
		const seenVatsimIds = new Set<number>(events.map((e) => e.id).filter((id) => typeof id === 'number'));

		for (const event of events) {
			try {
				const start_time = toUtcIsoSafe(event.start_time);
				const end_time = toUtcIsoSafe(event.end_time);
				if (!start_time || !end_time) continue;

				const stripEmojiCodes = (value: string) =>
					value
						.replace(/:[a-z0-9_+-]+:/gi, '')
						.replace(/\s+/g, ' ')
						.trim();
				const name = typeof event.name === 'string' ? stripEmojiCodes(event.name) : '';
				const shortDescription =
					typeof (event as any).short_description === 'string' ? stripEmojiCodes((event as any).short_description) : '';
				const description = typeof event.description === 'string' ? stripEmojiCodes(event.description) : '';

				const normalizeIcao = (value: unknown) => {
					if (typeof value !== 'string') return null;
					const trimmed = value.trim().toUpperCase();
					if (!/^[A-Z0-9]{4}$/.test(trimmed)) return null;
					return trimmed;
				};

				const inferred = new Set<string>();
				if (Array.isArray(event.airports)) {
					for (const a of event.airports as Array<{ icao?: string } | string>) {
						const raw = typeof a === 'string' ? a : a?.icao;
						const icao = normalizeIcao(raw);
						if (icao) inferred.add(icao);
					}
				}
				if (Array.isArray(event.routes)) {
					for (const r of event.routes) {
						const dep = normalizeIcao(r?.departure);
						const arr = normalizeIcao(r?.arrival);
						if (dep) inferred.add(dep);
						if (arr) inferred.add(arr);
					}
				}

				let inferredAirports = [...inferred];
				if (inferredAirports.length === 0) {
					const title = name.toLowerCase();
					const desc = description.toLowerCase();
					if (title.includes('bahrain') || desc.includes('bahrain')) inferredAirports.push('OBBI');
					if (title.includes('kuwait') || desc.includes('kuwait')) inferredAirports.push('OKKK');
				}
				inferredAirports = [...new Set(inferredAirports)];

				const payload = {
					vatsim_id: event.id,
					id_bigint: String(event.id),
					name: name || null,
					short_description: shortDescription || null,
					description: description || null,
					banner: event.banner || null,
					link: event.link || null,
					type: event.type || null,
					start_time,
					end_time,
					airports: inferredAirports.join(','),
					routes: event.routes ? JSON.stringify(event.routes) : null,
					status: 'published',
					cancelled_at: null,
					delete_at: null,
					vatsim_last_seen_at: nowIso,
					vatsim_missing_count: 0
				};
				const fallbackPayload = {
					vatsim_id: payload.vatsim_id,
					id_bigint: payload.id_bigint,
					name: payload.name,
					short_description: payload.short_description,
					description: payload.description,
					banner: payload.banner,
					link: payload.link,
					type: payload.type,
					start_time: payload.start_time,
					end_time: payload.end_time,
					airports: payload.airports,
					routes: payload.routes,
					status: payload.status
				};

				const { data: existing, error: existingError } = await supabase.from('events').select('id').eq('vatsim_id', event.id).maybeSingle();

				if (existingError) {
					console.error('Error checking existing event:', existingError);
					continue;
				}

				let eventRecord: any = null;
				let error: any = null;
				if (existing?.id) {
					const res = await supabase.from('events').update(payload).eq('id', existing.id).select().single();
					eventRecord = res.data;
					error = res.error;
					if (error?.code === 'PGRST204') {
						const res2 = await supabase.from('events').update(fallbackPayload).eq('id', existing.id).select().single();
						eventRecord = res2.data;
						error = res2.error;
					}
				} else {
					const res = await supabase
						.from('events')
						.insert({ id: randomUUID(), ...payload })
						.select()
						.single();
					eventRecord = res.data;
					error = res.error;
					if (error?.code === 'PGRST204') {
						const res2 = await supabase
							.from('events')
							.insert({ id: randomUUID(), ...fallbackPayload })
							.select()
							.single();
						eventRecord = res2.data;
						error = res2.error;
					}
				}

				if (error || !eventRecord) {
					console.error('Error syncing event:', error);
					continue;
				}

				await generateRosterSlots(supabase, eventRecord);
			} catch (e) {
				console.error('Error syncing individual event:', e);
			}
		}

		try {
			const { data: publishedVatsimEvents } = await supabase
				.from('events')
				.select('id, vatsim_id, vatsim_missing_count, start_time, status')
				.not('vatsim_id', 'is', null)
				.eq('status', 'published')
				.gte('start_time', nowIso);

			for (const row of publishedVatsimEvents || []) {
				if (!row?.vatsim_id) continue;
				if (seenVatsimIds.has(row.vatsim_id)) continue;
				const currentMissing = Number(row.vatsim_missing_count || 0);
				const nextMissing = currentMissing + 1;
				if (nextMissing >= 2) {
					const now = Date.now();
					const res = await supabase
						.from('events')
						.update({
							status: 'cancelled',
							cancelled_at: new Date(now).toISOString(),
							delete_at: new Date(now + 10 * 60 * 1000).toISOString(),
							vatsim_missing_count: nextMissing
						})
						.eq('id', row.id);
					if (res.error?.code === 'PGRST204') {
						await supabase.from('events').update({ status: 'cancelled' }).eq('id', row.id);
					}
				} else {
					const res = await supabase.from('events').update({ vatsim_missing_count: nextMissing }).eq('id', row.id);
					if (res.error?.code === 'PGRST204') {
						await supabase.from('events').update({ status: 'published' }).eq('id', row.id);
					}
				}
			}
		} catch (e) {
			console.error('Error marking missing VATSIM events:', e);
		}
	} catch (e) {
		console.error('Error syncing events:', e);
	}
}
