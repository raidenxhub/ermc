import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export const handle: Handle = async ({ event, resolve }) => {
	if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) {
		event.locals.supabase = null;
		event.locals.user = null;
		return resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range' || name === 'x-supabase-api-version';
			}
		});
	}

	try {
		event.locals.supabase = createServerClient(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!, {
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					try {
						cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: Record<string, unknown> }) => {
							event.cookies.set(name, value, { ...options, path: '/' });
						});
					} catch {
						// safe to ignore
					}
				}
			}
		});
	} catch (error) {
		console.error('Failed to create Supabase client:', error);
		event.locals.supabase = null;
		event.locals.user = null;
		return resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range' || name === 'x-supabase-api-version';
			}
		});
	}

	/**
	 * Unlike `supabase.auth.getSession()`, which allows insecure access tokens,
	 * `supabase.auth.getUser()` validates the auth token on the server.
	 */
	try {
		const {
			data: { user }
		} = await event.locals.supabase!.auth.getUser();

		event.locals.user = user;
	} catch (error) {
		console.error('Auth getUser error:', error);
		event.locals.user = null;
	}

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
                const { data: profile, error } = await event.locals.supabase!
                    .from('profiles')
                    .select('id')
                    .eq('id', event.locals.user.id)
                    .single();

                if (error) {
                    console.error('Profile check error:', error);
                    // Don't redirect on database errors - let user proceed
                    // This prevents 500 errors when DB is down
                } else if (!profile) {
                    // Only redirect if no profile found
                     throw redirect(303, '/onboarding');
                }
            } catch (e) {
                // If this throws (e.g. redirect), rethrow it.
                if ((e as { status?: number })?.status === 303) throw e;
                console.error('Unexpected error in hooks profile check:', e);
                // Don't let the hook crash - continue to the page
                // This prevents 500 errors when DB is down or profile check fails
            }
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
