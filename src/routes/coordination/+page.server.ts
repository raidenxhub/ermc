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

        // Fetch user profile for rating check
        const { data: profile } = await supabase.from('profiles').select('rating, role').eq('id', user.id).single();
        if (!profile) return fail(401, { message: 'Profile not found' });

		// Fetch the slot to verify availability
		const { data: slot } = await supabase.from('roster_entries').select('*').eq('id', entryId).single();

		if (!slot) return fail(404, { message: 'Slot not found' });
		if (slot.user_id) return fail(400, { message: 'Slot already taken' });

        // Rating Logic
        // DEL/GND: S1 (2)
        // TWR: S2 (3)
        // APP: S3 (4)
        // CTR: C1 (5)
        const position = slot.position.split('_')[1]; // e.g. OBBI_TWR -> TWR
        let requiredRating = 2; // Default S1
        
        if (position === 'TWR') requiredRating = 3;
        else if (position === 'APP') requiredRating = 4;
        else if (position === 'CTR') requiredRating = 5;

        // Allow staff to bypass rating checks if they want (optional, but usually strict)
        // User said "COMPLETE CONTROL BY COORDINATORS/STAFF" - maybe they can book anything?
        // Let's enforce rating for everyone for now unless specific instructions override.
        // Actually, user said "a controller can claim all slots in THEIR ALLOWED POSITIONS THRU RAETINGS".
        
        if (profile.rating < requiredRating) {
             return fail(403, { message: `Rating restriction: You need rating level ${requiredRating}+ for ${position}.` });
        }

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
        
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

		// Verify ownership
		const { data: slot } = await supabase.from('roster_entries').select('*').eq('id', entryId).single();

		if (!slot) return fail(404, { message: 'Slot not found' });
        
        const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';

		if (slot.user_id !== user.id && !isStaff) {
             return fail(403, { message: 'Not your slot' });
        }
        
        // Cancellation Policy: > 60 mins before start time
        // Staff can bypass
        if (!isStaff) {
            const timeUntilStart = new Date(slot.start_time).getTime() - Date.now();
            if (timeUntilStart < 60 * 60 * 1000) {
                return fail(400, { message: 'Cannot cancel within 60 minutes of start time. Contact staff.' });
            }
        }

		// Cancel it
		const { error } = await supabase
			.from('roster_entries')
			.update({ user_id: null, status: 'open' })
			.eq('id', entryId);

		if (error) return fail(500, { message: 'Failed to cancel slot' });

		return { success: true };
	}
};
