export type MailAccountType = 'client' | 'seller' | 'admin';

export interface MailAccount {
  from: string;
}

// Les 3 adresses d'envoi, une par type de destinataire — via Resend (API HTTPS),
// plus besoin de boîte mail/mot de passe réels : n'importe quelle adresse du
// domaine vérifié dealpam.com peut servir de "from".
// Aucune valeur en dur : tout vient des variables d'environnement.
export function getMailAccounts(): Record<MailAccountType, MailAccount> {
  return {
    client: {
      from: `"DealPam" <${process.env.MAIL_FROM_CLIENT || 'support@dealpam.com'}>`,
    },
    seller: {
      from: `"DealPam Vendeurs" <${process.env.MAIL_FROM_SELLER || 'sellers@dealpam.com'}>`,
    },
    admin: {
      from: `"DealPam Équipe" <${process.env.MAIL_FROM_ADMIN || 'team@dealpam.com'}>`,
    },
  };
}
