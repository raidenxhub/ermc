import { env } from '$env/dynamic/private';
import { z } from 'zod';

const memberSchema = z.object({
	id: z.number(),
	rating: z.number(),
	country: z.string().nullable().optional(),
	countystate: z.string().nullable().optional(),
	region_id: z.union([z.string(), z.number()]).optional(),
	division_id: z.union([z.string(), z.number()]).optional(),
	subdivision_id: z.union([z.string(), z.number()]).optional()
});

export type VatsimMember = z.infer<typeof memberSchema>;

export async function fetchVatsimMember(cid: string): Promise<VatsimMember> {
	const apiKeyRaw = env.VATSIM_API_KEY;
	const apiKey = typeof apiKeyRaw === 'string' ? apiKeyRaw.trim() : '';
	if (!apiKey) throw new Error('Missing VATSIM_API_KEY');

	const id = cid.trim();
	if (!/^\d{4,10}$/.test(id)) throw new Error('Invalid CID');

	const res = await fetch(`https://api.vatsim.net/v2/members/${encodeURIComponent(id)}`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'X-API-Key': apiKey
		}
	});

	if (!res.ok) {
		const hint = res.status === 404 ? 'Member not found' : `VATSIM API error (${res.status})`;
		throw new Error(hint);
	}

	const json = await res.json();
	return memberSchema.parse(json);
}

export function ratingToShortLong(rating: number) {
	const map: Record<number, { short: string; long: string }> = {
		2: { short: 'S1', long: 'Student 1' },
		3: { short: 'S2', long: 'Student 2' },
		4: { short: 'S3', long: 'Senior Student' },
		5: { short: 'C1', long: 'Controller 1' },
		7: { short: 'C3', long: 'Senior Controller' },
		8: { short: 'I1', long: 'Instructor 1' },
		10: { short: 'I3', long: 'Senior Instructor' },
		11: { short: 'SUP', long: 'Supervisor' },
		12: { short: 'ADM', long: 'Administrator' }
	};
	return map[rating] || { short: 'UNK', long: 'Unknown' };
}
