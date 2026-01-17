import type { LayoutServerLoad } from './$types';
import { fetchVatsimEvents } from '$lib/server/vatsim';

export const load: LayoutServerLoad = async ({ locals }) => {
	const events = await fetchVatsimEvents();
	return { user: locals.user, events };
};
