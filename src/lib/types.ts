export interface Controller {
	cid: number;
	name: string;
	rating: string;
	title: string;
	positions: {
		DEL?: boolean;
		GND?: boolean;
		TWR?: boolean;
		APP?: boolean;
		CTR?: boolean;
	};
}

export interface StaffMember {
	name: string;
	short_title: string;
	long_title: string;
	email: string;
	active: boolean;
}

export interface VatsimEvent {
	id: number;
	type: string;
	name: string;
	link: string;
	organizers: {
		region: string | null;
		division: string | null;
		subdivision: string | null;
		organised_by_vatsim: boolean;
	}[];
	airports: {
		icao: string;
	}[];
	routes: {
		departure: string;
		arrival: string;
		route: string;
	}[];
	start_time: string;
	end_time: string;
	short_description: string;
	description: string;
	banner: string;
}
