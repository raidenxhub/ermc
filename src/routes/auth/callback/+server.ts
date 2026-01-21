import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '$lib/server/email';

export const GET: RequestHandler = async ({ url, locals: { supabase }, cookies }) => {
	const code = url.searchParams.get('code');
	const sanitizeNext = (value: string | null | undefined) => {
		if (!value) return '/dashboard';
		if (!value.startsWith('/')) return '/dashboard';
		return value;
	};
	const nextFromCookie = cookies.get('oauth_next');
	const next = sanitizeNext(url.searchParams.get('next') ?? nextFromCookie);
	if (nextFromCookie) {
		cookies.delete('oauth_next', { path: '/' });
	}
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

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
				const serviceRole = privateEnv.SUPABASE_SERVICE_ROLE;
				if (!serviceRole) {
					console.error('Missing SUPABASE_SERVICE_ROLE');
					throw redirect(303, '/');
				}
				const supabaseUrl = privateEnv.PUBLIC_SUPABASE_URL || publicEnv.PUBLIC_SUPABASE_URL;
				if (!supabaseUrl) {
					console.error('Missing PUBLIC_SUPABASE_URL');
					throw redirect(303, '/');
				}
				const admin = createClient(supabaseUrl, serviceRole);
				const rawEmail = user.email || user.user_metadata?.email;
				const email = typeof rawEmail === 'string' && rawEmail.trim().length > 0 ? rawEmail.trim() : null;
				const avatar_url = user.user_metadata?.avatar_url || user.user_metadata?.picture;
				const discord_username =
					user.user_metadata?.user_name || user.user_metadata?.full_name || user.user_metadata?.custom_claims?.global_name;

				// Check if profile exists first to avoid overwriting Full Name with Discord Name
				const { data: existingProfile } = await admin.from('profiles').select('*').eq('id', user.id).single();

				if (existingProfile) {
					// Update only technical fields, preserving the user's manually entered Full Name and CID
					await admin
						.from('profiles')
						.update({
							email: email ?? (existingProfile as any).email ?? null,
							avatar_url,
							discord_username,
							updated_at: new Date().toISOString()
						})
						.eq('id', user.id);
				} else {
					// New user: Insert basic info, leave Name/CID null to trigger onboarding
					await admin.from('profiles').insert({
						id: user.id,
						email,
						avatar_url,
						discord_username,
						updated_at: new Date().toISOString()
						// name and cid are intentionally omitted so they are NULL, triggering onboarding
					});
					if (typeof email === 'string' && email.trim().length > 0) {
						void sendWelcomeEmail({ to: email, name: (discord_username as string) || null });
					}
				}

				// Continue to consent screen (it will redirect to onboarding/dashboard as needed)
			}

			throw redirect(303, `/oauth/consent?next=${encodeURIComponent(next)}`);
		}
	}

	// Return the user to an error page with instructions
	throw redirect(303, '/');
};
