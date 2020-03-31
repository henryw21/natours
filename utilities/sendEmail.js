const nodemailer = require('nodemailer');

const sendEmail = async email => {
    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD
        }
    });

    // 2) Define email content
    const emailContent = {
        from: email.from,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html
    };

    // 3) Send email
    await transporter.sendMail(emailContent);
};

module.exports = sendEmail;
