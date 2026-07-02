// URL du backend à utiliser en développement : à remplacer par l'adresse IP locale
// de la machine qui fait tourner le backend (un simulateur/téléphone ne peut pas
// utiliser "localhost", qui pointerait vers l'appareil lui-même)
const DEV_API_URL = 'http://ton-ip:3000';
const PROD_API_URL = 'http://sc2kqra8826.universe.wf';
// __DEV__ est une variable globale injectée par React Native/Expo (true en dev, false en build de prod)
// passer __DEV__ à false si on veut tester la prod en local
export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
