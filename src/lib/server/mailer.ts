import { createTransport } from 'nodemailer';

import { env } from '$env/dynamic/private';

export const transporter = createTransport({
	host: env.MAILER_HOST as string,
	port: 465,
	secure: true,
	auth: {
		user: env.MAILER_USER as string,
		pass: env.MAILER_PASS as string
	}
});
