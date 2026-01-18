import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: any }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	/**
	 * Unlike `supabase.auth.getSession()`, which allows insecure access tokens,
	 * `supabase.auth.getUser()` validates the auth token on the server.
	 */
	const {
		data: { user }
	} = await event.locals.supabase.auth.getUser();

	event.locals.user = user;

	// Protected Routes
	if (event.url.pathname.startsWith('/dashboard')) {
		if (!event.locals.user) {
			throw redirect(303, '/auth/login');
		}

		// Enforce Onboarding
		if (event.locals.user) {
			const { data: profile } = await event.locals.supabase
				.from('profiles')
				.select('name, email, cid, rating, subdivision')
				.eq('id', event.locals.user.id)
				.single();

			if (!profile || !profile.name || !profile.email || !profile.cid || !profile.rating || !profile.subdivision) {
				throw redirect(303, '/onboarding');
			}
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
