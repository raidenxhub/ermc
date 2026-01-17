import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { supabase }, url }) => {
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'discord',
		options: {
			redirectTo: `${url.origin}/auth/callback`,
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
