import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());
const looksQuoted = (value: string) => /[`'"]/.test(value.trim());

export const GET: RequestHandler = async () => {
	const publicSupabaseUrl = (publicEnv.PUBLIC_SUPABASE_URL || '').trim();
	const publicAnonKey = (publicEnv.PUBLIC_SUPABASE_ANON_KEY || '').trim();

	const publicSiteUrl = (privateEnv.PUBLIC_SITE_URL || '').trim();
	const siteUrl = (privateEnv.SITE_URL || '').trim();
	const vercelUrl = (privateEnv.VERCEL_URL || '').trim();

	return json({
		ok: true,
		time: new Date().toISOString(),
		runtime: {
			node: typeof process !== 'undefined' ? process.version : null
		},
		deploy: {
			vercelEnv: privateEnv.VERCEL_ENV || null,
			commitSha: privateEnv.VERCEL_GIT_COMMIT_SHA || null
		},
		env: {
			publicSupabaseUrl: {
				present: !!publicSupabaseUrl,
				isHttpUrl: !!publicSupabaseUrl && isHttpUrl(publicSupabaseUrl),
				looksQuoted: !!publicSupabaseUrl && looksQuoted(publicSupabaseUrl)
			},
			publicAnonKey: {
				present: !!publicAnonKey,
				length: publicAnonKey ? publicAnonKey.length : 0,
				looksQuoted: !!publicAnonKey && looksQuoted(publicAnonKey)
			},
			serviceRole: {
				present: !!privateEnv.SUPABASE_SERVICE_ROLE,
				length: privateEnv.SUPABASE_SERVICE_ROLE ? String(privateEnv.SUPABASE_SERVICE_ROLE).trim().length : 0
			},
			accessKey: {
				present: !!privateEnv.ACCESS_KEY,
				length: privateEnv.ACCESS_KEY ? String(privateEnv.ACCESS_KEY).trim().length : 0
			},
			site: {
				publicSiteUrlPresent: !!publicSiteUrl,
				publicSiteUrlLooksQuoted: !!publicSiteUrl && looksQuoted(publicSiteUrl),
				siteUrlPresent: !!siteUrl,
				siteUrlLooksQuoted: !!siteUrl && looksQuoted(siteUrl),
				vercelUrlPresent: !!vercelUrl
			}
		}
	});
};
