import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { fetchOnlineControllers, fetchMetars } from '$lib/server/vatsimData';
import { syncEvents } from '$lib/server/vatsim';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	// Sync VATSIM Events (Fire and forget, or await if critical)
	// We verify if we need to sync to avoid spamming.
	// For now, we'll just run it every time dashboard loads but rely on upsert to handle dups.
	// Ideally this should be a cron job.
	await syncEvents(supabase);

	// Fetch user profile
	const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
	if (profileError || !profile) {
		throw redirect(303, '/onboarding');
	}

	// Fetch roster entries for user
	const { data: rosterEntries } = await supabase
		.from('roster_entries')
		.select(
			`
            *,
            event:events(*)
        `
		)
		.eq('user_id', user.id)
		.gte('start_time', new Date().toISOString())
		.order('start_time', { ascending: true });

	// Combine user data
	const userData = {
		...user,
		...profile,
		rosterEntries: rosterEntries || []
	};

	// Check if profile is complete
	const profileComplete = !!(profile?.cid && profile?.rating);

	// Fetch upcoming events for the dashboard
	const { data: upcomingEvents } = await supabase
		.from('events')
		.select('*')
		.gte('start_time', new Date().toISOString())
		.eq('status', 'published')
		.order('start_time', { ascending: true })
		.limit(5);

	// Fetch VATSIM Public Data (Parallel)
	const [onlineControllers, metars] = await Promise.all([fetchOnlineControllers(), fetchMetars()]);

	return {
		user: userData,
		upcomingEvents: upcomingEvents || [],
		profileComplete,
		onlineControllers,
		metars
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals: { supabase, user } }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const data = await request.formData();
		const cid = data.get('cid') as string;
		const ratingId = parseInt(data.get('rating') as string);

		if (!cid || !ratingId) {
			return fail(400, { message: 'Missing CID or Rating' });
		}

		// Map rating ID to Short/Long
		const ratings: Record<number, { short: string; long: string }> = {
			1: { short: 'OBS', long: 'Observer' },
			2: { short: 'S1', long: 'Student 1' },
			3: { short: 'S2', long: 'Student 2' },
			4: { short: 'S3', long: 'Senior Student' },
			5: { short: 'C1', long: 'Controller 1' },
			7: { short: 'C3', long: 'Senior Controller' },
			8: { short: 'I1', long: 'Instructor 1' },
			10: { short: 'I3', long: 'Senior Instructor' },
			11: { short: 'SUP', long: 'Supervisor' },
			12: { short: 'ADM', long: 'Administrator' }
		};

		const ratingInfo = ratings[ratingId] || { short: 'UNK', long: 'Unknown' };

		const { error } = await supabase.from('profiles').upsert({
			id: user.id,
			email: user.email, // ensure email is kept
			cid,
			rating: ratingId,
			rating_short: ratingInfo.short,
			rating_long: ratingInfo.long,
			updated_at: new Date().toISOString()
		});

		if (error) {
			console.error('Update profile error:', error);
			return fail(500, { message: 'Failed to update profile' });
		}

		return { success: true };
	}
};
