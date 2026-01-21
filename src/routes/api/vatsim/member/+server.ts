import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchVatsimMember, ratingToShortLong } from '$lib/server/vatsimMember';

export const GET: RequestHandler = async ({ url }) => {
	const cid = (url.searchParams.get('cid') || '').trim();
	if (!/^\d{4,10}$/.test(cid)) {
		return json({ ok: false, message: 'Invalid CID format.' }, { status: 400 });
	}

	try {
		const member = await fetchVatsimMember(cid);
		const ratingInfo = ratingToShortLong(Number(member.rating));
		const fullName =
			typeof (member as any).name === 'string' && (member as any).name.trim().length > 0
				? (member as any).name.trim()
				: [((member as any).name_first as string) || '', ((member as any).name_last as string) || ''].join(' ').trim() || null;
		return json({
			ok: true,
			member: {
				id: member.id,
				rating: member.rating,
				rating_short: ratingInfo.short,
				rating_long: ratingInfo.long,
				name: fullName,
				region_id: member.region_id ?? null,
				division_id: member.division_id ?? null,
				subdivision_id: member.subdivision_id ?? null,
				country: member.country ?? null,
				countystate: member.countystate ?? null,
				pilotrating: member.pilotrating ?? null
			}
		});
	} catch (e) {
		console.error('VATSIM member endpoint error:', e);
		return json({ ok: false, message: 'Unable to verify CID right now.' }, { status: 502 });
	}
};
