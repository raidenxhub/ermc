import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export function createAdminClient() {
	const serviceRole = privateEnv.SUPABASE_SECRET_KEY;
	if (!serviceRole) throw new Error('Missing SUPABASE_SECRET_KEY');

	const supabaseUrl = privateEnv.PUBLIC_SUPABASE_URL || publicEnv.PUBLIC_SUPABASE_URL;
	if (!supabaseUrl) throw new Error('Missing PUBLIC_SUPABASE_URL');

	return createClient(supabaseUrl, serviceRole, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	});
}
