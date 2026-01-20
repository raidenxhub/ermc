import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ depends, fetch }) => {
	/**
	 * Declare a dependency so the layout can be invalidated, for example, on
	 * session refresh.
	 */
	depends('supabase:auth');

	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
		return { supabase: null, session: null, user: null };
	}

	const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: { fetch }
	});

	/**
	 * It's fine to use `getSession` here, because on the client, `getSession` is
	 * safe, and on the server, it reads `session` from the `LayoutData`, which
	 * safely checked the session using `safeGetSession`.
	 */
	const {
		data: { session }
	} = await supabase.auth.getSession();

	const {
		data: { user }
	} = await supabase.auth.getUser();

	let mergedUser = user;
	if (user) {
		try {
			const { data: profile, error } = await supabase
				.from('profiles')
				.select('name, cid, role, avatar_url, discord_username, rating, rating_short, subdivision')
				.eq('id', user.id)
				.maybeSingle();
			if (!error && profile) mergedUser = { ...user, ...profile };
		} catch (e) {
			void e;
		}
	}

	return {
		supabase,
		session,
		user: mergedUser
	};
};
