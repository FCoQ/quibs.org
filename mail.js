var mail = require('nodemailer').createTransport(require('nodemailer-smtp-transport')({
	port: 587,
	auth: {
		user: 'noreply',
		pass: process.env.SMTP_PASS
	}
}))

module.exports = mail;