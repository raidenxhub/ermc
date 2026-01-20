import type { SupabaseClient } from '@supabase/supabase-js';

interface VatsimEvent {
	id: number;
	type?: string;
	name?: string;
	link?: string;
	organisers?: Array<{
		region?: string;
		division?: string;
		subdivision?: string;
	}>;
	airports?: Array<{ icao?: string }> | string[];
	routes?: Array<{ departure?: string; arrival?: string; route?: string }>;
	start_time?: string;
	end_time?: string;
	short_description?: string;
	description?: string;
	banner?: string;
}

const VATSIM_MV_EVENTS_BY_DIVISION_API = 'https://my.vatsim.net/api/v2/events/view/division';
const VATSIM_DIVISION_ID = 'VATMENA';
const VATSIM_FALLBACK_EVENTS_API = 'https://api.vatsim.net/v2/events';
const RELEVANT_AIRPORTS = ['OBBI', 'OKKK'];

export async function fetchVatsimEvents() {
	try {
		const primaryUrl = `${VATSIM_MV_EVENTS_BY_DIVISION_API}/${encodeURIComponent(VATSIM_DIVISION_ID)}`;
		let events: VatsimEvent[] = [];

		const primaryRes = await fetch(primaryUrl, { headers: { accept: 'application/json' } });
		if (primaryRes.ok) {
			const json = await primaryRes.json();
			events = Array.isArray(json) ? json : (json?.data || []);
		} else {
			const fallbackRes = await fetch(VATSIM_FALLBACK_EVENTS_API);
			if (!fallbackRes.ok) throw new Error(`Failed to fetch events: ${fallbackRes.statusText}`);
			const json = await fallbackRes.json();
			events = Array.isArray(json) ? json : (json?.data || []);
		}

		// Filter for events that have at least one airport in our relevant list
		// OR if the event description/title contains keywords like "Middle East", "Gulf", etc.
		const relevantEvents = events.filter((event) => {
			const airportCodes = Array.isArray(event.airports)
				? (event.airports as Array<{ icao?: string } | string>)
						.map((a) => (typeof a === 'string' ? a : a?.icao))
						.filter(Boolean)
						.map((s) => String(s).toUpperCase())
				: [];

			const airportMatch = airportCodes.some((icao) => RELEVANT_AIRPORTS.includes(icao));
            
            // Check routes
			const routeMatch = event.routes && Array.isArray(event.routes) && event.routes.some(
				(r) => RELEVANT_AIRPORTS.includes((r.departure || '').toUpperCase()) || RELEVANT_AIRPORTS.includes((r.arrival || '').toUpperCase())
			);

			const name = (event.name || '').toLowerCase();
			const desc = (event.description || '').toLowerCase();
			const textMatch = RELEVANT_AIRPORTS.some((icao) => name.includes(icao.toLowerCase()) || desc.includes(icao.toLowerCase()));

			return airportMatch || routeMatch || textMatch;
		});

		return relevantEvents;
	} catch (error) {
		console.error('Error fetching VATSIM events:', error);
		return [];
	}
}

export async function generateRosterSlots(supabase: SupabaseClient, eventRecord: any) {
    // Check if slots already exist
    const { count } = await supabase.from('roster_entries').select('*', { count: 'exact', head: true }).eq('event_id', eventRecord.id);
    
    // Only generate if no slots exist and we have airports
    if (count === 0 && eventRecord.airports && eventRecord.airports.length > 0) {
        const airports = eventRecord.airports.split(',').filter((a: string) => a.length > 0);
        const positions = ['DEL', 'GND', 'TWR', 'APP', 'CTR', 'STBY'];
        const entriesToInsert = [];

        const startTime = new Date(eventRecord.start_time);
        const endTime = new Date(eventRecord.end_time);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        // Determine slot duration in milliseconds
        // 3+ hours -> 90 mins (1.5h)
        // Under 2 hours (and default) -> 60 mins (1h)
        let slotDurationMs = 60 * 60 * 1000; 
        if (durationHours >= 3) {
            slotDurationMs = 90 * 60 * 1000;
        }

        for (const airport of airports) {
            for (const pos of positions) {
                let currentSlotStart = new Date(startTime);
                
                while (currentSlotStart.getTime() < endTime.getTime()) {
                    let currentSlotEnd = new Date(currentSlotStart.getTime() + slotDurationMs);
                    
                    // Cap the last slot at event end time
                    if (currentSlotEnd.getTime() > endTime.getTime()) {
                        currentSlotEnd = new Date(endTime);
                    }
                    
                    // Don't create tiny sliver slots (e.g. < 15 mins) unless it's the only slot
                    if (currentSlotEnd.getTime() - currentSlotStart.getTime() < 15 * 60 * 1000 && currentSlotStart.getTime() !== startTime.getTime()) {
                         break;
                    }

                    // Use format like OBBI_TWR or OBBI_STBY
                    const positionName = `${airport}_${pos}`;

                    entriesToInsert.push({
                        event_id: eventRecord.id,
                        airport: airport,
                        position: positionName,
                        start_time: currentSlotStart.toISOString(),
                        end_time: currentSlotEnd.toISOString(),
                        status: 'open'
                    });

                    currentSlotStart = currentSlotEnd;
                }
            }
        }

        if (entriesToInsert.length > 0) {
            const { error } = await supabase.from('roster_entries').insert(entriesToInsert);
            if (error) console.error('Error generating slots:', error);
        }
    }
}

export async function syncEvents(supabase: SupabaseClient) {
	const events = await fetchVatsimEvents();

	for (const event of events) {
        // Infer airports if API list is empty but title suggests a specific location
        let inferredAirports: string[] = [];
        if (event.airports && Array.isArray(event.airports)) {
            inferredAirports = event.airports.map((a) => a.icao);
        }
        
        if (inferredAirports.length === 0) {
             const title = event.name.toLowerCase();
             const desc = event.description?.toLowerCase() || '';
             
             if (title.includes('bahrain') || desc.includes('bahrain')) inferredAirports.push('OBBI');
             if (title.includes('kuwait') || desc.includes('kuwait')) inferredAirports.push('OKKK');
             
             // Deduplicate
             inferredAirports = [...new Set(inferredAirports)];
        }

		// Upsert event into database
		const { data: eventRecord, error } = await supabase
			.from('events')
			.upsert(
				{
					vatsim_id: event.id,
					name: event.name,
					description: event.description,
					banner: event.banner,
					link: event.link,
					type: event.type,
					start_time: new Date(event.start_time).toISOString(),
					end_time: new Date(event.end_time).toISOString(),
					airports: inferredAirports.join(','),
					routes: JSON.stringify(event.routes),
					status: 'published'
				},
				{ onConflict: 'vatsim_id' }
			)
			.select()
			.single();

		if (error || !eventRecord) {
			console.error('Error syncing event:', error);
			continue;
		}

		// Generate roster slots
        await generateRosterSlots(supabase, eventRecord);
	}
}
