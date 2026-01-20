import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { dev } from '$app/environment';
import { injectAnalytics } from '@vercel/analytics/sveltekit';
import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';

injectAnalytics({ mode: dev ? 'development' : 'production' });

export const load: LayoutLoad = async ({ depends, fetch, data }) => {
	/**
	 * Declare a dependency so the layout can be invalidated, for example, on
	 * session refresh.
	 */
	depends('supabase:auth');

	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
		return { ...data, supabase: null };
	}

	if (!browser) {
		return { ...data, supabase: null };
	}

	const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: { fetch }
	});

	return {
		...data,
		supabase
	};
};
