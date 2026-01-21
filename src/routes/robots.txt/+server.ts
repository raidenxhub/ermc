import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin.replace(/\/+$/, '');
	const lines = [
		'User-agent: *',
		'Allow: /',
		'Disallow: /auth/',
		'Disallow: /onboarding',
		'Disallow: /events/mgmt/',
		'Disallow: /settings/',
		'Disallow: /statistics/',
		`Sitemap: ${origin}/sitemap.xml`
	].join('\n');
	return new Response(lines, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'max-age=300, public' } });
};
