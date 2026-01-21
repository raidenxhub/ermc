import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminClient } from '$lib/server/supabaseAdmin';

export const POST: RequestHandler = async ({ locals: { user, supabase } }) => {
	if (!user) return json({ ok: false, message: 'Unauthorized' }, { status: 401 });
	if (!supabase) return json({ ok: false, message: 'Server configuration error.' }, { status: 500 });

	const admin = createAdminClient();

	try {
		await admin.from('profiles').delete().eq('id', user.id);
	} catch {
		// ignore
	}

	try {
		const { error } = await admin.auth.admin.deleteUser(user.id);
		if (error) {
			const message = String((error as any)?.message || '');
			if (!message.toLowerCase().includes('not found')) {
				return json({ ok: false, message: 'Cancellation failed. Please try again.' }, { status: 500 });
			}
		}
	} catch (e) {
		const message = String((e as any)?.message || e || '');
		if (!message.toLowerCase().includes('not found')) {
			return json({ ok: false, message: 'Cancellation failed. Please try again.' }, { status: 500 });
		}
	}

	try {
		await supabase.auth.signOut();
	} catch {
		// ignore
	}

	return json({ ok: true, redirectTo: '/?cancelled=1' });
};

