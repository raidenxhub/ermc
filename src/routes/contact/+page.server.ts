import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const subject = formData.get('subject') as string;
		let message = formData.get('message') as string;

		// Partnership additional fields
		const subdivision = formData.get('subdivision') as string;
		const position = formData.get('position') as string;
		const website = formData.get('website') as string;
		const discord = formData.get('discord') as string;

		if (!name || !email || !subject || !message) {
			return fail(400, { error: 'All fields are required' });
		}

		if (subject === 'Partnership') {
			if (!subdivision || !position || !website || !discord) {
				return fail(400, { error: 'All partnership fields are required' });
			}
			message = `[Partnership Proposal]\n\n**Subdivision/vACC:** ${subdivision}\n**Position:** ${position}\n**Website:** ${website}\n**Discord:** ${discord}\n\n**Message:**\n${message}`;
		}

		// Use service role to insert since we might not have a logged in user (RLS allows anon insert anyway but let's be safe)
		// Actually, my RLS allows "Anyone" to insert, so anon key is fine.
		// But let's use the provided locals logic if available or just create a new client.
		// Since this page might be accessed by non-logged in users, we can't rely on locals.supabase (which might be tied to session).
		// Standard client is fine.

		const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
		const supabaseAnonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;
		if (!supabaseUrl || !supabaseAnonKey) {
			return fail(500, { error: 'Server configuration error. Please try again later.' });
		}
		const supabase = createClient(supabaseUrl, supabaseAnonKey);

		const { error } = await supabase.from('contact_requests').insert({
			name,
			email,
			subject,
			message
		});

		if (error) {
			console.error('Contact form error:', error);
			return fail(500, { error: 'Failed to send message. Please try again later.' });
		}

		const webhookUrl = privateEnv.CONTACT_DISCORD_WEBHOOK_URL;
		if (!webhookUrl) {
			console.error('Missing CONTACT_DISCORD_WEBHOOK_URL');
			return fail(500, { error: 'Contact system is not configured. Please try again later.' });
		}

		try {
			const res = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					embeds: [
						{
							title: 'New Contact Request',
							color: 3447003,
							fields: [
								{ name: 'Name', value: name, inline: true },
								{ name: 'Email', value: email, inline: true },
								{ name: 'Subject', value: subject },
								{ name: 'Message', value: message.length > 1024 ? message.substring(0, 1021) + '...' : message }
							],
							footer: { text: 'ERMC Contact System' },
							timestamp: new Date().toISOString()
						}
					]
				})
			});

			if (!res.ok) {
				const text = await res.text().catch(() => '');
				console.error('Discord webhook failed:', res.status, text.slice(0, 300));
				return fail(500, { error: 'Failed to send message notification. Please try again later.' });
			}
		} catch (err) {
			console.error('Discord webhook error:', err);
			return fail(500, { error: 'Failed to send message notification. Please try again later.' });
		}

		return { success: true };
	}
};
