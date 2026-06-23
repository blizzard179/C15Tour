# C15 Tour

C15 Tour est un projet compose d'une application web, d'une application mobile et d'une API back-end. Il permet de preparer, partager et suivre des convois routiers.

## Description

La partie web est destinee aux organisateurs de convois. Elle permet de creer un convoi, de definir ses etapes, de calculer un itineraire, d'enregistrer les informations en base de donnees et de partager les codes d'acces avec les participants.

L'application mobile est destinee aux participants et au vehicule de tete. Les participants peuvent rejoindre un convoi avec un code ou un QR code, consulter l'itineraire, suivre l'avancement du trajet et recevoir des messages audio. Le vehicule de tete dispose aussi de fonctionnalites d'administration, notamment le partage de sa position et l'envoi d'indications audio.

## Fonctionnalites

### Application web

- Creation et modification d'un convoi.
- Gestion des etapes et des pauses du trajet.
- Calcul d'itineraire.
- Generation de codes d'acces utilisateur et administrateur.
- Partage d'un convoi avec les participants.
- Consultation et recherche de convois existants.
- Export du trajet en PDF ou en GPX.

### Application mobile

- Connexion et acces a un convoi.
- Rejoindre un convoi avec un code.
- Scan d'un QR code.
- Affichage du trajet et de la position.
- Suivi de la vitesse du convoi.
- Reception et emission de messages audio.
- Gestion des permissions de localisation, camera et microphone.

### API back-end

- Gestion des convois.
- Gestion des etapes.
- Geocodage et geocodage inverse.
- Calcul d'itineraire via Valhalla.
- Enregistrement et recuperation de telemetrie.
- Signalisation audio en temps reel.
- Tableau de bord organisateur.

## Technologies utilisees

- React et Vite pour l'application web.
- React Native, Expo et Expo Router pour l'application mobile.
- Node.js et Express pour l'API.
- Prisma pour l'acces aux donnees.
- MySQL pour la base de donnees.
- Jest et Vitest pour les tests.
- Git et GitHub pour le versioning.

## Prerequis

Avant de lancer le projet, installer :

- Node.js
- npm
- Git
- Expo Go sur mobile, si l'application mobile est testee sur telephone
- Une base de donnees MySQL

## Installation

Cloner le projet :

```bash
git clone URL_DU_PROJET
cd C15Tour
```

Installer les dependances du back-end :

```bash
cd web/backend
npm install
```

Installer les dependances de l'application web :

```bash
cd ../C15Tour
npm install
```

Installer les dependances de l'application mobile :

```bash
cd ../../mobile/C15Tour-mobile
npm install
```

## Configuration

Le back-end utilise une variable d'environnement `DATABASE_URL` pour se connecter a MySQL.

Creer un fichier `.env` dans `web/backend` avec une valeur adaptee a votre environnement :

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/NOM_DE_LA_BASE"
PORT=3000
```

Generer le client Prisma depuis le dossier `web/backend` :

```bash
npx prisma generate
```

Si la base doit etre synchronisee avec le schema Prisma :

```bash
npx prisma db push
```

## Lancement

Lancer l'API :

```bash
cd web/backend
npm start
```

En developpement, il est aussi possible d'utiliser :

```bash
npm run dev
```

Lancer l'application web :

```bash
cd web/C15Tour
npm run dev
```

Lancer l'application mobile :

```bash
cd mobile/C15Tour-mobile
npm start
```

Puis scanner le QR code avec Expo Go ou lancer une cible Android/iOS si l'environnement est configure.

## Tests

Tests du back-end :

```bash
cd web/backend
npm test
```

Tests de l'application web :

```bash
cd web/C15Tour
npm run test:run
```

Lint de l'application web :

```bash
cd web/C15Tour
npm run lint
```

Lint de l'application mobile :

```bash
cd mobile/C15Tour-mobile
npm run lint
```

## Structure du projet

```text
C15Tour/
|-- README.md
|-- package.json
|-- scripts/
|   `-- prepare-android-build.sh
|-- shared/
|   |-- index.js
|   `-- global_assets/
|       |-- animations/
|       |-- gif/
|       |-- logos/
|       `-- pictos/
|-- web/
|   |-- C15Tour/
|   |   |-- index.html
|   |   |-- package.json
|   |   |-- vite.config.js
|   |   `-- src/
|   |       |-- App.jsx
|   |       |-- main.jsx
|   |       |-- Home.jsx
|   |       |-- Carte.jsx
|   |       |-- components/
|   |       |-- css/
|   |       |-- helper/
|   |       |-- test/
|   |       `-- utils/
|   `-- backend/
|       |-- package.json
|       |-- prisma/
|       |   `-- schema.prisma
|       `-- src/
|           |-- index.js
|           |-- server.js
|           |-- db.js
|           |-- config/
|           |-- controllers/
|           |-- middlewares/
|           |-- routes/
|           |-- services/
|           `-- __tests__/
|-- mobile/
|   `-- C15Tour-mobile/
|       |-- app.json
|       |-- package.json
|       |-- app/
|       |   |-- _layout.tsx
|       |   |-- index.tsx
|       |   |-- login.tsx
|       |   |-- join.tsx
|       |   |-- scan-qr.tsx
|       |   |-- modal.tsx
|       |   |-- (tabs)/
|       |   `-- services/
|       |-- components/
|       |-- constants/
|       |-- context/
|       |-- hooks/
|       |-- assets/
|       `-- android/
`-- C15Tour/
    `-- assets/
        |-- logos/
        `-- pictos/
```

## Base de donnees

Le schema Prisma se trouve dans `web/backend/prisma/schema.prisma`.

La base contient trois modeles principaux :

- `Trip` : informations generales du convoi.
- `Step` : etapes rattachees a un convoi.
- `Telemetry` : positions GPS et donnees de suivi du vehicule de tete.

### Trip

Principaux champs :

```text
trip_id
trip_name
trip_speed
trip_user_code
trip_admin_code
trip_start_time
trip_autoroute
trip_voie_rapide
trip_chemin
trip_is_reduced
trip_nb_sections
trip_reduction
trip_created_at
trip_updated_at
```

### Step

Principaux champs :

```text
step_id
step_name
step_address
step_latitude
step_longitude
step_is_stop
step_stop_duration
step_order
step_trip_id
step_no_sections
step_created_at
step_updated_at
```

### Telemetry

Principaux champs :

```text
telemetry_id
telemetry_trip_id
telemetry_latitude
telemetry_longitude
telemetry_speed
telemetry_heading
telemetry_timestamp
telemetry_created_at
```

Relations :

```text
Trip 1 -- * Step
Trip 1 -- * Telemetry
```

## API

L'API est exposee par defaut sur `http://localhost:3000`.

### Endpoints de base

- `GET /` : message d'accueil de l'API.
- `GET /api/health` : verification de l'etat du serveur.

### Convois

- `GET /api/trips` : recuperer tous les convois.
- `GET /api/trips/last` : recuperer le dernier convoi cree.
- `GET /api/trips/search?name={texte}` : rechercher un convoi par nom.
- `GET /api/trips/code/{userCode}` : recuperer un convoi par code utilisateur.
- `GET /api/trips/admin/{adminCode}` : recuperer un convoi par code administrateur.
- `GET /api/trips/{id}` : recuperer un convoi par identifiant.
- `POST /api/trips` : creer un convoi.
- `PUT /api/trips/{id}` : modifier un convoi.
- `DELETE /api/trips/{id}` : supprimer un convoi.
- `POST /api/trips/{id}/regenerate-code` : regenerer le code utilisateur.
- `POST /api/trips/{tripId}/compute` : calculer l'itineraire d'un convoi.
- `POST /api/trips/{tripId}/exports/pdf` : exporter un convoi en PDF.
- `GET /api/trips/{tripId}/exports/gpx` : exporter un convoi en GPX.

### Etapes

- `GET /api/trips/{tripId}/steps` : recuperer les etapes d'un convoi.
- `GET /api/trips/{tripId}/stops` : recuperer les pauses d'un convoi.
- `POST /api/trips/{tripId}/steps` : ajouter une etape.
- `PUT /api/trips/{tripId}/steps/reorder` : reorganiser les etapes.
- `GET /api/steps/{id}` : recuperer une etape.
- `PUT /api/steps/{id}` : modifier une etape.
- `DELETE /api/steps/{id}` : supprimer une etape.

### Telemetrie

- `POST /api/trips/{tripId}/telemetry` : enregistrer une position GPS.
- `GET /api/trips/{tripId}/telemetry` : recuperer les positions GPS d'un convoi.
- `GET /api/trips/{tripId}/telemetry/latest` : recuperer la derniere position GPS d'un convoi.

### Geocodage

- `GET /api/geocode/search?q={adresse}` : rechercher une adresse.
- `GET /api/geocode/reverse?lat={lat}&lon={lon}` : recuperer une adresse depuis des coordonnees.

### Organisateur

- `GET /api/organizer/dashboard` : recuperer les indicateurs et les convois recents.

### Routage externe

- `POST /api/valhalla/route` : proxy vers Valhalla pour le calcul d'itineraire.

## Auteurs

- Alexis Cantin
- Tomas Martineau
- Mbotiravo Manantsoa
- Bryan Metro
- Guy Keny Ndayizeye
- Anthony Nguyen
- Eva Vilarasau Pottier

## Licence

Ce projet a ete realise dans le cadre d'un projet d'etude. Il est destine a un usage pedagogique et n'a pas vocation a etre utilise en production sans adaptation prealable.
