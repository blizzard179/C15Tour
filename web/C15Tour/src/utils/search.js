export const normalize = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

export const getLocationLabel = (address = {}) =>
  address.city ||
  address.town ||
  address.village ||
  address.municipality ||
  address.hamlet ||
  address.county ||
  "";

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
