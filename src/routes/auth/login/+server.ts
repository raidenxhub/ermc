import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env as privateEnv } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ locals: { supabase }, url, cookies }) => {
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');
	const sanitizeNext = (value: string | null) => {
		if (!value) return '/dashboard';
		if (!value.startsWith('/')) return '/dashboard';
		return value;
	};
	const next = sanitizeNext(url.searchParams.get('next'));

	const normalizeOrigin = (value: string) => {
		const trimmed = value.trim().replace(/\/+$/, '');
		if (/^https?:\/\//i.test(trimmed)) return trimmed;
		return `https://${trimmed}`;
	};
	const resolveOrigin = () => {
		const candidates = [privateEnv.PUBLIC_SITE_URL, privateEnv.SITE_URL, privateEnv.VERCEL_URL ? `https://${privateEnv.VERCEL_URL}` : null];
		for (const c of candidates) {
			if (typeof c === 'string' && c.trim().length > 0) return normalizeOrigin(c);
		}
		if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
			return `https://${url.host}`;
		}
		return url.origin;
	};
	const origin = resolveOrigin();

	cookies.set('oauth_next', next, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: origin.startsWith('https://'),
		maxAge: 60 * 10
	});
	const redirectUrl = `${origin}/auth/callback`;

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'discord',
		options: {
			redirectTo: redirectUrl,
			scopes: 'identify email guilds'
		}
	});

	if (error) {
		console.error(error);
		throw redirect(303, '/');
	}

	if (data.url) {
		throw redirect(303, data.url);
	}

	throw redirect(303, '/');
};
