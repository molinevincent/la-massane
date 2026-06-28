// ============================================================
//  /api/reserver.js  —  Fonction serveur (Vercel Function)
//
//  Reçoit la demande de réservation, la SÉCURISE, puis t'envoie
//  un email. Tout ce qui est sensible (clé email, ton adresse)
//  reste ICI, côté serveur — jamais visible dans le navigateur.
// ============================================================

import { Resend } from 'resend';

// --- Mémoire anti-spam (rate-limiting simple par IP) -----------
// Limite le nombre de demandes par IP sur une fenêtre de temps.
const RATE = { windowMs: 60 * 60 * 1000, max: 5 }; // 5 demandes / heure / IP
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, start: now };
  if (now - rec.start > RATE.windowMs) { rec.count = 0; rec.start = now; }
  rec.count++;
  hits.set(ip, rec);
  return rec.count > RATE.max;
}

// --- Nettoyage / validation des entrées ------------------------
function clean(str, maxLen) {
  return String(str || '').replace(/[<>]/g, '').trim().slice(0, maxLen);
}
function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 200;
}
function validDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// --- Vérification Turnstile (anti-robot Cloudflare) ------------
async function verifyTurnstile(token, ip) {
  if (!process.env.TURNSTILE_SECRET) return true; // désactivé tant que pas configuré
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
  // 1) N'accepte que les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnue';

  // 2) Rate-limiting : bloque les envois en rafale
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Trop de demandes. Réessayez dans une heure.' });
  }

  const body = req.body || {};

  // 3) HONEYPOT : si le champ piège est rempli, c'est un robot.
  //    On renvoie "succès" pour ne pas l'alerter, mais on n'envoie rien.
  if (body.company) {
    return res.status(200).json({ ok: true });
  }

  // 4) Anti-bot par délai : un humain met plus de 3 secondes à remplir.
  if (typeof body.elapsed === 'number' && body.elapsed < 3000) {
    return res.status(200).json({ ok: true }); // silencieux
  }

  // 5) Vérification Turnstile (si activée)
  const human = await verifyTurnstile(body.turnstileToken, ip);
  if (!human) {
    return res.status(400).json({ error: 'Vérification anti-robot échouée. Rechargez la page.' });
  }

  // 6) Validation des données
  const name = clean(body.name, 80);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const message = clean(body.message, 1500);
  const checkin = clean(body.checkin, 10);
  const checkout = clean(body.checkout, 10);

  if (!name || !validEmail(email)) {
    return res.status(400).json({ error: 'Nom ou email invalide.' });
  }
  if (!validDate(checkin) || !validDate(checkout)) {
    return res.status(400).json({ error: 'Dates invalides.' });
  }

  // 7) Envoi de l'email via Resend
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL,         // ex: "Villa <demande@votre-domaine.com>"
      to: process.env.OWNER_EMAIL,          // TON adresse, qui reçoit la demande
      replyTo: email,                        // répondre = répondre au voyageur
      subject: `Demande de réservation — ${name} (${checkin} → ${checkout})`,
      text:
`Nouvelle demande de réservation

Nom      : ${name}
Email    : ${email}
Téléphone: ${phone || '—'}
Arrivée  : ${checkin}
Départ   : ${checkout}

Message :
${message || '(aucun)'}

—
IP : ${ip}`
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erreur envoi email:', err);
    return res.status(500).json({ error: "L'email n'a pas pu être envoyé. Réessayez." });
  }
}
