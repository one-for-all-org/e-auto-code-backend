# Backend - Assistant Code de la Route Madagascar

Stack : Node 22+, TypeScript, Express, PostgreSQL, bcryptjs, jsonwebtoken, zod, Gemini API, drizzle-orm.

## Installation

```bash
cd backend
npm install
```

Créer une base PostgreSQL, puis renseigner `DATABASE_URL` dans `.env`. Appliquer le schéma avec :

```bash
npm run db:migrate
```

### Migrer les données SQLite existantes (facultatif)

Après la migration du schéma, renseigner `SQLITE_IMPORT_PATH` vers l'ancienne base, puis exécuter une seule fois :

```bash
npm run db:import-sqlite
```

L'import conserve les identifiants, utilisateurs, conversations et messages ; les enregistrements déjà présents dans PostgreSQL ne sont pas écrasés.

### Créer le premier administrateur

Configurer `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans `.env`, puis lancer :

```bash
npm run db:seed-admin
```

Le seeder est relançable : il crée l'admin s'il n'existe pas, ou attribue le rôle `ADMIN` au compte correspondant.

## Variables d'environnement

Créer un fichier `.env` à la racine de `backend/` (exemple dans `.env.example`) :

```
PORT=3000
JWT_SECRET=change_this_to_a_32_char_minimum_secret_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
GEMINI_API_KEY=votre_cle_gemini
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-1.5-flash-8b
# Facultatif : fournisseurs de secours après Gemini (dans l'ordre)
GROQ_API_KEY=votre_cle_groq
GROQ_MODEL=qwen/qwen3.8-27b
OPENROUTER_API_KEY=votre_cle_openrouter
# Cloudflare Workers AI - modèle avec vision, clé facultative
CLOUDFLARE_ACCOUNT_ID=votre_compte_cloudflare
CLOUDFLARE_API_TOKEN=votre_token_cloudflare
CLOUDFLARE_MODEL=mistral-small-3.1-24b-instruct
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/code_route
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=un-mot-de-passe-long-et-unique
LESSON_UPLOAD_DIR=./uploads/lessons
DB_PATH=./data/app.sqlite

# SMTP (envoi des OTP par email)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=votre_email@example.com
SMTP_PASS=votre_mot_de_passe_app
SMTP_FROM=noreply@example.com

# OTP (défaut 10 minutes)
OTP_EXPIRES_IN=10m
```

> `JWT_SECRET` doit faire au moins 32 caractères, sinon le serveur refuse de démarrer.

## Profils d'usagers et réponses Gemini

Chaque compte possède un profil d'usage de la route distinct du rôle d'accès `USER`/`ADMIN` : `DRIVER`, `PASSENGER`, `PEDESTRIAN` ou `CITIZEN`. La migration Drizzle `0002_public_doctor_spectrum.sql` ajoute ce champ avec `CITIZEN` par défaut, y compris pour les comptes déjà présents. Les utilisateurs peuvent ensuite modifier leur profil depuis l'application.

Les réponses IA peuvent couvrir le code de la route, l'auto-école, la préparation au permis et les démarches ou documents associés à l'usage de la route à Madagascar. Les documents de référence validés par les administrateurs sont transmis en priorité dans le contexte.

Le backend essaie les fournisseurs dans cet ordre : **Gemini**, puis **Gemini Flash-Lite** (même clé, quota séparé), puis **Groq**, **Cloudflare Workers AI** et enfin **OpenRouter** (modèles `:free` uniquement). Chaque fournisseur n'est activé que si sa ou ses clés API sont configurées ; un fournisseur dont la clé est absente est ignoré sans erreur, et l'application fonctionne avec n'importe quel sous-ensemble de clés. OpenRouter utilise son routeur `openrouter/free`, qui ne sélectionne que des modèles gratuits. Le passage au fournisseur suivant se fait uniquement en cas de quota épuisé (HTTP 429 ou erreur de quota) ou de panne temporaire (réseau, délai dépassé ou HTTP 5xx). Une clé invalide (401/403) ou une requête incorrecte (400) ne déclenche pas de bascule. Si tous les fournisseurs échouent, une erreur 429 est renvoyée quand tous étaient en quota, sinon 502. Les quotas, disponibilités et performances des offres gratuites peuvent varier.

Gemini reste le seul fournisseur avec Google Search dans cette configuration. Avant d'envoyer une image à un fournisseur de secours, le backend la redimensionne si nécessaire (1 536 px maximum sur le plus grand côté) afin d'économiser les tokens. Une réponse de secours utilise les documents validés fournis, mais ne fait pas de recherche web et ne doit pas inventer de citations. Les images sont transmises aux modèles de vision ; pour les fournisseurs de secours, le backend extrait le texte des PDF, donc les PDF numérisés sans couche texte ne peuvent pas être analysés par le secours (un message clair est renvoyé plutôt qu'une réponse vide). Les fichiers envoyés sont transmis au fournisseur effectivement sollicité ; consultez les conditions de confidentialité de chaque fournisseur avant d'activer les clés.

Le backend accepte aussi `lang` (`fr`, `en` ou `mg`) avec chaque message et demande à Gemini de répondre dans cette langue. La préférence d'usager est chargée côté serveur depuis le profil du compte.

## Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarre en développement avec **nodemon** (rechargement automatique) |
| `npm run build` | Compile le TypeScript vers `dist/` |
| `npm start` | Démarre en production avec `node dist/server.js` (sans nodemon) |

## Connexion à la base SQLite en CLI

La base est un fichier SQLite (`./data/app.sqlite`). Vous pouvez l'interroger avec l'outil `sqlite3` s'il est installé :

```bash
# Ouvrir la base
sqlite3 data/app.sqlite

# Lister les tables
.tables

# Voir le schéma d'une table
.schema users

# Quitter
.quit
```

Sinon, utilisez Node avec `better-sqlite3` :

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database('./data/app.sqlite');
console.log(db.prepare('SELECT * FROM users').all());
db.close();
"
```

## Manipulation basique des données (SQL)

Dans l'invite `sqlite3` :

```sql
-- Voir tous les utilisateurs
SELECT id, name, email, role, is_ok, is_blocked FROM users;

-- Supprimer un utilisateur par email
DELETE FROM users WHERE email = 'exemple@test.com';

-- Bloquer / débloquer un utilisateur
UPDATE users SET is_blocked = 1 WHERE email = 'exemple@test.com';
UPDATE users SET is_blocked = 0 WHERE email = 'exemple@test.com';

-- Vider toutes les conversations
DELETE FROM conversations;

-- Vider tous les messages
DELETE FROM messages;

-- Supprimer tous les codes OTP
DELETE FROM otp_codes;

-- Révoquer tous les refresh tokens
DELETE FROM refresh_tokens;

-- Vider totalement la base (toutes les tables)
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM otp_codes;
DELETE FROM refresh_tokens;
DELETE FROM users;
```

## Vider totalement la base de données

Supprimez simplement le fichier de base :

```bash
# PowerShell
Remove-Item -Recurse -Force data

# Linux / macOS
rm -rf data
```

Le schéma est recréé automatiquement au démarrage du serveur (`src/config/init-db.ts`).

## Sécurité

- Mots de passe hashés avec **bcryptjs** (coût 12).
- Jetons d'accès (`access_token`) et de rafraîchissement (`refresh_token`) stockés en cookies `httpOnly`.
- Le refresh token est persisté en base pour pouvoir être révoqué (déconnexion, changement de mot de passe).
- Les routes `/admin/*` nécessitent le rôle `ADMIN`.
- Seuls les administrateurs peuvent ajouter ou supprimer des leçons PDF/TXT (10 Mo maximum). Les documents sont contrôlés par Gemini avant stockage dans `LESSON_UPLOAD_DIR` et servent ensuite de contexte aux réponses.
- Configurez un serveur SMTP pour permettre la réinitialisation de mot de passe par email. Le code OTP n'est journalisé qu'en développement.

## Envoi des OTP par email (SMTP)

Les OTP (mot de passe oublié + bienvenue à l'inscription) sont envoyés par email si les variables SMTP sont configurées dans `.env` :

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=votre_email@example.com
SMTP_PASS=votre_mot_de_passe_app
SMTP_FROM=noreply@example.com
OTP_EXPIRES_IN=10m
```

Si SMTP n'est pas configuré, le code OTP est simplement affiché dans les logs du serveur (`[OTP] ...`) pour le développement.

## Pages frontend

Toutes les routes backend ont leur page React correspondante dans `frontend/src/features/auth/pages/` :

- `/login` → `LoginPage.tsx`
- `/register` → `RegisterPage.tsx`
- `/forgot-password` → `ForgotPasswordPage.tsx`
- `/reset-password` → `ResetPasswordPage.tsx`

Le frontend est configuré via `frontend/.env` :
```
VITE_API_URL=http://localhost:3000/api
VITE_USE_MOCK=false
```

## Routes principales

```
POST   /api/auth/register          Créer un compte
POST   /api/auth/login             Se connecter (cookie access_token + refresh_token)
POST   /api/auth/logout            Se déconnecter (révoque le refresh token)
POST   /api/auth/refresh           Renouveler l'access_token
POST   /api/auth/forgot-password   Demander un code OTP
POST   /api/auth/reset-password    Réinitialiser le mot de passe
GET    /api/me                     Profil connecté
PATCH  /api/me                     Modifier nom / mot de passe
GET    /api/conversations          Liste des conversations
POST   /api/conversations          Créer une conversation
PATCH  /api/conversations/:id      Renommer
DELETE /api/conversations/:id      Supprimer
GET    /api/conversations/:id/messages  Voir les messages
POST   /api/conversations/:id/messages  Envoyer un message (+ fichier joint)
GET    /api/health                 Santé de l'API
GET    /api/admin/users            Liste utilisateurs (ADMIN)
POST   /api/admin/users            Créer un utilisateur (ADMIN)
PATCH  /api/admin/users/:id        Modifier un utilisateur (ADMIN)
DELETE /api/admin/users/:id        Supprimer un utilisateur (ADMIN)
```
