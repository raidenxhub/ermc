import { createBrowserClient, createServerClient, parseCookieHeader } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import type { SupabaseClient } from '@supabase/supabase-js';

// Client-side singleton
let supabaseBrowserClient: SupabaseClient | undefined;

export const createSupabaseLoadClient = (fetch: typeof globalThis.fetch, cookies: string | undefined) => {
	return createServerClient(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!, {
		global: { fetch },
		cookies: {
			getAll: () => {
				const parsed = parseCookieHeader(cookies || '');
				return parsed
					.filter((c: { name: string; value?: string }) => typeof c.value === 'string')
					.map((c: { name: string; value?: string }) => ({ name: c.name, value: c.value as string }));
			},
			setAll: () => {} // handled by browser
		}
	});
};

export const getSupabaseBrowserClient = () => {
	if (supabaseBrowserClient) return supabaseBrowserClient;

	supabaseBrowserClient = createBrowserClient(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!);
	return supabaseBrowserClient;
};
