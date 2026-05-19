# Nom du projet
C15 Tour

## Description

Le projet C15 Tour comporte une partie web et une partie mobile.

La partie web est destinée aux organisateurs de convois. Elle permet de créer un convoi, de le modifier, de l’enregistrer en base de données et de le partager avec les participants. Un historique des convois est également disponible afin de retrouver d’anciens trajets enregistrés et de les modifier si nécessaire.

L’application mobile est destinée aux participants du convoi ainsi qu’à l’administrateur, qui correspond au véhicule de tête. Grâce à un code ou à un QR code, les participants peuvent rejoindre un convoi, suivre le trajet prédéfini, suivre la position du véhicule de tête, adapter leur vitesse et recevoir des messages audio.

Le véhicule de tête suit également le parcours. Il dispose en plus de fonctionnalités d’administration, comme l’envoi de messages audio aux participants afin de transmettre des indications, signaler des ajustements ou animer le convoi.

## Fonctionnalités

### Partie web - organisateur de convoi

- Créer un convoi.
- Modifier un convoi existant.
- Enregistrer un convoi en base de données.
- Ajouter et organiser les étapes du trajet.
- Définir les informations principales du trajet.
- Partager un convoi avec les participants.
- Générer un code ou un QR code d’accès.
- Consulter l’historique des convois.
- Réutiliser ou modifier d’anciens trajets enregistrés.

### Partie mobile - participants

- Rejoindre un convoi grâce à un code.
- Rejoindre un convoi grâce à un QR code.
- Consulter le trajet prédéfini.
- Suivre l’avancement du convoi.
- Visualiser la position du véhicule de tête.
- Adapter sa vitesse en fonction du convoi.
- Recevoir des messages audio envoyés par le véhicule de tête.

### Partie mobile - administrateur / véhicule de tête

- Rejoindre le convoi en tant que véhicule de tête.
- Suivre le trajet prévu.
- Guider les autres participants.
- Envoyer des messages audio aux participants.
- Transmettre des indications pendant le trajet.
- Signaler des ajustements ou changements liés au convoi.

## Technologies utilisées

- React pour l’application web
- React Native avec Expo pour l’application mobile
- Node.js et Express.js pour le back-end
- PostgreSQL pour la base de données
- Git et GitHub pour le versioning

## Installation
### Prérequis

Avant de commencer, assurez-vous d’avoir installé :

- Node.js
- npm
- Git
- Expo Go sur mobile si vous souhaitez tester l’application mobile

### Cloner le projet

```bash
git clone URL_DU_PROJET
cd NOM_DU_PROJET
```

### Installer les dépendances

- Pour le backend
cd web/backend
npm install

- Pour le frontend
cd ../C15Tour
npm install

- Pour le mobile
cd ../../mobile/C15Tour
npm install

## Configuration

## Lancement
Depuis le dossier web/backend
npm run dev

Depuis le dossier web/C15Tour
npm start

Depuis le dossier mobile/C15Tour
npx expo start

## Structure du projet

## Base de données

La base de données du projet C15 Tour est composée de trois tables principales : `trip`, `step` et `telemetry`.

### Table `trip`

La table `trip` contient les informations générales d’un convoi.

Elle permet de stocker :

- l’identifiant du trajet ;
- le nom du convoi ;
- la vitesse définie pour le trajet ;
- le code utilisateur ;
- le code administrateur ;
- l’heure de départ ;
- les types de routes autorisées ;
- les paramètres de réduction de trajet ;
- les dates de création et de modification.

Principaux champs :

```sql
trip_id INT PRIMARY KEY
trip_name VARCHAR(255)
trip_speed INT
trip_user_code VARCHAR(255)
trip_admin_code VARCHAR(255)
trip_start_time DATETIME
trip_autoroute TINYINT(1)
trip_voie_rapide TINYINT(1)
trip_chemin TINYINT(1)
trip_is_reduced TINYINT(1)
trip_reduction INT
trip_created_at DATETIME
trip_updated_at DATETIME
```

### Table `step`

La table `step` contient les différentes étapes associées à un trajet.

Elle permet de stocker :

l’identifiant de l’étape ;
le nom de l’étape ;
l’adresse ;
les coordonnées GPS ;
l’information indiquant si l’étape est un arrêt ;
la durée de l’arrêt ;
l’ordre de l’étape dans le trajet ;
le nombre de sections ;
l’identifiant du trajet associé ;
les dates de création et de modification.

Principaux champs :

```sql
step_id INT PRIMARY KEY
step_name VARCHAR(255)
step_address VARCHAR(255)
step_latitude DECIMAL(9,6)
step_longitude DECIMAL(9,6)
step_is_stop TINYINT(1)
step_stop_duration INT
step_order INT
step_nb_sections INT
step_trip_id INT
step_created_at DATETIME
step_updated_at DATETIME
```

La clé étrangère step_trip_id permet de relier une étape à un trajet.

### Table `telemetry`

La table `telemetry` contient les données de suivi du véhicule de tête pendant le convoi.

Elle permet de stocker :

l’identifiant de la donnée de télémétrie ;
l’identifiant du trajet associé ;
la latitude ;
la longitude ;
la vitesse ;
l’orientation du véhicule ;
l’heure de récupération de la position ;
la date de création de la donnée.

Principaux champs :

```sql
telemetry_id INT PRIMARY KEY
telemetry_trip_id INT
telemetry_latitude DECIMAL(9,6)
telemetry_longitude DECIMAL(9,6)
telemetry_speed FLOAT
telemetry_heading FLOAT
telemetry_timestamp DATETIME
telemetry_created_at DATETIME
```

La clé étrangère telemetry_trip_id permet de relier les données de télémétrie à un trajet.

### Relations entre les tables
Un trajet peut contenir plusieurs étapes.
Une étape appartient à un seul trajet.
Un trajet peut contenir plusieurs données de télémétrie.
Une donnée de télémétrie appartient à un seul trajet.

Schéma relationnel simplifié :

trip 1 ─── * step
trip 1 ─── * telemetry

## API
Voici la liste complète des endpoints backend implémentés dans ton projet:

### Endpoints Backend C15Tour

**Endpoints de base**
- `GET /` - Message d'accueil de l'API
- `GET /health` - Vérifier l'état du serveur

---

### ** Convois (Trips)** `/api/trips`

#### Lecture
- `GET /api/trips` - Récupérer tous les convois
- `GET /api/trips/last` - Récupérer le dernier convoi créé
- `GET /api/trips/search?name={texte}` - Rechercher des convois par nom
- `GET /api/trips/code/{userCode}` - Récupérer un convoi par code utilisateur
- `GET /api/trips/admin/{adminCode}` - Récupérer un convoi par code admin
- `GET /api/trips/{id}` - Récupérer un convoi par ID

#### Écriture
- `POST /api/trips` - Créer un nouveau convoi
- `PUT /api/trips/{id}` - Modifier un convoi
- `DELETE /api/trips/{id}` - Supprimer un convoi

#### Actions spéciales
- `POST /api/trips/{id}/regenerate-code` - Régénérer le code utilisateur
- `POST /api/trips/{tripId}/compute` - Calculer l'itinéraire du convoi
- `GET /api/trips/{tripId}/exports/pdf` - Exporter le convoi en PDF
- `GET /api/trips/{tripId}/exports/gpx` - Exporter le convoi en GPX
- `POST /api/trips/{tripId}/telemetry` - Enregistrer une position GPS

---

### ** Étapes (Steps)** `/api`

#### Lecture
- `GET /api/trips/{tripId}/steps` - Récupérer les étapes d'un convoi
- `GET /api/trips/{tripId}/stops` - Récupérer les pauses d'un convoi
- `GET /api/steps/{id}` - Récupérer une étape par ID

#### Écriture
- `POST /api/trips/{tripId}/steps` - Ajouter une étape à un convoi
- `PUT /api/steps/{id}` - Modifier une étape
- `DELETE /api/steps/{id}` - Supprimer une étape

#### Actions spéciales
- `PUT /api/trips/{tripId}/steps/reorder` - Réorganiser les étapes d'un convoi

---

### **🗺️ Géocodage** `/api/geocode`

- `GET /api/geocode/search?q={adresse}` - Rechercher une adresse (géocodage)
- `GET /api/geocode/reverse?lat={lat}&lon={lon}` - Géocodage inverse

---

### ** Organisateur** `/api/organizer`

- `GET /api/organizer/dashboard` - Tableau de bord avec KPIs et convois récents

## Tests et intégration continue

## Auteurs
- ALEXIS CANTIN
- TOMAS MARTINEAU
- MBOTIRAVO MANANTSOA
- BRYAN METRO
- GUY KENY NDAYIZEYE
- ANTHONY NGUYEN
- ÉVA VILARASAU POTTIER


## Licence
Ce projet a été réalisé dans le cadre d’un projet d’étude.  
Il est destiné à un usage pédagogique et n’a pas vocation à être utilisé en production sans adaptation préalable.
