import { Resend } from 'resend';

function clean(str, maxLen) {
  return String(str || '').replace(/[<>]/g, '').trim().slice(0, maxLen);
}
function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 200;
}
function validDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const body = req.body || {};

  // Honeypot anti-robot
  if (body.company) {
    return res.status(200).json({ ok: true });
  }

  // Validation nom + email
  const name     = clean(body.name, 80);
  const email    = clean(body.email, 200);
  const phone    = clean(body.phone, 40);
  const message  = clean(body.message, 1500);
  const checkin  = clean(body.checkin, 10);
  const checkout = clean(body.checkout, 10);

  if (!name || !validEmail(email)) {
    return res.status(400).json({ error: 'Nom ou email invalide.' });
  }
  if (!validDate(checkin) || !validDate(checkout)) {
    return res.status(400).json({ error: 'Veuillez sélectionner vos dates dans le calendrier.' });
  }

  // Destinataires
  const to = [process.env.OWNER_EMAIL_1, process.env.OWNER_EMAIL_2].filter(Boolean);
  console.log('[reserver] to:', JSON.stringify(to));
  console.log('[reserver] from:', process.env.FROM_EMAIL);
  console.log('[reserver] resend key présente:', !!process.env.RESEND_API_KEY);

  if (to.length === 0) {
    console.error('[reserver] OWNER_EMAIL_1 et OWNER_EMAIL_2 sont vides');
    return res.status(500).json({ error: 'Configuration manquante côté serveur.' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from:    process.env.FROM_EMAIL,
      to:      to,
      replyTo: email,
      subject: `Demande de réservation — ${name} (${checkin} → ${checkout})`,
      text:
`Nouvelle demande de réservation — La Massane

Nom       : ${name}
Email     : ${email}
Téléphone : ${phone || '—'}
Arrivée   : ${checkin}
Départ    : ${checkout}

Message :
${message || '(aucun)'}

---
IP : ${req.headers['x-forwarded-for'] || 'inconnue'}`
    });
    console.log('[reserver] succès, id Resend:', result?.data?.id);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[reserver] erreur Resend:', JSON.stringify(err));
    return res.status(500).json({ error: "L'email n'a pas pu être envoyé. Réessayez." });
  }
}
