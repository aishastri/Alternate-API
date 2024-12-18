const nodemailer = require("nodemailer");
require("dotenv").config();

const sendMailSMTP = async (email, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_KEY,
    },
  });

  const mailOptions = {
    from: "apsense <hello@frameji.com>",
    to: email,
    subject: subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info);
    return { status: "Sent", info };
  } catch (error) {
    console.error("Error sending email:", error);
    return { status: "Failed", error: error.message };
  }
};

module.exports = sendMailSMTP;
