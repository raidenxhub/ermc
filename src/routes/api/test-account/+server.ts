import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createAdminClient } from '$lib/server/supabaseAdmin';

export const POST: RequestHandler = async ({ locals }) => {
	const { user, supabase } = locals as { user: any; supabase: any };
	if (!user) return json({ ok: false, message: 'Unauthorized' }, { status: 401 });
	if (!supabase) return json({ ok: false, message: 'Server configuration error.' }, { status: 500 });

	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
	const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';
	if (!isStaff) return json({ ok: false, message: 'Forbidden' }, { status: 403 });

	const admin = createAdminClient();
	const email = 'ermc@realkenan.dev';

	let targetUserId: string | null = null;
	try {
		const { data: existingProfile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
		if (existingProfile?.id) {
			targetUserId = existingProfile.id as string;
		}
	} catch {
		// ignore
	}

	if (!targetUserId) {
		try {
			const res = await admin.auth.admin.createUser({
				email,
				password: `TEST_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`,
				email_confirm: true,
				user_metadata: {
					user_name: 'ERMC_VATSIM_TEST_1'
				}
			});
			if (res.error) {
				// If the user already exists, try to find the id via profiles again
				const { data: existingProfile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
				if (existingProfile?.id) {
					targetUserId = existingProfile.id as string;
				} else {
					return json({ ok: false, message: 'Failed to create test auth user.' }, { status: 500 });
				}
			} else if (res.data?.user?.id) {
				targetUserId = res.data.user.id as string;
			}
		} catch (_e) {
			return json({ ok: false, message: 'Failed to create test auth user.' }, { status: 500 });
		}
	}

	if (!targetUserId) {
		return json({ ok: false, message: 'Failed to resolve test user ID.' }, { status: 500 });
	}

	const nowIso = new Date().toISOString();
	const upsert = await admin
		.from('profiles')
		.upsert(
			{
				id: targetUserId,
				name: 'ERMC VATSIM TEST #1',
				email,
				cid: '000000',
				avatar_url: null,
				discord_username: 'TESTTEST',
				rating: 5,
				rating_short: 'C3',
				rating_long: 'Senior Controller',
				subdivision: 'Khaleej vACC',
				role: 'guest',
				ermc_access_granted: true,
				ermc_access_verified_at: nowIso,
				updated_at: nowIso
			},
			{ onConflict: 'id' }
		);

	if (upsert.error) {
		return json({ ok: false, message: 'Failed to upsert test profile.' }, { status: 500 });
	}

	return json({ ok: true, user_id: targetUserId });
};
