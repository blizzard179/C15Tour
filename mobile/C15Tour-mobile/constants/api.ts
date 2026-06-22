const DEV_API_URL = 'http://ton-ip:3000';
const PROD_API_URL = 'http://sc2kqra8826.universe.wf';
// passer __DEV__ à false si on veut tester la prod en local
export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
