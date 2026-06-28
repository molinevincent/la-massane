# Guide de déploiement — Villa Les Oliviers

Ce guide te conduit du dossier de fichiers jusqu'à un site en ligne, sécurisé et référencé. Aucune compétence de code n'est requise : tu copies, tu cliques, tu suis l'ordre.

Compte environ 1 heure la première fois. Tout est gratuit pour un site comme le tien.

---

## Vue d'ensemble : ce que tu vas faire

1. Créer 3 comptes gratuits (Vercel, Resend, et un endroit où stocker les fichiers : GitHub)
2. Mettre tes vrais contenus (textes, photos, prix) dans les fichiers
3. Déployer sur Vercel
4. Brancher l'email et le nom de domaine
5. Activer la protection anti-robot et soumettre le site à Google

---

## Étape 1 — Les fichiers du projet

Le dossier contient :

```
villa-vercel/
├── public/
│   ├── index.html      ← la page du site (textes, photos, prix)
│   ├── robots.txt      ← autorise Google à référencer
│   └── sitemap.xml     ← plan du site pour Google
├── api/
│   └── reserver.js     ← le serveur qui reçoit le formulaire et envoie l'email
├── vercel.json         ← en-têtes de sécurité
├── package.json        ← liste des outils nécessaires
└── .env.example        ← modèle des "secrets" (clés, ton email)
```

Tu n'as pas besoin de comprendre chaque fichier. Les seuls que tu modifieras à la main sont `index.html`, `robots.txt` et `sitemap.xml`.

---

## Étape 2 — Personnaliser le contenu

Ouvre `public/index.html` avec un éditeur de texte simple (Bloc-notes sur Windows, TextEdit sur Mac, ou mieux : l'éditeur gratuit VS Code). Cherche les mentions `👉` : ce sont les endroits à remplacer.

**À remplacer :**

- Le titre, la description, le nom de la villa (en haut, balises SEO)
- `VOTRE-DOMAINE.com` → ton vrai domaine (apparaît plusieurs fois, fais Rechercher/Remplacer tout)
- Le texte de la section « La maison »
- La liste des équipements
- Les **prix** : cherche `var BASE = 180;` et modifie les chiffres
- Les **dates indisponibles** : cherche `var BLOCKED` et liste tes dates déjà réservées au format `"2026-07-10"`

**Les photos.** Crée un dossier `public/photos/` et mets-y tes images (idéalement nommées `1.jpg`, `2.jpg`…). Puis dans la galerie, remplace chaque bloc gris :

```html
<div class="g-item g-main"><span class="ph">Photo principale</span></div>
```

par une vraie image :

```html
<div class="g-item g-main"><img src="/photos/1.jpg" alt="Terrasse de la villa au coucher du soleil"></div>
```

Conseil photos : ne mets pas des fichiers énormes. Redimensionne-les à environ 1600 px de large et compresse-les (le site [squoosh.app](https://squoosh.app) le fait gratuitement). Le `alt="..."` décrit l'image — c'est bon pour Google et pour l'accessibilité.

Fais de même dans `robots.txt` et `sitemap.xml` : remplace `VOTRE-DOMAINE.com` par ton domaine.

---

## Étape 3 — Mettre les fichiers sur GitHub

Vercel récupère ton site depuis GitHub. C'est l'option la plus simple et la plus durable.

1. Crée un compte gratuit sur [github.com](https://github.com).
2. Clique sur le **+** en haut à droite → **New repository**.
3. Donne-lui un nom (ex. `villa-oliviers`), laisse-le en **Private** si tu veux, puis **Create repository**.
4. Sur la page du dépôt vide, clique sur **uploading an existing file**.
5. Glisse TOUT le contenu du dossier `villa-vercel` (les dossiers `public`, `api`, et les fichiers `vercel.json`, `package.json`). **N'envoie pas** de fichier `.env` réel — uniquement `.env.example`.
6. Clique **Commit changes**.

---

## Étape 4 — Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com) et inscris-toi **avec ton compte GitHub** (bouton « Continue with GitHub »).
2. Clique **Add New → Project**.
3. Vercel liste tes dépôts GitHub : choisis `villa-oliviers` → **Import**.
4. Laisse tous les réglages par défaut (Vercel détecte tout seul). Clique **Deploy**.
5. Patiente une minute. Tu obtiens une adresse du type `villa-oliviers.vercel.app` — ton site est en ligne !

À ce stade, le site s'affiche et le calendrier fonctionne. Le formulaire, lui, ne peut pas encore envoyer d'email : il manque la clé. C'est l'étape suivante.

---

## Étape 5 — Brancher l'envoi d'email (Resend)

1. Crée un compte gratuit sur [resend.com](https://resend.com).
2. Dans Resend, va dans **API Keys → Create API Key**. Copie la clé (commence par `re_...`).
3. Pour pouvoir envoyer depuis `@ton-domaine.com`, va dans **Domains → Add Domain**, entre ton domaine, et ajoute les enregistrements DNS indiqués chez ton fournisseur de domaine. (Si tu n'as pas encore de domaine, tu peux temporairement utiliser l'adresse de test fournie par Resend.)
4. Retourne sur **Vercel → ton projet → Settings → Environment Variables**. Ajoute ces trois variables :

   | Nom | Valeur |
   |-----|--------|
   | `RESEND_API_KEY` | ta clé `re_...` |
   | `FROM_EMAIL` | `Villa Les Oliviers <demande@ton-domaine.com>` |
   | `OWNER_EMAIL` | ton adresse personnelle qui reçoit les demandes |

5. Onglet **Deployments → ⋯ sur le dernier → Redeploy** pour que les variables soient prises en compte.

Teste : remplis le formulaire sur ton site, tu dois recevoir un email. Si rien n'arrive, vérifie tes spams et les valeurs des variables.

---

## Étape 6 — Le nom de domaine

1. Achète ton domaine (OVH, Gandi, Namecheap… environ 10–15 €/an).
2. Dans **Vercel → ton projet → Settings → Domains → Add**, entre ton domaine.
3. Vercel t'indique 1 ou 2 lignes à copier dans la zone DNS de ton fournisseur. Une fois fait, le HTTPS (cadenas) s'active automatiquement et gratuitement.

---

## Étape 7 — La protection anti-robot (Cloudflare Turnstile)

Le formulaire est déjà protégé par deux mécanismes invisibles (champ piège + détection de vitesse) et par une limite d'envois par adresse. Turnstile ajoute une troisième couche, recommandée mais non obligatoire au lancement.

1. Crée un compte gratuit sur [cloudflare.com](https://cloudflare.com).
2. Va dans **Turnstile → Add Site**, entre ton domaine. Tu obtiens deux clés : une **publique** (site key) et une **secrète**.
3. Dans `index.html`, retire les `<!-- -->` autour de la ligne du script Turnstile (dans le `<head>`) et autour de la ligne `<div class="cf-turnstile" ...>`. Remplace `VOTRE_CLE_PUBLIQUE_TURNSTILE` par ta clé publique.
4. Dans Vercel, ajoute une variable d'environnement `TURNSTILE_SECRET` avec ta clé secrète, puis redéploie.

---

## Étape 8 — Le référencement Google

1. Va sur [Google Search Console](https://search.google.com/search-console).
2. Ajoute ta propriété (ton domaine) et valide-la (Vercel/ton fournisseur DNS facilitent la vérification).
3. Dans **Sitemaps**, soumets `https://ton-domaine.com/sitemap.xml`.

Google mettra quelques jours à quelques semaines à indexer le site. Les données structurées déjà présentes dans la page lui permettront d'afficher ta note et tes informations dans les résultats.

---

## Ce qui est protégé, et les limites honnêtes

**Bien protégé :**
- Tes secrets (clé email, ton adresse) ne sont jamais visibles côté navigateur — ils vivent dans les variables Vercel.
- Le formulaire résiste aux robots (3 couches) et au spam en rafale (limite par adresse).
- HTTPS, en-têtes de sécurité et politique de contenu (CSP) sont actifs.
- Les entrées du formulaire sont nettoyées avant traitement.

**Limites à connaître :**
- **Les photos d'un site public sont, par nature, téléchargeables.** Pour que Google les référence, il doit pouvoir les voir — donc un visiteur déterminé aussi. On décourage le vol facile (clic droit désactivé) et on évite de publier du très haute résolution, mais on ne peut pas l'empêcher totalement. Si une image compte beaucoup pour toi, ajoute un filigrane discret.
- Le calendrier de disponibilités se met à jour **à la main** dans `index.html` (variable `BLOCKED`), comme convenu. C'est volontairement simple. Si un jour tu veux une synchronisation automatique avec Airbnb, c'est une évolution possible.
- Ce système gère des **demandes** de réservation que tu valides, pas un paiement automatique. C'est le choix le plus sûr pour démarrer.

---

## En cas de souci

- **Le formulaire dit « erreur »** → vérifie les 3 variables d'environnement dans Vercel et qu'un redéploiement a bien eu lieu.
- **Je ne reçois pas l'email** → regarde les spams ; vérifie que le domaine est validé dans Resend.
- **Le site ne se met pas à jour** → chaque envoi de fichiers sur GitHub redéclenche automatiquement un déploiement Vercel ; patiente une minute.

Bon lancement.
