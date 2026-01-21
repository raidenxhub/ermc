import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export function createAdminClient() {
	const serviceRole = privateEnv.SUPABASE_SERVICE_ROLE;
	if (!serviceRole) throw new Error('Missing SUPABASE_SERVICE_ROLE');

	const supabaseUrl = privateEnv.PUBLIC_SUPABASE_URL || publicEnv.PUBLIC_SUPABASE_URL;
	if (!supabaseUrl) throw new Error('Missing PUBLIC_SUPABASE_URL');

	return createClient(supabaseUrl, serviceRole, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	});
}

export function createSecretClient() {
	const secretKey = privateEnv.SUPABASE_SECRET_KEY;
	if (!secretKey) throw new Error('Missing SUPABASE_SECRET_KEY');

	const supabaseUrl = privateEnv.PUBLIC_SUPABASE_URL || publicEnv.PUBLIC_SUPABASE_URL;
	if (!supabaseUrl) throw new Error('Missing PUBLIC_SUPABASE_URL');

	return createClient(supabaseUrl, secretKey, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	});
}
