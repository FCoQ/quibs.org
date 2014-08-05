var mail = require('nodemailer').createTransport(require('nodemailer-smtp-transport')({
	host: 'localhost',
	port: 25,
	auth: {
		user: 'noreply',
		pass: process.env.SMTP_PASS
	},
	maxConnections: 1,
	maxMessages: 10
}))

module.exports = mail;