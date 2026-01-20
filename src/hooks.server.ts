import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				try {
					cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: any }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				} catch {
					// safe to ignore
				}
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

    // Fix 500 Error: Handle unhandled promise rejections or database errors globally if needed,
    // but the main issue is likely the auth check failing or the DB call in protected routes.
    // Let's make sure the profile check doesn't crash if DB is down or returns error.

	// Protected Routes
	if (event.url.pathname.startsWith('/dashboard')) {
		if (!event.locals.user) {
			throw redirect(303, '/auth/login');
		}

		// Enforce Onboarding
		if (event.locals.user) {
            try {
                const { data: profile, error } = await event.locals.supabase
                    .from('profiles')
                    .select('name, email, cid, rating, subdivision')
                    .eq('id', event.locals.user.id)
                    .single();

                if (error) {
                    console.error('Profile fetch error in hooks:', error);
                    // If DB error, don't crash, just let them through or redirect to error page?
                    // Safe bet: if we can't verify profile, maybe just let them load dashboard 
                    // but they might see empty data. Better than 500.
                } else if (!profile || !profile.name || !profile.email || !profile.cid || !profile.rating || !profile.subdivision) {
                    throw redirect(303, '/onboarding');
                }
            } catch (e) {
                // If this throws (e.g. redirect), rethrow it.
                if ((e as any)?.status === 303) throw e;
                console.error('Unexpected error in hooks profile check:', e);
            }
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
