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
		const nameFirst = typeof (member as any).name_first === 'string' ? (member as any).name_first.trim() : '';
		const nameLast = typeof (member as any).name_last === 'string' ? (member as any).name_last.trim() : '';
		const nameFull = [nameFirst, nameLast].filter(Boolean).join(' ').trim();
		const nameFallback = typeof (member as any).name === 'string' ? (member as any).name.trim() : '';
		const fullName = nameFull || nameFallback || null;
		const subdivisionId = member.subdivision_id != null ? String(member.subdivision_id).trim() : '';
		if (subdivisionId.toUpperCase() !== 'KHLJ') {
			return json(
				{
					ok: false,
					message: `We do not currently offer our services to your VATSIM subdivision (${subdivisionId || 'unknown'}). ERMC is only available for KHLJ at this time.`,
					subdivision_id: subdivisionId || null
				},
				{ status: 403 }
			);
		}
		return json({
			ok: true,
			member: {
				id: member.id,
				rating: member.rating,
				rating_short: ratingInfo.short,
				rating_long: ratingInfo.long,
				name_first: nameFirst || null,
				name_last: nameLast || null,
				name: fullName,
				region_id: member.region_id ?? null,
				division_id: member.division_id ?? null,
				subdivision_id: subdivisionId || null,
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
