import nodemailer, { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

// Email-Transporter konfigurieren
function createTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
  const config: SMTPTransport.Options = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true,
    logger: true,
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    }
  };

  console.log('Creating email transporter with config:', {
    ...config,
    auth: { 
      user: config.auth?.user
    }
  });

  return nodemailer.createTransport(config);
}

const transporter = createTransporter();

// Basis-Template für alle E-Mails
const createEmailTemplate = (content: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    ${content}
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #666;">Mit freundlichen Grüßen,<br>Ihr NextMove Solution Team</p>
    </div>
  </div>
`;

// E-Mail-Templates
const emailTemplates = {
  registration: (firstName: string) => ({
    subject: 'Willkommen bei NextMove Solution',
    html: createEmailTemplate(`
      <h2 style="color: #333; margin-bottom: 20px;">Willkommen bei NextMove Solution, ${firstName}!</h2>
      <p style="color: #666; line-height: 1.6;">Vielen Dank für Ihre Registrierung. Ihr Konto wird derzeit von unserem Admin-Team überprüft.</p>
      <p style="color: #666; line-height: 1.6;">Sobald Ihr Konto freigegeben wurde, erhalten Sie eine weitere E-Mail von uns.</p>
    `),
  }),
  
  accountApproved: (firstName: string) => ({
    subject: 'Ihr NextMove Solution Konto wurde freigegeben',
    html: createEmailTemplate(`
      <h2 style="color: #333; margin-bottom: 20px;">Gute Nachrichten, ${firstName}!</h2>
      <p style="color: #666; line-height: 1.6;">Ihr Konto wurde erfolgreich freigegeben. Sie können sich jetzt in unserem Kundenportal anmelden.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/login" 
           style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Zum Login
        </a>
      </div>
    `),
  }),
};

// E-Mail senden Funktion
export async function sendEmail(
  to: string,
  template: 'registration' | 'accountApproved',
  data: { firstName: string }
) {
  try {
    const { subject, html } = emailTemplates[template](data.firstName);
    
    const mailOptions = {
      from: {
        name: 'NextMove Solution',
        address: process.env.SMTP_USER as string
      },
      to,
      subject,
      html,
    };

    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      smtpConfig: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE,
        user: process.env.SMTP_USER
      }
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
