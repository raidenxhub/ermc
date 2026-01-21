import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createAdminClient } from '$lib/server/supabaseAdmin';
import { syncEvents } from '$lib/server/vatsim';
import { cleanupExpiredCancelledEvents } from '$lib/server/eventsMaintenance';

let vatsimPollerStarted = false;

const startVatsimPoller = () => {
	if (vatsimPollerStarted) return;
	if (privateEnv.VATSIM_POLL_ENABLED === 'false') return;

	let intervalMs = Number(privateEnv.VATSIM_POLL_INTERVAL_MS || '30000');
	if (!Number.isFinite(intervalMs) || intervalMs < 5000) intervalMs = 30000;

	vatsimPollerStarted = true;

	const tick = async () => {
		try {
			const admin = createAdminClient();
			await cleanupExpiredCancelledEvents(admin);
			await syncEvents(admin);
		} catch (e) {
			console.error('VATSIM poller tick failed:', e);
		}
	};

	void tick();
	setInterval(() => void tick(), intervalMs);
};

export const handle: Handle = async ({ event, resolve }) => {
	startVatsimPoller();

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
		let supabaseUrl = (env.PUBLIC_SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
		if (supabaseUrl && !supabaseUrl.startsWith('http')) {
			supabaseUrl = `https://${supabaseUrl}`;
		}
		const supabaseAnonKey = (env.PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');

		event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
		// If client creation failed, we can't continue with anything that needs DB
		// Just let resolve handle it, filtering headers.
		// Protected routes will fail auth check (user=null) and redirect to login.
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
		if (event.locals.supabase) {
			const {
				data: { user }
			} = await event.locals.supabase.auth.getUser();

			event.locals.user = user;
		} else {
			event.locals.user = null;
		}
	} catch (error) {
		console.error('Auth getUser error:', error);
		event.locals.user = null;
	}

	// Fix 500 Error: Handle unhandled promise rejections or database errors globally if needed,
	// but the main issue is likely the auth check failing or the DB call in protected routes.
	// Let's make sure the profile check doesn't crash if DB is down or returns error.

	// Protected Routes
	const requiresAuth =
		event.url.pathname.startsWith('/dashboard') ||
		event.url.pathname.startsWith('/rostering') ||
		event.url.pathname.startsWith('/events') ||
		event.url.pathname.startsWith('/coordination') ||
		event.url.pathname.startsWith('/settings') ||
		event.url.pathname.startsWith('/statistics') ||
		event.url.pathname.startsWith('/access-key');

	const pathname = event.url.pathname;
	const isApi = pathname.startsWith('/api/');
	const isAuthRoute = pathname.startsWith('/auth/');
	const isOnboardingRoute = pathname.startsWith('/onboarding');
	const isAccessKeyRoute = pathname.startsWith('/access-key');
	const isConsentRoute = pathname.startsWith('/oauth/consent');
	const isStaticAsset =
		pathname.startsWith('/_app/') || pathname.startsWith('/favicon') || pathname.startsWith('/static/') || /\.[a-z0-9]+$/i.test(pathname);

	const allowWhileOnboarding = isApi || isStaticAsset || isAuthRoute || isConsentRoute || isOnboardingRoute;
	const onboardingRedirect = () => {
		const next = encodeURIComponent(event.url.pathname + event.url.search);
		return `/onboarding?next=${next}`;
	};

	if (event.locals.user && !isApi && !isAuthRoute) {
		try {
			const { data: profile, error } = await event.locals.supabase!.from('profiles').select('id').eq('id', event.locals.user.id).maybeSingle();

			if (!error && !profile) {
				try {
					// Guard this call to prevent crashing if env vars are bad
					try {
						const admin = createAdminClient();
						const email = typeof event.locals.user.email === 'string' ? event.locals.user.email : null;
						const fullName =
							typeof (event.locals.user as any)?.user_metadata?.full_name === 'string'
								? String((event.locals.user as any).user_metadata.full_name)
								: typeof (event.locals.user as any)?.user_metadata?.name === 'string'
									? String((event.locals.user as any).user_metadata.name)
									: null;
						await admin.from('profiles').upsert({ id: event.locals.user.id, email, name: fullName }, { onConflict: 'id' });
					} catch (adminError) {
						console.error('Failed to init admin client or create profile (check env vars):', adminError);
					}
				} catch (e) {
					console.error('Failed to auto-create missing profile row:', e);
				}
			}
		} catch (e) {
			if ((e as { status?: number })?.status === 303) throw e;
		}
	}

	if (requiresAuth) {
		if (!event.locals.user) {
			throw redirect(303, '/auth/login');
		}

		if (isAccessKeyRoute) {
			throw redirect(303, onboardingRedirect());
		}

		// Enforce Onboarding
		if (event.locals.user) {
			try {
				// Check if profile exists
				// We don't check for specific fields here anymore to prevent loops if data is partial
				// Only redirect if NO profile exists at all
				const { data: profile, error } = await event.locals
					.supabase!.from('profiles')
					.select('id, ermc_access_granted')
					.eq('id', event.locals.user.id)
					.single();

				if (error) {
					console.error('Profile check error:', error);
					// Don't redirect on database errors - let user proceed
					// This prevents 500 errors when DB is down
				} else if (!profile) {
					// Only redirect if no profile found
					throw redirect(303, onboardingRedirect());
				} else if (!profile.ermc_access_granted && event.url.pathname !== '/onboarding') {
					throw redirect(303, onboardingRedirect());
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

	if (event.locals.user && !isApi) {
		try {
			const { data: profile, error } = await event.locals
				.supabase!.from('profiles')
				.select('id, ermc_access_granted, cid, rating, name')
				.eq('id', event.locals.user.id)
				.maybeSingle();

			if (!error && profile) {
				const onboardingComplete = !!(profile.ermc_access_granted && profile.cid && profile.rating && profile.name);
				const onboardingIncomplete = !onboardingComplete;

				if (onboardingIncomplete && requiresAuth && !allowWhileOnboarding) {
					throw redirect(303, onboardingRedirect());
				}

				if (onboardingComplete && isOnboardingRoute) {
					throw redirect(303, '/dashboard');
				}

				if (isAccessKeyRoute) throw redirect(303, onboardingRedirect());

				if (isAuthRoute && pathname !== '/auth/logout' && pathname !== '/auth/login') {
					throw redirect(303, onboardingIncomplete ? onboardingRedirect() : '/dashboard');
				}
			} else if (!profile && requiresAuth && !allowWhileOnboarding) {
				throw redirect(303, onboardingRedirect());
			}
		} catch (e) {
			if ((e as { status?: number })?.status === 303) throw e;
		}
	}

	try {
		return await resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range' || name === 'x-supabase-api-version';
			}
		});
	} catch (e) {
		const maybeRedirect = e as { status?: number; location?: string };
		if (maybeRedirect?.status && maybeRedirect.status >= 300 && maybeRedirect.status < 400 && maybeRedirect.location) {
			throw e;
		}

		console.error('Unhandled request error:', e);

        // If it's a form action or API call, we should try to return a format the client can parse,
        // or just let SvelteKit's default error page handle it (which will be a 500 HTML).
        // Returning a plain text Response here intercepts SvelteKit's error handling and confuses use:enhance.
        
		if (event.url.pathname !== '/' && !event.request.headers.get('accept')?.includes('application/json')) {
            // Only force redirect for page visits, not API/form submissions
            if (event.request.method === 'GET') {
			    throw redirect(303, `/?error=${encodeURIComponent('Something went wrong. Please try again.')}`);
            }
		}

        // Re-throw so SvelteKit renders the error page or returns JSON error
        throw e;
	}
};
