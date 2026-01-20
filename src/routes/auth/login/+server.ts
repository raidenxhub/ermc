import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { supabase }, url }) => {
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');
	const redirectUrl = process.env.NODE_ENV === 'production' ? 'https://ermc.realkenan.dev/auth/callback' : `${url.origin}/auth/callback`;

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
