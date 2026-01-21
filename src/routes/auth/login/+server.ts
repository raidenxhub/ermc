import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { supabase }, url }) => {
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');
	const next = url.searchParams.get('next') ?? '/dashboard';
	const redirectUrl =
		process.env.NODE_ENV === 'production'
			? `https://ermc.realkenan.dev/auth/callback?next=${encodeURIComponent(next)}`
			: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`;

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
