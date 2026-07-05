export type MailAccountType = 'client' | 'seller' | 'admin';

export interface MailAccount {
  user: string;
  pass: string;
  from: string;
}

export interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
}

// Serveur SMTP commun aux 3 comptes (Hostinger) — seuls user/pass/from changent.
export function getSmtpTransportConfig(): SmtpTransportConfig {
  return {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
  };
}

// Les 3 comptes d'envoi, un par type de destinataire.
// Aucun mot de passe en dur : tout vient des variables d'environnement.
export function getMailAccounts(): Record<MailAccountType, MailAccount> {
  return {
    client: {
      user: process.env.SMTP_SUPPORT_USER || '',
      pass: process.env.SMTP_SUPPORT_PASS || '',
      from: `"DealPam" <${process.env.SMTP_SUPPORT_USER}>`,
    },
    seller: {
      user: process.env.SMTP_SELLERS_USER || '',
      pass: process.env.SMTP_SELLERS_PASS || '',
      from: `"DealPam Vendeurs" <${process.env.SMTP_SELLERS_USER}>`,
    },
    admin: {
      user: process.env.SMTP_TEAM_USER || '',
      pass: process.env.SMTP_TEAM_PASS || '',
      from: `"DealPam Équipe" <${process.env.SMTP_TEAM_USER}>`,
    },
  };
}
