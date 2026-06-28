import { Resend } from 'resend';

const RATE = { windowMs: 60 * 60 * 1000, max: 5 };
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, start: now };
  if (now - rec.start > RATE.windowMs) { rec.count = 0; rec.start = now; }
  rec.count++;
  hits.set(ip, rec);
  return rec.count > RATE.max;
}

function clean(str, maxLen) {
  return String(str || '').replace(/[<>]/g, '').trim().slice(0, maxLen);
}
function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 200;
}
function validDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

async function verifyTurnstile(token, ip) {
  if (!process.env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: token, remoteip: ip })
  });
  const data = await r.json();
  return data.success === true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnue';
  console.log('[reserver] nouvelle requête depuis', ip);

  if (rateLimited(ip)) {
    console.log('[reserver] rate-limited:', ip);
    return res.status(429).json({ error: 'Trop de demandes. Réessayez dans une heure.' });
  }

  const body = req.body || {};
  console.log('[reserver] body reçu:', JSON.stringify({
    name: body.name,
    email: body.email,
    checkin: body.checkin,
    checkout: body.checkout,
    elapsed: body.elapsed,
    honeypot: !!body.company
  }));

  // Honeypot
  if (body.company) {
    console.log('[reserver] honeypot déclenché');
    return res.status(200).json({ ok: true });
  }

  // Anti-bot délai : assoupli à 1,5 s (3 s était trop strict pour certains navigateurs)
  if (typeof body.elapsed === 'number' && body.elapsed < 1500) {
    console.log('[reserver] envoi trop rapide:', body.elapsed, 'ms');
    return res.status(200).json({ ok: true });
  }

  // Turnstile
  const human = await verifyTurnstile(body.turnstileToken, ip);
  if (!human) {
    console.log('[reserver] turnstile échoué');
    return res.status(400).json({ error: 'Vérification anti-robot échouée. Rechargez la page.' });
  }

  // Validation
  const name     = clean(body.name, 80);
  const email    = clean(body.email, 200);
  const phone    = clean(body.phone, 40);
  const message  = clean(body.message, 1500);
  const checkin  = clean(body.checkin, 10);
  const checkout = clean(body.checkout, 10);

  if (!name || !validEmail(email)) {
    console.log('[reserver] nom/email invalide — name:', name, 'email:', email);
    return res.status(400).json({ error: 'Nom ou email invalide.' });
  }

  // Dates : on avertit si absentes mais on ne bloque plus — le JS côté client
  // les vérifie déjà ; ici on met juste un message clair dans l'email.
  const datesOk = validDate(checkin) && validDate(checkout);
  if (!datesOk) {
    console.log('[reserver] dates manquantes ou invalides — checkin:', checkin, 'checkout:', checkout);
    return res.status(400).json({ error: 'Veuillez sélectionner vos dates dans le calendrier avant d\'envoyer.' });
  }

  // Envoi
  console.log('[reserver] ENV CHECK — EMAIL_1:', process.env.OWNER_EMAIL_1 || 'VIDE', '| EMAIL_2:', process.env.OWNER_EMAIL_2 || 'VIDE', '| RESEND_KEY:', process.env.RESEND_API_KEY ? 'OK' : 'MANQUANTE', '| FROM:', process.env.FROM_EMAIL || 'VIDE');
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from:    process.env.FROM_EMAIL,
      to:      ['molinevincent@gmail.com', 'sophiemas@gmail.com'],
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

—
IP : ${ip}`
    });
    console.log('[reserver] Resend OK, id:', result?.data?.id);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[reserver] erreur Resend:', err?.message, err?.statusCode, JSON.stringify(err));
    return res.status(500).json({ error: "L'email n'a pas pu être envoyé. Réessayez dans quelques instants." });
  }
}
