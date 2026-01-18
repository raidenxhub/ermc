import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');

	const { data: events, error } = await supabase
		.from('events')
		.select('*, roster_entries(*)')
		.eq('status', 'published')
		.gte('end_time', new Date().toISOString())
		.order('start_time', { ascending: true });

	if (error) {
		console.error('Error fetching events:', error);
	}

	// Fetch user's profile to check rating eligibility
	const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

	return {
		events: events || [],
		userProfile: profile
	};
};

export const actions: Actions = {
	bookSlot: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const entryId = formData.get('entry_id') as string;

		if (!entryId) return fail(400, { message: 'Missing entry ID' });

		// Fetch the slot to verify availability
		const { data: slot } = await supabase.from('roster_entries').select('*').eq('id', entryId).single();

		if (!slot) return fail(404, { message: 'Slot not found' });
		if (slot.user_id) return fail(400, { message: 'Slot already taken' });

		// Book it
		const { error } = await supabase
			.from('roster_entries')
			.update({ user_id: user.id, status: 'booked' })
			.eq('id', entryId);

		if (error) return fail(500, { message: 'Failed to book slot' });

		return { success: true };
	},
	cancelSlot: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const entryId = formData.get('entry_id') as string;

		if (!entryId) return fail(400, { message: 'Missing entry ID' });

		// Verify ownership
		const { data: slot } = await supabase.from('roster_entries').select('*').eq('id', entryId).single();

		if (!slot) return fail(404, { message: 'Slot not found' });
		if (slot.user_id !== user.id) return fail(403, { message: 'Not your slot' });

		// Cancel it
		const { error } = await supabase
			.from('roster_entries')
			.update({ user_id: null, status: 'open' })
			.eq('id', entryId);

		if (error) return fail(500, { message: 'Failed to cancel slot' });

		return { success: true };
	}
};
