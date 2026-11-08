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
3. Ouvrez le dépôt : vous voyez à gauche **Textes du site**, **Événements**, **Activités**, **Bureau**, **Pôles** et **Carnet de recherche**.
4. Modifiez, puis cliquez sur **Save**. Le site en ligne est mis à jour en une à deux minutes.

Pour ajouter un autre membre du bureau comme administrateur, deux possibilités :
- l'inviter comme collaborateur du dépôt sur GitHub (Settings → Collaborators) ;
- l'inviter par e-mail depuis Pages CMS, ce qui ne lui demande pas de compte GitHub.

### Photos de groupe du bureau (bureau étendu, bureau restreint)

Bureau → **Photos de groupe** → une entrée par photo : intitulé (ex. « Bureau étendu »), année, photo, description, puis la liste des **personnes**, chacune avec :

- son **nom** et sa **fonction** ;
- son **rang** : 1 pour le premier rang, 2 pour le second ;
- la **position de son visage** sur la photo, en pourcentage : `x` de 0 (bord gauche) à 100 (bord droit), `y` de 0 (haut) à 100 (bas).

Le site place lui-même les repères numérotés et rédige la légende « de gauche à droite ». Pour la photo actuelle du bureau étendu, les positions sont déjà réglées : il suffit de remplacer « Prénom Nom » et « Fonction », **dans l'ordre de gauche à droite**. Dès qu'une deuxième photo est ajoutée (bureau restreint), des onglets apparaissent pour passer de l'une à l'autre. Pour une nouvelle photo, je peux aussi calculer les positions à votre place.

### Modifier les pôles

Pôles → chaque pôle a un nom, une phrase courte, une présentation, une photo de groupe, les responsables, la liste des membres et une adresse e-mail (et, si vous le souhaitez, un lien Instagram). L'ordre des pôles dans l'admin est l'ordre d'affichage sur le site. Pensez à décocher « Afficher l'étiquette Exemple » une fois les vraies informations saisies.

### Publier un article dans le carnet de recherche

Le carnet a sa propre page (`/recherche/`), reliée au menu (« Recherche »), au pôle Recherche et à la page d'accueil (« Derniers articles »).

Carnet de recherche → Articles → **Add an entry**, puis :

1. **Titre**, **date**, **auteur(s)**, **rubrique** et **chapeau** (résumé de deux ou trois phrases).
2. **Texte de l'article** : l'éditeur permet les intertitres, le gras, l'italique, les listes, les citations et les liens. Les intertitres (« Titre 2 ») alimentent automatiquement le sommaire de l'article.
3. **Notes de bas de page** : ajoutez chaque note dans « Notes de bas de page », puis écrivez `[1]`, `[2]`… à l'endroit voulu du texte. Le site crée l'appel de note cliquable et le renvoi.
4. **Image** (facultative) et sa description.
5. **Save** : l'article apparaît en tête du carnet (« À la une ») en une à deux minutes.

Chaque article a sa propre adresse, par exemple `/recherche/qpc-mode-d-emploi/`, créée à partir du titre : on peut la partager, et chaque article a son propre titre dans Google et dans les aperçus de lien. Évitez de changer le titre (ou le champ « Adresse de l'article ») d'un article déjà diffusé : son adresse changerait. Une référence à citer (auteur, titre, carnet, date, adresse, date de consultation) est générée automatiquement en bas de chaque article.

Les trois articles livrés avec le site sont des **exemples** : remplacez-les par les travaux du pôle.

### Ajouter un événement

Événements → **Add an entry** → titre, date, heure, lieu, catégorie → Save.
Les événements passés basculent **automatiquement** dans « Événements passés ». Il n'y a rien à supprimer. Le prochain événement s'affiche aussi automatiquement sur l'image d'ouverture (encadré « Prochain rendez-vous »).

### Avant la mise en ligne publique

- [ ] Remplacer les **événements d'exemple** et décocher « Afficher le badge Exemple ».
- [ ] Compléter les noms et fonctions de la **photo de groupe** du bureau, avec l'accord des personnes.
- [ ] Compléter les **Pôles** (membres, adresses e-mail, photos) et retirer l'étiquette « Exemple ».
- [ ] Remplacer les **articles d'exemple** du carnet de recherche et indiquer l'adresse e-mail du pôle recherche.
- [ ] Indiquer le **montant de la cotisation** et le **lien HelloAsso** réel.
- [ ] Indiquer l'**adresse e-mail** de contact.
- [ ] Compléter les **mentions légales** : siège, numéro RNA, directeur de la publication.
- [ ] Vérifier le **sigle** et le **nom** de l'association.
- [ ] Faire valider l'usage du nom de l'Institut par sa direction.

## Passation d'une année sur l'autre

Transmettez au nouveau bureau l'identifiant et le mot de passe du compte GitHub, ainsi que l'accès à la double authentification. C'est la seule chose à transmettre.

## Respecter la charte graphique dans l'admin

- **Times New Roman** : un seul mot par phrase, et seulement dans les titres. Dans l'admin, mettez ce mot *entre astérisques* (champ « Art. 5 - Titre »). Pour le grand titre, inscrivez un ou plusieurs mots dans « mot en Times » : s'il y en a plusieurs, ils défilent l'un après l'autre.
- **Photos** : toutes les photos du site s'affichent en couleur (choix du bureau, qui déroge sur ce point à la charte, laquelle prévoyait le noir et blanc).
- **Logo** : n'utilisez que le sceau officiel (dossier `assets/brand`). Ne le recadrez pas et ne le modifiez pas.
- **Illustration de la page d'accueil** : indiquez son crédit (auteur ou agence) dans le champ « Crédit de l'illustration ». L'image elle-même ne se change pas depuis l'admin : le bâtiment et les arbres ont été détourés à la main pour que le sigle passe derrière. Une nouvelle image demandera un nouveau détourage.

## Les adresses du site

| Page | Adresse |
|---|---|
| Accueil | `/` (les sections : `/#poles`, `/#agenda`…) |
| Carnet de recherche | `/recherche/` |
| Un article | `/recherche/nom-de-l-article/` |
| Mentions légales | `/mentions-legales/` |

Les pages d'articles sont fabriquées automatiquement par GitHub à chaque enregistrement (fichiers `scripts/build.mjs` et `.github/workflows/publication.yml`). Le suivi de chaque publication se fait sur la page **Actions** du dépôt. Les anciennes adresses (`recherche.html`, `mentions-legales.html`) redirigent vers les nouvelles.
