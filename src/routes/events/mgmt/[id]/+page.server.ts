import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createAdminClient } from '$lib/server/supabaseAdmin';
import { sendEventCancelledEmail } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals: { supabase, user }, params }) => {
	if (!user) throw redirect(303, '/auth/login');
	if (!supabase) throw redirect(303, '/?error=Server%20configuration%20error');

	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
	const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';
	if (!isStaff) throw redirect(303, '/dashboard');

	const { data: event } = await supabase.from('events').select('*').eq('id', params.id).maybeSingle();
	if (!event) throw redirect(303, '/events/mgmt');

	return { event };
};

export const actions: Actions = {
	cancelEvent: async ({ request, locals: { supabase, user }, params }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';
		if (!isStaff) return fail(403, { message: 'Forbidden' });

		const formData = await request.formData();
		const confirmId = (formData.get('id') as string) || params.id;
		if (!confirmId) return fail(400, { message: 'Missing event ID' });

		const admin = createAdminClient();
		const now = Date.now();
		const cancelled_at = new Date(now).toISOString();
		const delete_at = new Date(now + 10 * 60 * 1000).toISOString();
		const res = await admin.from('events').update({ status: 'cancelled', cancelled_at, delete_at }).eq('id', confirmId);
		if (res.error?.code === 'PGRST204') {
			const res2 = await admin.from('events').update({ status: 'cancelled' }).eq('id', confirmId);
			if (res2.error) return fail(500, { message: 'Failed to cancel event' });
		} else if (res.error) {
			return fail(500, { message: 'Failed to cancel event' });
		}

		const { data: eventRow } = await admin.from('events').select('name,start_time,end_time').eq('id', confirmId).maybeSingle();
		const { data: rosterRows } = await admin
			.from('roster_entries')
			.select('user:profiles(email,name,discord_username)')
			.eq('event_id', confirmId)
			.not('user_id', 'is', null);
		const eventName = (eventRow?.name as string) || 'Event';
		const startTime = (eventRow?.start_time as string) || '';
		const endTime = (eventRow?.end_time as string) || '';
		for (const row of rosterRows || []) {
			const u = (row as any).user;
			const emailTo = typeof u?.email === 'string' ? u.email : '';
			if (!emailTo) continue;
			const nameForEmail = (u?.name as string) || (u?.discord_username as string) || null;
			void sendEventCancelledEmail({ to: emailTo, name: nameForEmail, eventName, startTime, endTime });
		}
		return { success: true };
	},

	deleteEvent: async ({ request, locals: { supabase, user }, params }) => {
		if (!user) return fail(401, { message: 'Unauthorized' });
		if (!supabase) return fail(500, { message: 'Server configuration error.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		const isStaff = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'coordinator';
		if (!isStaff) return fail(403, { message: 'Forbidden' });

		const formData = await request.formData();
		const confirmId = (formData.get('id') as string) || params.id;
		if (!confirmId) return fail(400, { message: 'Missing event ID' });

		const admin = createAdminClient();
		const { data: eventRow } = await admin.from('events').select('vatsim_id').eq('id', confirmId).maybeSingle();
		if (eventRow?.vatsim_id) {
			const sup = await admin.from('vatsim_event_suppressions').upsert({ vatsim_id: eventRow.vatsim_id }, { onConflict: 'vatsim_id' });
			if (sup.error?.code === 'PGRST404') {
				// table doesn't exist yet, ignore
			}
		}

		await admin.from('roster_entries').delete().eq('event_id', confirmId);
		const res = await admin.from('events').delete().eq('id', confirmId);
		if (res.error) return fail(500, { message: 'Failed to delete event' });
		return { success: true };
	}
};
