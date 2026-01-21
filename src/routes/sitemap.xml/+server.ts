import type { RequestHandler } from '@sveltejs/kit';

const escape = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

export const GET: RequestHandler = async ({ locals: { supabase }, url }) => {
	const origin = url.origin.replace(/\/+$/, '');
	const staticPaths = [
		'/',
		'/rostering',
		'/coordination',
		'/contact',
		'/privacy',
		'/terms-of-service',
		'/terms-of-use'
	];

	let eventUrls: { loc: string; lastmod?: string | null }[] = [];
	try {
		if (supabase) {
			const { data } = await supabase.from('events').select('id, updated_at, status').eq('status', 'published');
			eventUrls = (data || [])
				.filter((e: any) => typeof e?.id === 'string')
				.map((e: any) => ({ loc: `${origin}/rostering/events/${e.id}`, lastmod: e.updated_at || null }))
				.filter((v) => v.loc);
		}
	} catch {
		eventUrls = [];
	}

	const urlsXml = [
		...staticPaths.map((p) => `<url><loc>${escape(origin + p)}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`),
		...eventUrls.map(
			(u) =>
				`<url><loc>${escape(u.loc)}</loc>${u.lastmod ? `<lastmod>${escape(new Date(u.lastmod).toISOString())}</lastmod>` : ''}<changefreq>hourly</changefreq><priority>0.9</priority></url>`
		)
	].join('');

	const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlsXml}</urlset>`;
	return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'max-age=300, public' } });
};
