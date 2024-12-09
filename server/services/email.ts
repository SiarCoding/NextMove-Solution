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
    `)
  }),
  accountApproved: (firstName: string) => ({
    subject: 'Ihr Konto wurde freigegeben',
    html: createEmailTemplate(`
      <h2 style="color: #333; margin-bottom: 20px;">Ihr Konto wurde freigegeben!</h2>
      <p style="color: #666; line-height: 1.6;">Hallo ${firstName},</p>
      <p style="color: #666; line-height: 1.6;">Ihr Konto wurde erfolgreich von unserem Admin-Team überprüft und freigegeben.</p>
      <p style="color: #666; line-height: 1.6;">Sie können sich jetzt in Ihrem Konto anmelden und alle Funktionen nutzen.</p>
      <div style="margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/login" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Jetzt anmelden</a>
      </div>
    `)
  }),
  passwordReset: (firstName: string, resetLink: string = '') => ({
    subject: 'Passwort zurücksetzen - NextMove Solution',
    html: createEmailTemplate(`
      <h2 style="color: #333; margin-bottom: 20px;">Passwort zurücksetzen</h2>
      <p style="color: #666; line-height: 1.6;">Hallo ${firstName},</p>
      <p style="color: #666; line-height: 1.6;">Sie haben angefordert, Ihr Passwort zurückzusetzen. Klicken Sie auf den folgenden Link, um ein neues Passwort zu erstellen:</p>
      <p style="margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Passwort zurücksetzen</a>
      </p>
      <p style="color: #666; line-height: 1.6;">Dieser Link ist aus Sicherheitsgründen nur 1 Stunde gültig.</p>
      <p style="color: #666; line-height: 1.6;">Falls Sie kein neues Passwort angefordert haben, können Sie diese E-Mail ignorieren.</p>
    `)
  })
};

// E-Mail senden Funktion
export async function sendEmail(
  to: string,
  template: 'registration' | 'accountApproved' | 'passwordReset',
  data: { firstName: string; resetLink?: string }
) {
  try {
    console.log('Attempting to send email:', { to, template, firstName: data.firstName });
    
    const templateData = emailTemplates[template](data.firstName, data.resetLink);
    const { subject, html } = templateData;
    
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
      to: mailOptions.to,
      subject: mailOptions.subject,
      smtpConfig: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE
      }
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', {
      error,
      to,
      template,
      smtpConfig: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE
      }
    });
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
