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
                // Check if profile exists
                // We don't check for specific fields here anymore to prevent loops if data is partial
                // Only redirect if NO profile exists at all
                const { data: profile, error } = await event.locals.supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', event.locals.user.id)
                    .single();

                if (error || !profile) {
                    // Only redirect if no profile found
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
