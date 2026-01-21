import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export function createAdminClient() {
	// Sanitize keys to remove accidental quotes or whitespace
	const serviceRole = privateEnv.SUPABASE_SERVICE_ROLE?.trim()?.replace(/^["']|["']$/g, '');
	if (!serviceRole) {
		console.error('[createAdminClient] Missing SUPABASE_SERVICE_ROLE env var');
		throw new Error('Missing SUPABASE_SERVICE_ROLE');
	}

	const supabaseUrl = (privateEnv.PUBLIC_SUPABASE_URL || publicEnv.PUBLIC_SUPABASE_URL)?.trim()?.replace(/^["']|["']$/g, '');
	if (!supabaseUrl) {
		console.error('[createAdminClient] Missing PUBLIC_SUPABASE_URL env var');
		throw new Error('Missing PUBLIC_SUPABASE_URL');
	}

	try {
		return createClient(supabaseUrl, serviceRole, {
			auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
		});
	} catch (e) {
		console.error('[createAdminClient] createClient failed (check key format):', e);
		throw e;
	}
}

export function createSecretClient() {
	// Sanitize keys
	const secretKey = privateEnv.SUPABASE_SECRET_KEY?.trim()?.replace(/^["']|["']$/g, '');
	if (!secretKey) throw new Error('Missing SUPABASE_SECRET_KEY');

	const supabaseUrl = (privateEnv.PUBLIC_SUPABASE_URL || publicEnv.PUBLIC_SUPABASE_URL)?.trim()?.replace(/^["']|["']$/g, '');
	if (!supabaseUrl) throw new Error('Missing PUBLIC_SUPABASE_URL');

	return createClient(supabaseUrl, secretKey, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	});
}
