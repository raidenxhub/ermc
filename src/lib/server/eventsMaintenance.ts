import type { SupabaseClient } from '@supabase/supabase-js';

export async function cleanupExpiredCancelledEvents(admin: SupabaseClient) {
	const nowIso = new Date().toISOString();
	const fiveMinutesAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
	await admin.from('events').delete().in('status', ['published', 'cancelled']).lt('end_time', fiveMinutesAgoIso);
	await admin.from('events').delete().eq('status', 'cancelled').lte('delete_at', nowIso);
}
