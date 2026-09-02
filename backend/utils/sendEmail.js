// utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // your Gmail address
        pass: process.env.EMAIL_PASS, // app-specific password
      },
    });

    const mailOptions = {
      from: `"WorkConnect" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to', to);
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error('Email sending failed');
  }
};

module.exports = sendEmail;
