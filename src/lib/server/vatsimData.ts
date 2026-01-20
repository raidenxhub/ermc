interface VatsimController {
	cid: number;
	name: string;
	callsign: string;
	frequency: string;
	facility: number;
	rating: number;
	server: string;
	visual_range: number;
	text_atis: string[];
	last_updated: string;
	logon_time: string;
}

interface VatsimData {
	controllers: VatsimController[];
	atis: VatsimController[];
}

const VATSIM_DATA_URL = 'https://data.vatsim.net/v3/vatsim-data.json';
const METAR_URL = 'https://metar.vatsim.net/metar.php?id=';

const RELEVANT_AIRPORTS = ['OBBI', 'OKKK'];

export async function fetchOnlineControllers() {
	try {
		const response = await fetch(VATSIM_DATA_URL);
		if (!response.ok) throw new Error('Failed to fetch VATSIM data');

		const data: VatsimData = await response.json();

		if (!data || (!data.controllers && !data.atis)) {
			console.warn('Invalid VATSIM data format received');
			return [];
		}

		const normalizeCallsign = (value: unknown) => {
			const raw = typeof value === 'string' ? value : '';
			return raw.trim().toUpperCase();
		};

		const isRelevant = (callsign: string) =>
			RELEVANT_AIRPORTS.some(
				(icao) => callsign.startsWith(`${icao}_`) || callsign.startsWith(`${icao}-`) || callsign === icao || callsign.startsWith(icao)
			);

		const combined = [...(data.controllers || []), ...(data.atis || [])];

		const controllers = combined.filter((c) => {
			const callsign = normalizeCallsign(c.callsign);
			if (!callsign) return false;
			if (!isRelevant(callsign)) return false;
			return Number(c.facility) > 0 || callsign.endsWith('_ATIS') || callsign.endsWith('-ATIS');
		});

		// Map simplified data
		return controllers.map((c) => ({
			cid: c.cid,
			name: c.name,
			callsign: c.callsign,
			frequency: c.frequency,
			logonTime: c.logon_time,
			rating: c.rating
		}));
	} catch (error) {
		console.error('Error fetching online controllers:', error);
		return [];
	}
}

export async function fetchMetars() {
	try {
		const metars: Record<string, string> = {};

		// Fetch in parallel
		await Promise.all(
			RELEVANT_AIRPORTS.map(async (icao) => {
				try {
					const response = await fetch(`${METAR_URL}${icao}`);
					if (response.ok) {
						const text = await response.text();
						if (text.trim()) {
							metars[icao] = text;
						}
					}
				} catch (e) {
					console.error(`Failed to fetch METAR for ${icao}`, e);
				}
			})
		);

		return metars;
	} catch (error) {
		console.error('Error fetching METARs:', error);
		return {};
	}
}
