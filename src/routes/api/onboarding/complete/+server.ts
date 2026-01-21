import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env as privateEnv } from '$env/dynamic/private';
import { createAdminClient } from '$lib/server/supabaseAdmin';
import { fetchVatsimMember, ratingToShortLong } from '$lib/server/vatsimMember';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, supabase } = locals as { user: any; supabase: any };
	if (!user) return json({ ok: false, message: 'Unauthorized' }, { status: 401 });
	if (!supabase) return json({ ok: false, message: 'Server configuration error.' }, { status: 500 });

	const formData = await request.formData();
	const fullName = String(formData.get('full_name') || '').trim();
	const cid = String(formData.get('cid') || '').trim();
	const isStaff = formData.get('is_staff') === 'on';
	const position = isStaff ? String(formData.get('position') || '').trim() : '';
	const terms = formData.get('terms') === 'on';
	const accessKey = String(formData.get('access_key') || '').trim();

	if (!terms) return json({ ok: false, message: 'You must accept the Terms of Service, Privacy Policy, and Terms of Use.' }, { status: 400 });

	const expectedKey = String(privateEnv.ACCESS_KEY || '').trim();
	if (!expectedKey) return json({ ok: false, message: 'Server configuration error.' }, { status: 500 });
	if (!accessKey || accessKey !== expectedKey) return json({ ok: false, message: 'Invalid access key.' }, { status: 400 });

	if (!fullName || !cid) return json({ ok: false, message: 'Please fill in all required fields.' }, { status: 400 });
	if (!/^\d{4,10}$/.test(cid)) return json({ ok: false, message: 'CID must be 4–10 digits.' }, { status: 400 });
	if (isStaff && !position) return json({ ok: false, message: 'Please enter your staff position.' }, { status: 400 });

	let member: Awaited<ReturnType<typeof fetchVatsimMember>>;
	try {
		member = await fetchVatsimMember(cid);
	} catch {
		return json({ ok: false, message: 'Unable to verify your CID with VATSIM right now. Please try again shortly.' }, { status: 400 });
	}

	const vatsimSubdivisionId = member.subdivision_id != null ? String(member.subdivision_id).trim() : '';
	if (vatsimSubdivisionId.toUpperCase() !== 'KHLJ') {
		return json(
			{
				ok: false,
				message: `We do not currently offer our services to your VATSIM subdivision (${vatsimSubdivisionId || 'unknown'}). ERMC is only available for KHLJ at this time.`
			},
			{ status: 403 }
		);
	}

	const rating = Number(member.rating);
	if (!Number.isFinite(rating) || rating <= 0) return json({ ok: false, message: 'Unable to verify your VATSIM rating.' }, { status: 400 });
	if (rating === 1) return json({ ok: false, message: 'Observer (OBS) is not eligible to control. Please select S1 or higher.' }, { status: 400 });

	const ratingInfo = ratingToShortLong(rating);
	const nowIso = new Date().toISOString();

	const email = typeof user.email === 'string' && user.email.trim() ? user.email.trim() : null;

	const admin = createAdminClient();

	const { data: existingProfile } = await admin
		.from('profiles')
		.select('cid, rating, vatsim_subdivision_id, ermc_access_granted, name')
		.eq('id', user.id)
		.maybeSingle();

	if (existingProfile?.cid && existingProfile.cid !== cid) {
		return json({ ok: false, message: 'Your CID is locked. Contact support to change it.' }, { status: 403 });
	}
	if (existingProfile?.rating && Number(existingProfile.rating) !== rating) {
		return json({ ok: false, message: 'Your VATSIM rating is locked. Contact support to change it.' }, { status: 403 });
	}
	if (existingProfile?.vatsim_subdivision_id && String(existingProfile.vatsim_subdivision_id).toUpperCase() !== 'KHLJ') {
		return json({ ok: false, message: 'Your VATSIM subdivision is locked. Contact support to change it.' }, { status: 403 });
	}

	const payload: Record<string, unknown> = {
		id: user.id,
		email,
		name: fullName,
		subdivision: 'Khaleej vACC',
		role: isStaff ? 'staff' : 'guest',
		position: isStaff ? position : null,
		updated_at: nowIso,
		ermc_access_granted: true,
		ermc_access_verified_at: nowIso
	};

	if (!existingProfile?.cid) {
		payload.cid = cid;
		payload.rating = rating;
		payload.rating_short = ratingInfo.short;
		payload.rating_long = ratingInfo.long;
		payload.vatsim_region_id = member.region_id != null ? String(member.region_id) : null;
		payload.vatsim_division_id = member.division_id != null ? String(member.division_id) : null;
		payload.vatsim_subdivision_id = member.subdivision_id != null ? String(member.subdivision_id) : null;
		payload.vatsim_country = member.country ?? null;
		payload.vatsim_countystate = member.countystate ?? null;
		payload.vatsim_pilotrating = member.pilotrating != null ? String(member.pilotrating) : null;
	}

	const { error } = await admin.from('profiles').upsert(payload, { onConflict: 'id' });
	if (error) {
		if ((error as any)?.code === '23505' && String((error as any)?.message || '').toLowerCase().includes('cid')) {
			return json({ ok: false, message: 'This CID is already registered to another user.' }, { status: 409 });
		}
		return json({ ok: false, message: 'Registration failed. Please try again.' }, { status: 500 });
	}

	return json({ ok: true, redirectTo: '/dashboard' });
};
