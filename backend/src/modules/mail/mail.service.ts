import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailAccountType, getMailAccounts, getSmtpTransportConfig } from './mail.config';

const BRAND = {
  name: 'DealPam',
  url: 'https://dealpam.com',
  support: 'support@dealpam.com',
  orange: '#FF9900',
  dark: '#0F1111',
  text: '#374151',
  muted: '#6B7280',
  light: '#F9FAFB',
  border: '#E5E7EB',
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporters = new Map<MailAccountType, nodemailer.Transporter>();
  private readonly accounts = getMailAccounts();

  constructor() {
    const transportConfig = getSmtpTransportConfig();
    for (const type of Object.keys(this.accounts) as MailAccountType[]) {
      const account = this.accounts[type];
      this.transporters.set(
        type,
        nodemailer.createTransport({
          host: transportConfig.host,
          port: transportConfig.port,
          secure: transportConfig.secure,
          auth: { user: account.user, pass: account.pass },
          tls: { rejectUnauthorized: false },
        }),
      );
    }
  }

  // ── API publique réutilisable ────────────────────────────────────────────
  // Point d'entrée simple pour tout nouveau template : on précise juste le
  // type de destinataire (client/seller/admin), à/sujet/contenu.
  async sendMail(opts: { as: MailAccountType; to: string; subject: string; html: string }): Promise<void> {
    await this.send(opts.to, opts.subject, this.layout(opts.subject, opts.subject, opts.html), opts.as);
  }

  // Détermine le compte d'envoi à partir du rôle réel de l'utilisateur —
  // utile pour les emails génériques (reset password, compte bloqué...)
  // envoyés à n'importe quel type de compte.
  static accountForRole(role?: string): MailAccountType {
    if (role === 'SELLER') return 'seller';
    if (['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'CUSTOMER_CARE', 'PARTNER', 'ACCOUNTANT'].includes(role || '')) return 'admin';
    return 'client';
  }

  // ── Alertes internes équipe (litiges, rapports, notifications système) ──
  async sendTeamAlert(subject: string, message: string, to = process.env.SMTP_TEAM_USER || ''): Promise<void> {
    const body = `
      ${this.hero('🔔', '#EFF6FF', subject)}
      <div style="color:${BRAND.text};font-size:14.5px;line-height:1.75;">${message}</div>
    `;
    await this.send(to, `[DealPam Admin] ${subject}`, this.layout(subject, subject, body), 'admin');
  }

  // ── SHARED LAYOUT ──────────────────────────────────────────────────────────

  private layout(title: string, preheader: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>${this.esc(title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  body{margin:0;padding:0;background:#F1F5F9;font-family:'Inter','Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;}
  *{box-sizing:border-box;}
  a{color:${BRAND.orange};text-decoration:none;}
  @media(max-width:600px){
    .email-body{padding:16px !important;}
    .email-card{border-radius:12px !important;}
    .email-content{padding:28px 20px !important;}
    .btn{padding:13px 24px !important;font-size:14px !important;}
  }
</style>
</head>
<body>
<!-- Preheader hidden -->
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${this.esc(preheader)}</span>
<table width="100%" cellpadding="0" cellspacing="0" class="email-body" style="background:#F1F5F9;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

  <!-- LOGO HEADER -->
  <tr><td style="padding-bottom:24px;text-align:center;">
    <a href="${BRAND.url}" style="display:inline-block;text-decoration:none;">
      <span style="font-family:'Inter',Arial,sans-serif;font-size:26px;font-weight:900;color:${BRAND.dark};letter-spacing:-1px;">
        Deal<span style="color:${BRAND.orange};">Pam</span>
      </span>
      <span style="font-size:11px;color:#9CA3AF;font-weight:400;vertical-align:bottom;padding-bottom:2px;">.com</span>
    </a>
  </td></tr>

  <!-- CARD -->
  <tr><td class="email-card" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.07);border:1px solid ${BRAND.border};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td class="email-content" style="padding:40px 44px 36px;">${body}</td></tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:24px 0 8px;text-align:center;">
    <p style="margin:0 0 6px;color:#9CA3AF;font-size:12px;line-height:1.7;">
      © 2025 DealPam · Haïti · <a href="mailto:${BRAND.support}" style="color:#9CA3AF;">${BRAND.support}</a>
    </p>
    <p style="margin:0;color:#CBD5E1;font-size:11px;">Cet email est envoyé automatiquement — merci de ne pas y répondre directement.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
  }

  // Component helpers
  private hero(icon: string, bg: string, title: string, subtitle?: string): string {
    return `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:72px;height:72px;background:${bg};border-radius:50%;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;font-size:32px;line-height:72px;">
        ${icon}
      </div>
      <h1 style="margin:0 0 8px;color:${BRAND.dark};font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">${title}</h1>
      ${subtitle ? `<p style="margin:0;color:${BRAND.muted};font-size:15px;line-height:1.6;">${subtitle}</p>` : ''}
    </div>`;
  }

  private btn(text: string, url: string, color = BRAND.orange, textColor = '#fff'): string {
    return `
    <table cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
      <tr>
        <td class="btn" style="background:${color};border-radius:10px;padding:15px 36px;">
          <a href="${url}" style="color:${textColor};text-decoration:none;font-weight:700;font-size:15.5px;letter-spacing:0.2px;white-space:nowrap;">${text}</a>
        </td>
      </tr>
    </table>`;
  }

  private greeting(firstName: string): string {
    return `<p style="margin:0 0 20px;color:${BRAND.text};font-size:15.5px;line-height:1.7;">Bonjour <strong>${this.esc(firstName)}</strong>,</p>`;
  }

  private para(text: string): string {
    return `<p style="margin:0 0 16px;color:${BRAND.text};font-size:15px;line-height:1.75;">${text}</p>`;
  }

  private alert(text: string, type: 'info'|'warning'|'success'|'error' = 'info'): string {
    const colors: Record<string, [string, string]> = {
      info:    ['#EFF6FF','#1D4ED8'], warning: ['#FFFBEB','#92400E'],
      success: ['#F0FDF4','#166534'], error:   ['#FFF1F2','#991B1B'],
    };
    const [bg, fg] = colors[type];
    return `<div style="background:${bg};border-radius:10px;padding:16px 20px;margin:0 0 24px;"><p style="margin:0;color:${fg};font-size:13.5px;line-height:1.7;">${text}</p></div>`;
  }

  private divider(): string {
    return `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:28px 0;"/>`;
  }

  private table(rows: [string, string][]): string {
    const cells = rows.map(([k, v]) => `
      <tr>
        <td style="padding:10px 16px;background:#F9FAFB;font-size:13px;color:${BRAND.muted};font-weight:500;border-bottom:1px solid ${BRAND.border};width:40%;">${k}</td>
        <td style="padding:10px 16px;background:#fff;font-size:13.5px;color:${BRAND.dark};font-weight:600;border-bottom:1px solid ${BRAND.border};">${v}</td>
      </tr>`).join('');
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid ${BRAND.border};margin:0 0 24px;">${cells}</table>`;
  }

  private linkNote(url: string): string {
    return `<p style="margin:16px 0 0;color:${BRAND.muted};font-size:12px;text-align:center;word-break:break-all;">
      Lien direct : <a href="${url}" style="color:${BRAND.orange};">${url}</a></p>`;
  }

  // ── 1. WELCOME ─────────────────────────────────────────────────────────────

  async sendWelcome(to: string, firstName: string): Promise<void> {
    const body = `
      ${this.hero('🎉', '#FFF8EC', `Bienvenue sur DealPam, ${this.esc(firstName)} !`, 'Votre compte a été créé avec succès')}
      ${this.greeting(firstName)}
      ${this.para('Vous pouvez maintenant explorer des milliers de produits et services partout en Haïti, contacter des vendeurs vérifiés et passer vos commandes en toute sécurité.')}
      <ul style="color:${BRAND.text};font-size:14.5px;line-height:2;padding-left:20px;margin:0 0 24px;">
        <li>🛍️ Découvrir des milliers de produits</li>
        <li>🔒 Vendeurs vérifiés et de confiance</li>
        <li>📦 Livraison partout en Haïti</li>
        <li>💬 Chat direct avec les vendeurs</li>
        <li>⭐ Avis et notes authentiques</li>
      </ul>
      ${this.btn('Explorer Dealpam', BRAND.url)}
      ${this.divider()}
      <p style="margin:0;color:${BRAND.muted};font-size:12.5px;text-align:center;">Des questions ? Contactez-nous à <a href="mailto:${BRAND.support}">${BRAND.support}</a></p>
    `;
    await this.send(to, `🎉 Bienvenue sur DealPam, ${firstName} !`, this.layout('Bienvenue', `Bienvenue ${firstName} ! Votre compte DealPam est prêt.`, body), 'client');
  }

  // ── 1bis. SELLER WELCOME + 30-DAY FREE TRIAL ────────────────────────────────

  async sendSellerWelcomeTrial(to: string, firstName: string, storeName: string, trialEndDate: Date | null): Promise<void> {
    const end = trialEndDate?.toLocaleDateString('fr-FR', { timeZone: 'America/Port-au-Prince', dateStyle: 'long' });
    const body = `
      ${this.hero('DP', '#F1F5F9', `Compte vendeur activé`, `${this.esc(storeName)} est en ligne`)}
      ${this.greeting(firstName)}
      ${this.para(`Votre boutique <strong>${this.esc(storeName)}</strong> a été créée avec succès sur DealPam.${trialEndDate ? ' Elle bénéficie automatiquement d\'une période d\'essai sur le plan Business.' : ''}`)}
      ${trialEndDate ? `
      <div style="background:${BRAND.light};border:1px solid ${BRAND.border};border-radius:12px;padding:24px;margin:0 0 24px;">
        <p style="margin:0 0 4px;color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Période d'essai</p>
        <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:${BRAND.dark};">30 jours — Plan Business</p>
        <p style="margin:0;color:${BRAND.text};font-size:14px;line-height:1.6;">Accès complet aux fonctionnalités du plan Business : badge vendeur vérifié, statistiques de vente et visibilité prioritaire dans les résultats de recherche.</p>
      </div>` : ''}
      <ul style="color:${BRAND.text};font-size:14.5px;line-height:2;padding-left:20px;margin:0 0 24px;">
        <li>Publication de produits et services</li>
        <li>Badge vendeur vérifié</li>
        <li>Statistiques de vente</li>
        <li>Visibilité prioritaire dans les recherches</li>
      </ul>
      ${trialEndDate
        ? this.alert(`Votre période d'essai se termine le <strong>${end}</strong>. Sélectionnez un plan d'abonnement avant cette date pour conserver l'accès sans interruption.`, 'info')
        : this.alert('Sélectionnez un plan d\'abonnement pour commencer à publier vos produits et services.', 'info')}
      ${this.btn('Accéder à mon espace vendeur', `${BRAND.url}/seller/products`)}
      ${this.divider()}
      <p style="margin:0;color:${BRAND.muted};font-size:12.5px;text-align:center;">Une question ? Contactez notre équipe à <a href="mailto:${BRAND.support}">sellers@dealpam.com</a></p>
    `;
    await this.send(
      to,
      trialEndDate ? `Votre essai de 30 jours sur le plan Business a commencé` : `Bienvenue sur DealPam, ${firstName}`,
      this.layout('Compte vendeur activé', `Votre boutique DealPam ${storeName} est prête.`, body),
      'seller',
    );
  }

  // ── 2. EMAIL VERIFICATION ──────────────────────────────────────────────────

  async sendEmailVerification(to: string, firstName: string, verifyUrl: string): Promise<void> {
    const body = `
      ${this.hero('📧', '#EFF6FF', 'Confirmez votre adresse email', 'Une dernière étape pour activer votre compte')}
      ${this.greeting(firstName)}
      ${this.para('Pour finaliser la création de votre compte DealPam et commencer à utiliser la plateforme, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.')}
      ${this.btn('Confirmer mon email', verifyUrl)}
      ${this.alert('⏱️ Ce lien est valable <strong>24 heures</strong>. Si vous n\'avez pas créé de compte, ignorez cet email.', 'info')}
      ${this.linkNote(verifyUrl)}
    `;
    await this.send(to, '📧 Confirmez votre adresse email — DealPam', this.layout('Confirmation email', 'Confirmez votre email pour activer votre compte DealPam.', body), 'client');
  }

  // ── 3. SELLER ACCOUNT APPROVED ─────────────────────────────────────────────

  async sendSellerApproved(to: string, firstName: string, storeName: string): Promise<void> {
    const body = `
      ${this.hero('✅', '#F0FDF4', 'Votre boutique est approuvée !', `${this.esc(storeName)} est maintenant en ligne`)}
      ${this.greeting(firstName)}
      ${this.para('Félicitations ! Votre demande de compte vendeur a été <strong>validée par notre équipe</strong>. Vous pouvez maintenant choisir votre plan d\'abonnement et commencer à publier vos produits.')}
      ${this.alert('✅ <strong>Prochaine étape :</strong> Choisissez votre abonnement vendeur pour commencer à publier.', 'success')}
      ${this.btn('Accéder à mon espace vendeur', `${BRAND.url}/seller`)}
      ${this.divider()}
      <p style="margin:0;color:${BRAND.muted};font-size:13px;text-align:center;">Besoin d'aide pour démarrer ? Consultez notre guide vendeur ou contactez-nous.</p>
    `;
    await this.send(to, `✅ Votre boutique "${storeName}" est approuvée — DealPam`, this.layout('Boutique approuvée', `Votre boutique ${storeName} est validée et prête à vendre.`, body), 'seller');
  }

  // ── 3b. SELLER DOCS SUBMITTED / RESUBMITTED — awaiting review ─────────────

  async sendSellerDocsPending(to: string, firstName: string): Promise<void> {
    const body = `
      ${this.hero('⏳', '#EFF6FF', 'Documents reçus', 'Votre dossier est en cours de vérification')}
      ${this.greeting(firstName)}
      ${this.para('Nous avons bien reçu vos documents d\'identité. Notre équipe va les examiner et vous recevrez un email dès que la vérification sera terminée.')}
      ${this.alert('Ce contrôle est gratuit et généralement traité sous 24 à 48h.', 'info')}
      ${this.divider()}
      <p style="margin:0;color:${BRAND.muted};font-size:13px;text-align:center;">Une question ? Contactez-nous à <a href="mailto:sellers@dealpam.com">sellers@dealpam.com</a></p>
    `;
    await this.send(to, 'Documents reçus — vérification en cours — DealPam', this.layout('Documents en cours de vérification', 'Votre dossier vendeur est en cours de vérification.', body), 'seller');
  }

  // ── 4. SELLER REJECTED ─────────────────────────────────────────────────────

  async sendSellerRejected(to: string, firstName: string, reason?: string): Promise<void> {
    const body = `
      ${this.hero('❌', '#FFF1F2', 'Demande de vérification refusée', 'Votre dossier nécessite des corrections')}
      ${this.greeting(firstName)}
      ${this.para('Après examen de votre dossier, notre équipe n\'a pas pu valider votre compte vendeur pour le moment.')}
      ${reason ? `${this.alert(`<strong>Motif :</strong> ${this.esc(reason)}`, 'warning')}` : ''}
      ${this.para('Vous pouvez corriger les informations manquantes ou incorrectes et soumettre à nouveau votre dossier.')}
      ${this.btn('Corriger et resoumettre', `${BRAND.url}/seller/documents`, '#374151')}
      ${this.divider()}
      ${this.para(`Si vous pensez que cette décision est une erreur, contactez notre support à <a href="mailto:${BRAND.support}">${BRAND.support}</a>.`)}
    `;
    await this.send(to, '❌ Vérification refusée — DealPam', this.layout('Vérification refusée', 'Votre dossier vendeur n\'a pas pu être validé.', body), 'seller');
  }

  // ── 5. PASSWORD RESET (code 6 chiffres) ───────────────────────────────────

  async sendPasswordResetCode(to: string, firstName: string, code: string, as: MailAccountType = 'client'): Promise<void> {
    const body = `
      ${this.hero('🔐', '#FFF8EC', 'Code de vérification', 'Réinitialisation de votre mot de passe')}
      ${this.greeting(firstName)}
      ${this.para('Vous avez demandé à réinitialiser votre mot de passe. Utilisez le code ci-dessous :')}
      <div style="background:#F9FAFB;border:2px solid ${BRAND.orange};border-radius:14px;padding:24px;text-align:center;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#9CA3AF;font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Code de vérification</p>
        <p style="margin:0;font-size:40px;font-weight:900;color:${BRAND.dark};letter-spacing:10px;font-family:monospace;">${this.esc(code)}</p>
      </div>
      ${this.alert('Ce code expire dans <strong>15 minutes</strong> et ne peut être utilisé qu\'une seule fois. Si vous n\'avez pas fait cette demande, ignorez cet email.', 'warning')}
    `;
    await this.send(to, 'Votre code de réinitialisation — DealPam', this.layout('Code de réinitialisation', 'Votre code de réinitialisation DealPam.', body), as);
  }

  async sendPasswordReset(to: string, firstName: string, resetUrl: string, as: MailAccountType = 'client'): Promise<void> {
    return this.sendPasswordResetCode(to, firstName, resetUrl, as);
  }

  // ── 6. ADMIN RESET — temp password ─────────────────────────────────────────

  async sendAdminPasswordReset(to: string, firstName: string, tempPassword: string, as: MailAccountType = 'client'): Promise<void> {
    const body = `
      ${this.hero('🛡️', '#EFF6FF', 'Mot de passe réinitialisé par l\'admin', 'Un mot de passe temporaire a été créé')}
      ${this.greeting(firstName)}
      ${this.para('Un administrateur DealPam a réinitialisé votre mot de passe. Voici votre mot de passe temporaire :')}
      <div style="background:#F9FAFB;border:2px dashed ${BRAND.orange};border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Mot de passe temporaire</p>
        <p style="margin:0;font-size:24px;font-weight:900;color:${BRAND.dark};letter-spacing:3px;font-family:monospace;">${this.esc(tempPassword)}</p>
      </div>
      ${this.alert('⚠️ Pour des raisons de sécurité, <strong>changez ce mot de passe immédiatement</strong> après votre connexion. Ce mot de passe temporaire expire dans <strong>24 heures</strong>.', 'warning')}
      ${this.btn('Se connecter maintenant', `${BRAND.url}/login`)}
    `;
    await this.send(to, '🛡️ Votre mot de passe a été réinitialisé — DealPam', this.layout('Reset par admin', 'Un administrateur a réinitialisé votre mot de passe DealPam.', body), as);
  }

  // ── 7. ACCOUNT LOCKED ─────────────────────────────────────────────────────

  async sendAccountLocked(to: string, firstName: string, resetUrl: string, as: MailAccountType = 'client'): Promise<void> {
    const body = `
      ${this.hero('🔒', '#FFF1F2', 'Compte temporairement bloqué', 'Plusieurs tentatives de connexion échouées détectées')}
      ${this.greeting(firstName)}
      ${this.para('Par mesure de sécurité, votre compte a été <strong>temporairement bloqué</strong> suite à plusieurs tentatives de connexion incorrectes.')}
      ${this.alert('⚠️ Si ce n\'était pas vous, votre mot de passe a peut-être été compromis. Réinitialisez-le immédiatement.', 'error')}
      ${this.btn('Réinitialiser mon mot de passe', resetUrl)}
    `;
    await this.send(to, '🔒 Compte bloqué — DealPam', this.layout('Compte bloqué', 'Votre compte DealPam a été temporairement bloqué.', body), as);
  }

  // ── 8. PASSWORD CHANGED ───────────────────────────────────────────────────

  async sendPasswordChanged(to: string, firstName: string, as: MailAccountType = 'client'): Promise<void> {
    const now = new Date().toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince', dateStyle: 'long', timeStyle: 'short' });
    const body = `
      ${this.hero('✅', '#F0FDF4', 'Mot de passe modifié avec succès')}
      ${this.greeting(firstName)}
      ${this.para(`Votre mot de passe DealPam a été modifié le <strong>${now}</strong>.`)}
      ${this.alert(`⚠️ Si vous n'avez pas effectué cette action, contactez immédiatement <a href="mailto:${BRAND.support}">${BRAND.support}</a>`, 'error')}
    `;
    await this.send(to, '✅ Mot de passe modifié — DealPam', this.layout('Mot de passe modifié', 'Votre mot de passe DealPam a été changé.', body), as);
  }

  // ── 9. NEW ORDER (to seller) ───────────────────────────────────────────────

  async sendNewOrderToSeller(to: string, sellerName: string, order: {
    number: string; customerName: string; customerPhone: string; customerEmail: string;
    customerAddress: string; items: { name: string; qty: number; price: number }[];
    total: number; comment?: string;
  }): Promise<void> {
    const itemsHtml = order.items.map(i => `
      <tr>
        <td style="padding:10px 14px;font-size:13.5px;color:${BRAND.dark};border-bottom:1px solid ${BRAND.border};">${this.esc(i.name)}</td>
        <td style="padding:10px 14px;font-size:13.5px;color:${BRAND.muted};text-align:center;border-bottom:1px solid ${BRAND.border};">×${i.qty}</td>
        <td style="padding:10px 14px;font-size:13.5px;font-weight:700;color:${BRAND.dark};text-align:right;border-bottom:1px solid ${BRAND.border};">${(i.price * i.qty).toLocaleString()} HTG</td>
      </tr>`).join('');

    const body = `
      ${this.hero('🛒', '#FFF8EC', 'Nouvelle commande reçue !', `Commande #${this.esc(order.number)}`)}
      ${this.greeting(sellerName)}
      ${this.para('Vous avez reçu une nouvelle commande. Connectez-vous à votre espace vendeur pour l\'accepter et mettre à jour son statut.')}

      <h3 style="margin:0 0 12px;color:${BRAND.dark};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Informations client</h3>
      ${this.table([
        ['Nom', order.customerName],
        ['Téléphone', order.customerPhone],
        ['Email', order.customerEmail],
        ['Adresse', order.customerAddress],
        ...(order.comment ? [['Commentaire', order.comment]] as [string,string][] : []),
      ])}

      <h3 style="margin:0 0 12px;color:${BRAND.dark};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Produits commandés</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid ${BRAND.border};margin:0 0 16px;">
        <thead><tr>
          <th style="padding:10px 14px;background:#F9FAFB;font-size:12px;color:${BRAND.muted};text-align:left;border-bottom:1px solid ${BRAND.border};">Produit</th>
          <th style="padding:10px 14px;background:#F9FAFB;font-size:12px;color:${BRAND.muted};text-align:center;border-bottom:1px solid ${BRAND.border};">Qté</th>
          <th style="padding:10px 14px;background:#F9FAFB;font-size:12px;color:${BRAND.muted};text-align:right;border-bottom:1px solid ${BRAND.border};">Sous-total</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:12px 14px;font-size:14px;font-weight:700;color:${BRAND.dark};">TOTAL</td>
          <td style="padding:12px 14px;font-size:18px;font-weight:900;color:${BRAND.orange};text-align:right;">${order.total.toLocaleString()} HTG</td>
        </tr></tfoot>
      </table>
      ${this.btn('Gérer cette commande →', `${BRAND.url}/seller/orders`)}
      ${this.alert('⚡ Répondez rapidement ! Les vendeurs qui traitent leurs commandes en moins de 2h reçoivent un badge <strong>"Réponse Rapide"</strong>.', 'info')}
    `;
    await this.send(to, `🛒 Nouvelle commande #${order.number} — DealPam`, this.layout('Nouvelle commande', `Nouvelle commande #${order.number} reçue sur DealPam.`, body), 'seller');
  }

  // ── 10. ORDER CONFIRMATION (to customer) ──────────────────────────────────

  async sendOrderConfirmationToCustomer(to: string, customerName: string, order: {
    number: string; sellerName: string; sellerPhone?: string; sellerEmail?: string;
    items: { name: string; qty: number; price: number }[];
    total: number;
  }): Promise<void> {
    const itemsHtml = order.items.map(i => `
      <tr>
        <td style="padding:9px 14px;font-size:13px;color:${BRAND.dark};border-bottom:1px solid ${BRAND.border};">${this.esc(i.name)}</td>
        <td style="padding:9px 14px;font-size:13px;color:${BRAND.muted};text-align:center;border-bottom:1px solid ${BRAND.border};">×${i.qty}</td>
        <td style="padding:9px 14px;font-size:13px;font-weight:700;color:${BRAND.dark};text-align:right;border-bottom:1px solid ${BRAND.border};">${(i.price * i.qty).toLocaleString()} HTG</td>
      </tr>`).join('');

    const body = `
      ${this.hero('📦', '#F0FDF4', 'Commande confirmée !', `Commande #${this.esc(order.number)}`)}
      ${this.greeting(customerName)}
      ${this.para(`Votre commande a bien été reçue par <strong>${this.esc(order.sellerName)}</strong>. Le vendeur va la traiter et vous contactera bientôt.`)}

      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid ${BRAND.border};margin:0 0 24px;">
        <thead><tr>
          <th colspan="3" style="padding:12px 14px;background:#F9FAFB;font-size:12px;color:${BRAND.muted};text-align:left;border-bottom:1px solid ${BRAND.border};text-transform:uppercase;letter-spacing:0.5px;">Récapitulatif</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:12px 14px;font-weight:700;color:${BRAND.dark};">TOTAL</td>
          <td style="padding:12px 14px;font-size:18px;font-weight:900;color:${BRAND.orange};text-align:right;">${order.total.toLocaleString()} HTG</td>
        </tr></tfoot>
      </table>

      <h3 style="margin:0 0 10px;color:${BRAND.dark};font-size:14px;font-weight:700;">Coordonnées du vendeur</h3>
      ${this.table([
        ['Boutique', order.sellerName],
        ...(order.sellerPhone ? [['Téléphone', order.sellerPhone]] as [string,string][] : []),
        ...(order.sellerEmail ? [['Email', order.sellerEmail]] as [string,string][] : []),
      ])}
      ${this.btn('Suivre ma commande', `${BRAND.url}/orders`)}
    `;
    await this.send(to, `📦 Commande #${order.number} confirmée — DealPam`, this.layout('Commande confirmée', `Votre commande #${order.number} sur DealPam est confirmée.`, body), 'client');
  }

  // ── 11. ORDER STATUS UPDATE ───────────────────────────────────────────────

  async sendOrderStatusUpdate(to: string, customerName: string, orderNumber: string, status: string, detail?: string): Promise<void> {
    const statusMap: Record<string, { icon: string; color: string; bg: string; title: string; msg: string }> = {
      CONFIRMED:   { icon: '✅', color: '#166534', bg: '#F0FDF4', title: 'Commande acceptée',    msg: 'Le vendeur a accepté votre commande et va commencer à la préparer.' },
      PREPARING:   { icon: '🔧', color: '#92400E', bg: '#FFFBEB', title: 'En préparation',       msg: 'Le vendeur prépare votre commande. Vous serez notifié dès l\'expédition.' },
      SHIPPED:     { icon: '🚚', color: '#1D4ED8', bg: '#EFF6FF', title: 'Commande expédiée',    msg: 'Votre commande est en route ! Préparez-vous à la recevoir.' },
      DELIVERED:   { icon: '📬', color: '#047857', bg: '#ECFDF5', title: 'Commande livrée',      msg: 'Votre commande a été livrée. N\'oubliez pas de laisser un avis !' },
      CANCELLED:   { icon: '❌', color: '#991B1B', bg: '#FFF1F2', title: 'Commande annulée',     msg: 'Votre commande a été annulée. Contactez le vendeur pour plus d\'informations.' },
    };
    const s = statusMap[status] || { icon: '📋', color: BRAND.orange, bg: '#FFF8EC', title: `Statut : ${status}`, msg: detail || 'Le statut de votre commande a été mis à jour.' };
    const body = `
      ${this.hero(s.icon, s.bg, s.title, `Commande #${this.esc(orderNumber)}`)}
      ${this.greeting(customerName)}
      ${this.para(s.msg)}
      ${detail ? this.alert(detail, 'info') : ''}
      ${status === 'DELIVERED' ? this.btn('Laisser un avis', `${BRAND.url}/orders`) : this.btn('Voir ma commande', `${BRAND.url}/orders`)}
    `;
    await this.send(to, `${s.icon} Commande #${orderNumber} — ${s.title} — DealPam`, this.layout(s.title, s.msg, body), 'client');
  }

  // ── 11bis. PRICE OFFER DECISION (accept/reject by seller) ─────────────────

  async sendOfferDecision(
    to: string, customerName: string, productName: string, offeredPriceHTG: number,
    decision: 'ACCEPTED' | 'REJECTED', reason?: string,
  ): Promise<void> {
    const isAccepted = decision === 'ACCEPTED';
    const body = isAccepted
      ? `
        ${this.hero('🎉', '#F0FDF4', 'Votre offre a été acceptée !', `${this.esc(productName)}`)}
        ${this.greeting(customerName)}
        ${this.para(`Bonne nouvelle ! Le vendeur a accepté votre offre de <strong>${offeredPriceHTG.toLocaleString()} HTG</strong> pour "${this.esc(productName)}".`)}
        ${this.alert('Votre commande suit maintenant son cours normal — le vendeur va la préparer.', 'success')}
        ${this.btn('Voir mes commandes', `${BRAND.url}/account/orders`)}
      `
      : `
        ${this.hero('📋', '#FFF8EC', 'Votre offre n\'a pas été acceptée', `${this.esc(productName)}`)}
        ${this.greeting(customerName)}
        ${this.para(`Le vendeur n'a pas pu accepter votre offre de <strong>${offeredPriceHTG.toLocaleString()} HTG</strong> pour "${this.esc(productName)}".`)}
        ${reason ? this.alert(this.esc(reason), 'warning') : ''}
        ${this.para('Vous pouvez soumettre une nouvelle offre à un montant plus élevé directement depuis la fiche produit.')}
      `;
    await this.send(
      to,
      isAccepted ? `🎉 Offre acceptée pour ${productName} — DealPam` : `Offre refusée pour ${productName} — DealPam`,
      this.layout(isAccepted ? 'Offre acceptée' : 'Offre refusée', isAccepted ? 'Votre offre de prix a été acceptée.' : 'Votre offre de prix a été refusée.', body),
      'client',
    );
  }

  // ── 12. NEW MESSAGE NOTIFICATION ──────────────────────────────────────────

  async sendNewMessageNotification(to: string, recipientName: string, senderName: string, preview: string, chatUrl: string, as: MailAccountType = 'client'): Promise<void> {
    const body = `
      ${this.hero('💬', '#EFF6FF', `Message de ${this.esc(senderName)}`)}
      ${this.greeting(recipientName)}
      ${this.para(`Vous avez reçu un nouveau message de <strong>${this.esc(senderName)}</strong> sur DealPam :`)}
      <div style="background:#F9FAFB;border-left:4px solid ${BRAND.orange};border-radius:0 10px 10px 0;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0;color:${BRAND.text};font-size:14.5px;font-style:italic;line-height:1.7;">"${this.esc(preview.slice(0, 200))}${preview.length > 200 ? '…' : ''}"</p>
      </div>
      ${this.btn('Répondre au message', chatUrl)}
    `;
    await this.send(to, `💬 Nouveau message de ${senderName} — DealPam`, this.layout('Nouveau message', `Nouveau message de ${senderName} sur DealPam.`, body), as);
  }

  // ── 13. SUBSCRIPTION EXPIRY REMINDER ─────────────────────────────────────

  async sendSubscriptionExpiryReminder(to: string, firstName: string, planName: string, daysLeft: number, renewUrl: string): Promise<void> {
    const isUrgent = daysLeft <= 3;
    const body = `
      ${this.hero(isUrgent ? '⚠️' : '🔔', isUrgent ? '#FFF1F2' : '#FFFBEB',
        isUrgent ? 'Abonnement sur le point d\'expirer !' : `Renouvellement dans ${daysLeft} jours`,
        `Plan ${this.esc(planName)}`)}
      ${this.greeting(firstName)}
      ${this.para(`Votre abonnement <strong>${this.esc(planName)}</strong> expire dans <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.`)}
      ${isUrgent
        ? this.alert('⚠️ Si vous ne renouvelez pas avant expiration, vos produits seront <strong>désactivés automatiquement</strong> et votre boutique ne sera plus visible.', 'error')
        : this.alert('💡 Renouvelez maintenant pour continuer à vendre sans interruption.', 'warning')}
      ${this.btn('Renouveler mon abonnement', renewUrl)}
    `;
    await this.send(to, `${isUrgent ? '⚠️' : '🔔'} Votre abonnement expire dans ${daysLeft}j — DealPam`, this.layout('Expiration abonnement', `Votre abonnement ${planName} expire dans ${daysLeft} jours.`, body), 'seller');
  }

  // ── 14. SUBSCRIPTION EXPIRED ──────────────────────────────────────────────

  async sendSubscriptionExpired(to: string, firstName: string, planName: string, renewUrl: string): Promise<void> {
    const body = `
      ${this.hero('⛔', '#FFF1F2', 'Abonnement expiré', `Plan ${this.esc(planName)}`)}
      ${this.greeting(firstName)}
      ${this.para(`Votre abonnement <strong>${this.esc(planName)}</strong> a expiré. Vos produits ont été <strong>temporairement désactivés</strong> et ne sont plus visibles sur la plateforme.`)}
      ${this.alert('📦 Vos produits et données sont conservés. Renouvelez votre abonnement pour les réactiver immédiatement.', 'warning')}
      ${this.btn('Renouveler et réactiver ma boutique', renewUrl)}
    `;
    await this.send(to, '⛔ Abonnement expiré — Réactivez votre boutique DealPam', this.layout('Abonnement expiré', `Votre abonnement ${planName} a expiré sur DealPam.`, body), 'seller');
  }

  // ── 15. SUBSCRIPTION RENEWED ──────────────────────────────────────────────

  async sendSubscriptionRenewed(to: string, firstName: string, planName: string, endDate: Date): Promise<void> {
    const end = endDate.toLocaleDateString('fr-FR', { timeZone: 'America/Port-au-Prince', dateStyle: 'long' });
    const body = `
      ${this.hero('🎊', '#F0FDF4', 'Abonnement renouvelé avec succès !', `Plan ${this.esc(planName)}`)}
      ${this.greeting(firstName)}
      ${this.para(`Votre abonnement <strong>${this.esc(planName)}</strong> a été renouvelé. Votre boutique est à nouveau entièrement active.`)}
      ${this.table([['Plan', planName], ['Actif jusqu\'au', end]])}
      ${this.btn('Gérer ma boutique', `${BRAND.url}/seller`)}
    `;
    await this.send(to, `🎊 Abonnement ${planName} renouvelé — DealPam`, this.layout('Abonnement renouvelé', `Votre abonnement DealPam a été renouvelé jusqu'au ${end}.`, body), 'seller');
  }

  // ── 16. NEWSLETTER WELCOME ────────────────────────────────────────────────

  async sendNewsletterWelcome(to: string, unsubscribeToken: string): Promise<void> {
    const unsubUrl = `${BRAND.url}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
    const body = `
      <div style="text-align:center;margin-bottom:32px;">
        <div style="width:68px;height:68px;background:#FFF8EC;border-radius:50%;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:30px;line-height:68px;">✉</span>
        </div>
        <h1 style="margin:0 0 8px;color:${BRAND.dark};font-size:24px;font-weight:800;letter-spacing:-0.5px;">Bienvenue dans la newsletter DealPam !</h1>
        <p style="margin:0;color:${BRAND.muted};font-size:15px;line-height:1.6;">Vous recevrez en avant-première nos meilleures offres.</p>
      </div>
      ${this.para(`Merci de vous être abonné à la newsletter <strong>DealPam</strong> — la marketplace haïtienne. Vous serez parmi les premiers informés de :`)}
      <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;">
        ${[
          ['Nouvelles promotions &amp; ventes flash', '#FF9900'],
          ['Arrivée de nouveaux vendeurs et boutiques', '#10B981'],
          ['Conseils exclusifs pour acheteurs', '#6366F1'],
          ['Événements spéciaux DealPam', '#EC4899'],
        ].map(([text, color]) => `
        <tr>
          <td style="padding:8px 0;vertical-align:top;width:24px;">
            <div style="width:8px;height:8px;background:${color};border-radius:50%;margin-top:6px;"></div>
          </td>
          <td style="padding:8px 0 8px 10px;color:${BRAND.text};font-size:14.5px;line-height:1.6;">${text}</td>
        </tr>`).join('')}
      </table>
      ${this.btn('Découvrir DealPam', BRAND.url)}
      ${this.divider()}
      <p style="margin:0;color:${BRAND.muted};font-size:12px;text-align:center;line-height:1.8;">
        Vous recevez cet email car vous vous êtes abonné sur <a href="${BRAND.url}" style="color:${BRAND.orange};">dealpam.com</a>.<br/>
        Pour vous désabonner à tout moment, cliquez ici :<br/>
        <a href="${unsubUrl}" style="color:#9CA3AF;font-size:11px;text-decoration:underline;">Se désabonner de la newsletter</a>
      </p>
    `;
    await this.send(
      to,
      'Bienvenue dans la newsletter DealPam',
      this.layout('Newsletter DealPam', 'Bienvenue ! Vous recevrez nos meilleures offres en avant-première.', body),
      'client',
    );
  }

  // ── 17. RAW / CUSTOM ──────────────────────────────────────────────────────

  async sendRaw(to: string, subject: string, bodyHtml: string, as: MailAccountType = 'client'): Promise<void> {
    await this.send(to, subject, this.layout(subject, subject, bodyHtml), as);
  }

  // ── INTERNAL ──────────────────────────────────────────────────────────────

  private async send(to: string, subject: string, html: string, as: MailAccountType = 'client'): Promise<void> {
    // En dev/local, les comptes vendeurs de seed ont des emails fictifs (@dealpam.com sans
    // boîte réelle) — chaque envoi rebondit et le compte SMTP reçoit la notification d'échec.
    // On n'envoie donc réellement qu'en production, et on trace l'email dans les logs sinon.
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DRY-RUN dev] Email non envoyé (compte=${as}, NODE_ENV≠production) → ${to}: ${subject}`);
      return;
    }
    const transporter = this.transporters.get(as);
    const account = this.accounts[as];
    if (!transporter || !account?.user) {
      this.logger.error(`Compte mail "${as}" non configuré — email à ${to} non envoyé (${subject})`);
      return;
    }
    try {
      await transporter.sendMail({ from: account.from, to, subject, html });
      this.logger.log(`Email sent (compte=${as}) to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email (compte=${as}) to ${to}: ${err.message}`);
    }
  }

  private esc(text: string): string {
    if (!text) return '';
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
  }
}
