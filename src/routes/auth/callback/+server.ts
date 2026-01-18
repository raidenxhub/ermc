import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/dashboard';

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const {
				data: { user }
			} = await supabase.auth.getUser();

			// Verify Discord guild membership 
			if (session?.provider_token) {
				const resp = await fetch('https://discord.com/api/users/@me/guilds', {
					headers: { Authorization: `Bearer ${session.provider_token}` }
				});
				if (resp.ok) {
					const guilds: Array<{ id: string }> = await resp.json();
					const guildId = privateEnv.DISCORD_GUILD_ID;
					const member = guildId ? guilds.some((g) => g.id === guildId) : false;
					if (!member) {
						await supabase.auth.signOut();
						const msg =
							'Verify you are logged into the correct Discord account when attempting to login to the ERMC network. You were not detected in the Khaleej vACC Discord server.';
						throw redirect(303, `/?error=${encodeURIComponent(msg)}`);
					}
				}
			}

			// Upsert profile using service role with Discord data
			if (user) {
				const serviceRole = privateEnv.SUPABASE_SECRET_KEY;
				if (!serviceRole) {
					console.error('Missing SUPABASE_SECRET_KEY');
					throw redirect(303, '/');
				}
				const admin = createClient(publicEnv.PUBLIC_SUPABASE_URL!, serviceRole);
				const name =
					user.user_metadata?.name ||
					user.user_metadata?.full_name ||
					user.user_metadata?.user_name ||
					user.user_metadata?.preferred_username ||
					user.user_metadata?.custom_claims?.name ||
					user.user_metadata?.raw_user_meta_data?.name;
				const email = user.email || user.user_metadata?.email;
                const avatar_url = user.user_metadata?.avatar_url || user.user_metadata?.picture;
                const discord_username = user.user_metadata?.user_name || user.user_metadata?.custom_claims?.global_name;

				await admin.from('profiles').upsert({
					id: user.id,
					name, // This might be null if not found, but we handle that in onboarding check
					email,
                    avatar_url,
                    discord_username,
					updated_at: new Date().toISOString()
				});

				// Determine if onboarding is needed; here we use presence of name/email only
				const { data: profile } = await admin.from('profiles').select('name, email, rating').eq('id', user.id).single();

				if (!profile || !profile.name || !profile.email) {
					throw redirect(303, '/onboarding');
				}
			}

			throw redirect(303, next);
		}
	}

	// Return the user to an error page with instructions
	throw redirect(303, '/');
};
