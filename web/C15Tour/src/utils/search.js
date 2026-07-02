// Fonctions utilitaires partagées pour la recherche/le classement des suggestions
// d'adresse. Reprend la logique interne de components/ResearchBar.jsx sous forme
// exportable/réutilisable et testable indépendamment (voir search.test.js).

// Normalise un texte pour la comparaison : minuscules, sans accents, sans espaces superflus
export const normalize = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// Extrait le nom de localité le plus pertinent disponible dans une adresse structurée
export const getLocationLabel = (address = {}) =>
  address.city ||
  address.town ||
  address.village ||
  address.municipality ||
  address.hamlet ||
  address.county ||
  "";

// Calcule un score de pertinence pour une suggestion d'adresse par rapport à la recherche
export const scoreSuggestion = (item, rawQuery) => {
  const query = normalize(rawQuery);
  if (!query) return 0;

  const address = item.address || {};
  const houseNumber = normalize(address.house_number || "");
  const road = normalize(address.road || address.pedestrian || "");
  const postcode = normalize(address.postcode || "");
  const city = normalize(getLocationLabel(address));
  const displayName = normalize(item.display_name || "");

  let score = 0;

  if (displayName.startsWith(query)) score += 50;
  if (road && query.includes(road)) score += 30;
  if (city && query.includes(city)) score += 25;
  if (postcode && query.includes(postcode)) score += 35;
  if (houseNumber && query.includes(houseNumber)) score += 30;
  if (displayName.includes(query)) score += 15;

  return score;
};
