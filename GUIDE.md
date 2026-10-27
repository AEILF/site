# Guide du site de l'association

Ce guide s'adresse au bureau, sans connaissance en code.

## Comment le site est organisé

| Élément | Rôle | Faut-il y toucher ? |
|---|---|---|
| `content/` | Tous les textes : présentation, agenda, activités, bureau | Oui, **par la page admin** |
| `images/` | Les photos envoyées depuis l'admin | Automatique |
| `index.html`, `assets/` | Le design et les animations | Non |
| `mentions-legales.html` | Mentions légales et confidentialité | Les informations se remplissent depuis l'admin |
| `.pages.yml` | Les réglages de la page admin | Non |

Coût total : **0 €**. Un nom de domaine personnalisé reste facultatif (une dizaine d'euros par an).

---

## Étape 1 : créer le compte GitHub de l'association

1. Allez sur https://github.com/signup.
2. Créez un compte **avec l'adresse e-mail de l'association**, pas une adresse personnelle. Le site pourra ainsi être transmis au bureau suivant.
3. Activez la double authentification (Settings → Password and authentication).

## Étape 2 : déposer le site sur GitHub

1. Cliquez sur **New repository** (bouton « + » en haut à droite).
2. Nom du dépôt : `site` par exemple. Choisissez **Public**, ce qui est nécessaire pour l'hébergement gratuit.
3. Sur la page du dépôt vide, cliquez sur **uploading an existing file**.
4. Glissez **tout le contenu** du dossier du site, y compris le fichier `.pages.yml`.
   Attention : sur Mac, les fichiers qui commencent par un point sont masqués. Faites Cmd + Maj + . dans le Finder pour les afficher.
5. Cliquez sur **Commit changes**.

## Étape 3 : mettre le site en ligne (GitHub Pages)

1. Dans le dépôt : **Settings → Pages**.
2. Sous « Build and deployment », Source : **Deploy from a branch**. Branch : **main**, dossier **/ (root)**. Cliquez sur **Save**.
3. Après une à deux minutes, l'adresse du site apparaît en haut de cette page, par exemple `https://nom-du-compte.github.io/site/`.

## Étape 4 : la page admin (Pages CMS)

1. Allez sur https://app.pagescms.org et connectez-vous **avec le compte GitHub de l'association**.
2. Autorisez l'accès au dépôt `site` quand c'est demandé.
3. Ouvrez le dépôt : vous voyez à gauche **Textes du site**, **Agenda**, **Activités** et **Bureau**.
4. Modifiez, puis cliquez sur **Save**. Le site en ligne est mis à jour en une à deux minutes.

Pour ajouter un autre membre du bureau comme administrateur, deux possibilités :
- l'inviter comme collaborateur du dépôt sur GitHub (Settings → Collaborators) ;
- l'inviter par e-mail depuis Pages CMS, ce qui ne lui demande pas de compte GitHub.

### Modifier les pôles

Pôles → chaque pôle a un nom, une phrase courte, une présentation, une photo de groupe, les responsables, la liste des membres et une adresse e-mail (et, si vous le souhaitez, un lien Instagram). L'ordre des pôles dans l'admin est l'ordre d'affichage sur le site. Pensez à décocher « Afficher l'étiquette Exemple » une fois les vraies informations saisies.

### Ajouter un événement

Événements → **Add an entry** → titre, date, heure, lieu, catégorie → Save.
Les événements passés basculent **automatiquement** dans « Événements passés ». Il n'y a rien à supprimer. Le prochain événement s'affiche aussi automatiquement sur l'image d'ouverture (encadré « Prochain rendez-vous »).

### Avant la mise en ligne publique

- [ ] Remplacer les **événements d'exemple** et décocher « Afficher le badge Exemple ».
- [ ] Remplacer « Prénom Nom » dans le **Bureau** et ajouter les photos, avec l'accord des personnes.
- [ ] Compléter les **Pôles** (membres, adresses e-mail, photos) et retirer l'étiquette « Exemple ».
- [ ] Indiquer le **montant de la cotisation** et le **lien HelloAsso** réel.
- [ ] Indiquer l'**adresse e-mail** de contact.
- [ ] Compléter les **mentions légales** : siège, numéro RNA, directeur de la publication.
- [ ] Vérifier le **sigle** et le **nom** de l'association.
- [ ] Faire valider l'usage du nom de l'Institut par sa direction.

## Passation d'une année sur l'autre

Transmettez au nouveau bureau l'identifiant et le mot de passe du compte GitHub, ainsi que l'accès à la double authentification. C'est la seule chose à transmettre.

## Respecter la charte graphique dans l'admin

- **Times New Roman** : un seul mot par phrase, et seulement dans les titres. Dans l'admin, mettez ce mot *entre astérisques* (champ « Art. 5 - Titre »). Pour le grand titre, inscrivez un ou plusieurs mots dans « mot en Times » : s'il y en a plusieurs, ils défilent l'un après l'autre.
- **Photos du bureau et des pôles** : par défaut, elles s'affichent en noir et blanc, comme le veut la charte. Envoyez-les en couleur, le site s'en charge. Pour les afficher en couleur, décochez « Photos du bureau et des pôles en noir et blanc » dans *Textes du site*. L'illustration de la page d'accueil, elle, reste toujours en couleur.
- **Logo** : n'utilisez que le sceau officiel (dossier `assets/brand`). Ne le recadrez pas et ne le modifiez pas.
- **Illustration de la page d'accueil** : indiquez son crédit (auteur ou agence) dans le champ « Crédit de l'illustration ». L'image elle-même ne se change pas depuis l'admin : le bâtiment et les arbres ont été détourés à la main pour que le sigle passe derrière. Une nouvelle image demandera un nouveau détourage.
