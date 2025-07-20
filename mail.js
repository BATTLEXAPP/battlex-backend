// battlex_backend/mail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER, // 👈 use SMTP_USER
    pass: process.env.SMTP_PASS  // 👈 use SMTP_PASS
  }
});

async function sendMail({ to, subject, text }) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text
  });
}

module.exports = sendMail;
