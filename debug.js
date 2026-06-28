import { Resend } from 'resend';

// Endpoint de diagnostic — ouvre /api/debug dans le navigateur.
// Ajoute ?send=1 pour tenter un vrai envoi de test : /api/debug?send=1

export default async function handler(req, res) {
  const VERSION = "diag-v1-2026-06-28";

  const env = {
    OWNER_EMAIL_1: process.env.OWNER_EMAIL_1 ? `présent (${process.env.OWNER_EMAIL_1.length} car.)` : "VIDE",
    OWNER_EMAIL_2: process.env.OWNER_EMAIL_2 ? `présent (${process.env.OWNER_EMAIL_2.length} car.)` : "VIDE",
    FROM_EMAIL:    process.env.FROM_EMAIL    ? `présent (${process.env.FROM_EMAIL})`               : "VIDE",
    RESEND_API_KEY: process.env.RESEND_API_KEY ? `présent (commence par ${process.env.RESEND_API_KEY.slice(0,5)}…)` : "VIDE",
  };

  const to = [process.env.OWNER_EMAIL_1, process.env.OWNER_EMAIL_2].filter(Boolean);

  const report = {
    version_du_code: VERSION,
    variables: env,
    destinataires_calcules: to,
    nombre_destinataires: to.length,
  };

  // Test d'envoi réel si ?send=1
  if (req.query.send === "1") {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: to,
        subject: "Test diagnostic — La Massane",
        text: "Ceci est un email de test envoyé depuis /api/debug?send=1"
      });
      report.test_envoi = {
        statut: "APPELÉ",
        reponse_resend: result
      };
    } catch (err) {
      report.test_envoi = {
        statut: "ERREUR",
        message: err?.message,
        detail: JSON.stringify(err)
      };
    }
  } else {
    report.astuce = "Ajoute ?send=1 à l'URL pour tenter un vrai envoi : /api/debug?send=1";
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).send(JSON.stringify(report, null, 2));
}
