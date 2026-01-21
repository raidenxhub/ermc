import { env } from '$env/dynamic/private';

type ResendEmailPayload = {
	from: string;
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
};

const sender = 'ermcnoreply@realkenan.dev';

const baseUrl = () => {
	const candidates = [env.PUBLIC_SITE_URL, env.SITE_URL, env.VERCEL_URL ? `https://${env.VERCEL_URL}` : null, 'https://ermc.realkenan.dev'];
	for (const c of candidates) {
		if (typeof c === 'string' && c.trim().length > 0) return c.trim().replace(/\/+$/, '');
	}
	return 'https://ermc.realkenan.dev';
};

const apiKey = () => {
	const v = env.resend_api;
	return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
};

const escapeHtml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const fmtUtc = (iso: string) => {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? iso : d.toUTCString();
};

const cleanText = (value: string) =>
	value
		.replace(/:[a-z0-9_+-]+:/gi, '')
		.replace(/(\*\*|__|\*|_|`)/g, '')
		.replace(/\s+/g, ' ')
		.trim();

const toPlainText = (value: string) =>
	value
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const renderButton = (href: string, label: string) => `
  <a href="${escapeHtml(href)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;letter-spacing:.2px">
    ${escapeHtml(label)}
  </a>
`;

const renderCardRow = (label: string, value: string) => `
  <tr>
    <td style="padding:10px 12px;border-top:1px solid rgba(148,163,184,.25);color:#64748b;font-size:13px;white-space:nowrap">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border-top:1px solid rgba(148,163,184,.25);color:#0f172a;font-size:14px;font-weight:600">${escapeHtml(value)}</td>
  </tr>
`;

const renderEmailLayout = (params: {
	subject: string;
	preview: string;
	heading: string;
	intro: string;
	bodyHtml?: string;
	ctaHref?: string;
	ctaLabel?: string;
}) => {
	const site = baseUrl();
	const legal = [
		{ href: `${site}/terms-of-service`, label: 'Terms of Service' },
		{ href: `${site}/terms-of-use`, label: 'Terms of Use' },
		{ href: `${site}/privacy`, label: 'Privacy Policy' }
	];
	const contactHref = `${site}/contact`;
	const preview = cleanText(params.preview).slice(0, 140);

	const hiddenPreview = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preview)}</div>`;
	const brand = `
    <div style="padding:24px 24px 0">
      <div style="font-size:14px;font-weight:800;letter-spacing:.4px;color:#0f172a">ERMC</div>
      <div style="margin-top:2px;font-size:12px;color:#64748b">Event Rostering &amp; Management</div>
    </div>
  `;

	const footerLinks = legal
		.map((l) => `<a href="${escapeHtml(l.href)}" style="color:#64748b;text-decoration:underline">${escapeHtml(l.label)}</a>`)
		.join(' &nbsp;•&nbsp; ');

	const html = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(params.subject)}</title>
    </head>
    <body style="margin:0;padding:0;background:#f1f5f9">
      ${hiddenPreview}
      <div style="padding:28px 12px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto">
          <tr>
            <td>
              <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.25)">
                ${brand}
                <div style="padding:20px 24px 26px">
                  <h1 style="margin:0 0 10px;font-size:22px;line-height:1.25;color:#0f172a">${escapeHtml(params.heading)}</h1>
                  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155">${escapeHtml(params.intro)}</p>
                  ${params.bodyHtml || ''}
                  ${params.ctaHref && params.ctaLabel ? `<div style="margin-top:18px">${renderButton(params.ctaHref, params.ctaLabel)}</div>` : ''}
                  <div style="margin-top:22px;padding-top:16px;border-top:1px solid rgba(148,163,184,.25)">
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b">
                      Need help? <a href="${escapeHtml(contactHref)}" style="color:#2563eb;text-decoration:underline">Contact us</a>.
                    </p>
                  </div>
                </div>
              </div>
              <div style="max-width:640px;margin:14px auto 0;padding:0 10px;text-align:center">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#64748b">
                  ${footerLinks}
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8">
                  This email was sent from ERMC. If you didn’t request this, you can ignore it.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </body>
  </html>
  `;

	return { html, text: `${params.subject}\n\n${params.intro}\n\n${toPlainText(params.bodyHtml || '')}\n\n${site}`.trim() };
};

export async function sendResendEmail(payload: ResendEmailPayload) {
	const key = apiKey();
	if (!key) return;
	try {
		await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${key}`,
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify(payload)
		});
	} catch {
		return;
	}
}

export async function sendWelcomeEmail(params: { to: string; name?: string | null }) {
	const to = params.to.trim();
	if (!to) return;
	const subject = 'Welcome to ERMC';
	const name = params.name ? cleanText(params.name) : 'Controller';
	const site = baseUrl();
	const bodyHtml = `
    <div style="background:rgba(241,245,249,.65);border:1px solid rgba(148,163,184,.25);border-radius:16px;padding:14px 14px 12px">
      <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#0f172a">
        Your account is ready. To start booking, complete onboarding and add your VATSIM CID and rating.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#334155">
        You can also view upcoming events and live controller status from your dashboard.
      </p>
    </div>
  `;
	const rendered = renderEmailLayout({
		subject,
		preview: 'Your ERMC account is ready. Complete onboarding to book slots.',
		heading: `Welcome, ${name}`,
		intro: 'Thanks for joining ERMC.',
		bodyHtml,
		ctaHref: `${site}/dashboard`,
		ctaLabel: 'Open Dashboard'
	});
	await sendResendEmail({ from: sender, to, subject, html: rendered.html, text: rendered.text });
}

export async function sendAccountDeletedEmail(params: { to: string; name?: string | null }) {
	const to = params.to.trim();
	if (!to) return;
	const subject = 'Your ERMC account has been deleted';
	const name = params.name ? cleanText(params.name) : 'Controller';
	const site = baseUrl();
	const bodyHtml = `
    <div style="background:rgba(241,245,249,.65);border:1px solid rgba(148,163,184,.25);border-radius:16px;padding:14px 14px 12px">
      <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#0f172a">
        This confirms your ERMC account has been deleted and you will no longer be able to access bookings, coordination, or your profile.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#334155">
        If you did not request this, please contact us immediately.
      </p>
    </div>
  `;
	const rendered = renderEmailLayout({
		subject,
		preview: 'Your ERMC account has been deleted.',
		heading: 'Account deleted',
		intro: `Hi ${name},`,
		bodyHtml,
		ctaHref: `${site}/contact`,
		ctaLabel: 'Contact Support'
	});
	await sendResendEmail({ from: sender, to, subject, html: rendered.html, text: rendered.text });
}

export async function sendBookingConfirmedEmail(params: {
	to: string;
	name?: string | null;
	eventName: string;
	subdivision?: string | null;
	airport?: string | null;
	position: string;
	startTime: string;
	endTime: string;
}) {
	const to = params.to.trim();
	if (!to) return;
	const subject = `Booking confirmed: ${cleanText(params.eventName)}`;
	const name = params.name ? cleanText(params.name) : 'Controller';
	const site = baseUrl();
	const card = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid rgba(148,163,184,.25);border-radius:16px;overflow:hidden;background:#ffffff">
      ${renderCardRow('Event', cleanText(params.eventName))}
      ${params.subdivision ? renderCardRow('Subdivision', cleanText(params.subdivision)) : ''}
      ${params.airport ? renderCardRow('Airport', cleanText(params.airport)) : ''}
      ${renderCardRow('Position', cleanText(params.position))}
      ${renderCardRow('Start (UTC)', fmtUtc(params.startTime))}
      ${renderCardRow('End (UTC)', fmtUtc(params.endTime))}
    </table>
    <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#334155">
      Please ensure you connect using the booked callsign format and are online before the event begins.
    </p>
  `;
	const rendered = renderEmailLayout({
		subject,
		preview: `Booking confirmed for ${cleanText(params.eventName)}.`,
		heading: 'Booking confirmed',
		intro: `Hi ${name}, your booking is confirmed.`,
		bodyHtml: card,
		ctaHref: `${site}/dashboard`,
		ctaLabel: 'View My Bookings'
	});
	await sendResendEmail({ from: sender, to, subject, html: rendered.html, text: rendered.text });
}

export async function sendBookingCancelledEmail(params: {
	to: string;
	name?: string | null;
	eventName: string;
	subdivision?: string | null;
	airport?: string | null;
	position: string;
	startTime: string;
	endTime: string;
}) {
	const to = params.to.trim();
	if (!to) return;
	const subject = `Booking cancelled: ${cleanText(params.eventName)}`;
	const name = params.name ? cleanText(params.name) : 'Controller';
	const site = baseUrl();
	const card = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid rgba(148,163,184,.25);border-radius:16px;overflow:hidden;background:#ffffff">
      ${renderCardRow('Event', cleanText(params.eventName))}
      ${params.subdivision ? renderCardRow('Subdivision', cleanText(params.subdivision)) : ''}
      ${params.airport ? renderCardRow('Airport', cleanText(params.airport)) : ''}
      ${renderCardRow('Position', cleanText(params.position))}
      ${renderCardRow('Start (UTC)', fmtUtc(params.startTime))}
      ${renderCardRow('End (UTC)', fmtUtc(params.endTime))}
    </table>
    <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#334155">
      You can book another slot for this event if booking is still open.
    </p>
  `;
	const rendered = renderEmailLayout({
		subject,
		preview: `Booking cancelled for ${cleanText(params.eventName)}.`,
		heading: 'Booking cancelled',
		intro: `Hi ${name}, your booking was cancelled.`,
		bodyHtml: card,
		ctaHref: `${site}/rostering`,
		ctaLabel: 'Browse Events'
	});
	await sendResendEmail({ from: sender, to, subject, html: rendered.html, text: rendered.text });
}

export async function sendStandbyRequestedEmail(params: {
	to: string;
	name?: string | null;
	eventName: string;
	subdivision?: string | null;
	airport?: string | null;
	position: string;
	startTime?: string | null;
	endTime?: string | null;
}) {
	const to = params.to.trim();
	if (!to) return;
	const subject = `Standby requested: ${cleanText(params.eventName)}`;
	const name = params.name ? cleanText(params.name) : 'Controller';
	const site = baseUrl();
	const card = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid rgba(148,163,184,.25);border-radius:16px;overflow:hidden;background:#ffffff">
      ${renderCardRow('Event', cleanText(params.eventName))}
      ${params.subdivision ? renderCardRow('Subdivision', cleanText(params.subdivision)) : ''}
      ${params.airport ? renderCardRow('Airport', cleanText(params.airport)) : ''}
      ${renderCardRow('Position', cleanText(params.position))}
      ${params.startTime ? renderCardRow('Start (UTC)', fmtUtc(params.startTime)) : ''}
      ${params.endTime ? renderCardRow('End (UTC)', fmtUtc(params.endTime)) : ''}
    </table>
    <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#334155">
      If the primary booking becomes available, standby may be promoted automatically based on queue order.
    </p>
  `;
	const rendered = renderEmailLayout({
		subject,
		preview: `Standby requested for ${cleanText(params.eventName)}.`,
		heading: 'Standby requested',
		intro: `Hi ${name}, you’ve been added to standby.`,
		bodyHtml: card,
		ctaHref: `${site}/dashboard`,
		ctaLabel: 'View My Status'
	});
	await sendResendEmail({ from: sender, to, subject, html: rendered.html, text: rendered.text });
}

export async function sendEventCancelledEmail(params: { to: string; name?: string | null; eventName: string; startTime: string; endTime: string }) {
	const to = params.to.trim();
	if (!to) return;
	const subject = `Event cancelled: ${cleanText(params.eventName)}`;
	const name = params.name ? cleanText(params.name) : 'Controller';
	const site = baseUrl();
	const card = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid rgba(148,163,184,.25);border-radius:16px;overflow:hidden;background:#ffffff">
      ${renderCardRow('Event', cleanText(params.eventName))}
      ${renderCardRow('Start (UTC)', fmtUtc(params.startTime))}
      ${renderCardRow('End (UTC)', fmtUtc(params.endTime))}
    </table>
    <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#334155">
      Any existing bookings for this event are no longer valid. Please do not connect for this event unless it is republished.
    </p>
  `;
	const rendered = renderEmailLayout({
		subject,
		preview: `Event cancelled: ${cleanText(params.eventName)}.`,
		heading: 'Event cancelled',
		intro: `Hi ${name}, this event has been cancelled and booking is closed.`,
		bodyHtml: card,
		ctaHref: `${site}/rostering`,
		ctaLabel: 'Browse Other Events'
	});
	await sendResendEmail({ from: sender, to, subject, html: rendered.html, text: rendered.text });
}
