import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env as privateEnv } from '$env/dynamic/private';

const allowedReasons = new Set(['Just browsing', 'Access key issues', 'CID verification issues', 'Privacy concerns']);
const allowedHelp = new Set(['Clearer onboarding', 'Remove access key', 'Support more subdivisions', 'Nothing']);
const allowedCid = new Set(['Worked', 'Slow', 'Failed', 'N/A']);
const allowedReturn = new Set(['Yes', 'Maybe', 'No']);

export const POST: RequestHandler = async ({ request }) => {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, message: 'Invalid request.' }, { status: 400 });
	}

	const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
	const help = typeof body?.help === 'string' ? body.help.trim() : '';
	const cidExperience = typeof body?.cidExperience === 'string' ? body.cidExperience.trim() : '';
	const returnLikelihood = typeof body?.returnLikelihood === 'string' ? body.returnLikelihood.trim() : '';

	if (!allowedReasons.has(reason) || !allowedHelp.has(help) || !allowedCid.has(cidExperience) || !allowedReturn.has(returnLikelihood)) {
		return json({ ok: false, message: 'Invalid feedback values.' }, { status: 400 });
	}

	const webhookUrl = privateEnv.CONTACT_DISCORD_WEBHOOK_URL;
	if (!webhookUrl) return json({ ok: true });

	try {
		const res = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				embeds: [
					{
						title: 'Cancellation feedback',
						color: 15158332,
						fields: [
							{ name: 'Why cancelling', value: reason, inline: false },
							{ name: 'What would help', value: help, inline: false },
							{ name: 'CID verification', value: cidExperience, inline: false },
							{ name: 'Try again later', value: returnLikelihood, inline: false }
						],
						footer: { text: 'ERMC' },
						timestamp: new Date().toISOString()
					}
				]
			})
		});
		if (!res.ok) return json({ ok: true });
	} catch {
		return json({ ok: true });
	}

	return json({ ok: true });
};
