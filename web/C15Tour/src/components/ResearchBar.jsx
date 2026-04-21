import React, { useState, useEffect, useRef } from "react";
import SearchIcon from "@shared/global_assets/pictos/Search.svg";

const normalize = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const getLocationLabel = (address = {}) =>
  address.city ||
  address.town ||
  address.village ||
  address.municipality ||
  address.hamlet ||
  address.county ||
  "";

const scoreSuggestion = (item, rawQuery) => {
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

export default function ResearchBar({ value, onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  const fetchAdresseGouv = async (query) => {
    const params = new URLSearchParams({
      q: query,
      limit: "8",
      autocomplete: "1"
    });
    // api du gouvernement fr utilisé pour la recherche/suggestions
    const response = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.toString()}`);
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const features = Array.isArray(payload?.features) ? payload.features : [];

    return features
      .map((feature) => {
        const props = feature.properties || {};
        const coords = Array.isArray(feature.geometry?.coordinates)
          ? feature.geometry.coordinates
          : [];
        const lon = coords[0];
        const lat = coords[1];

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return null;
        }

        const city = props.city || "";
        const postcode = props.postcode || "";
        const road = props.street || props.name || "";
        const houseNumber = props.housenumber || "";
        const line1 = [houseNumber, road].filter(Boolean).join(" ");
        const display_name = props.label || [line1, city, postcode].filter(Boolean).join(", ");

        return {
          lat: String(lat),
          lon: String(lon),
          display_name: display_name || `${lat}, ${lon}`,
          address: {
            house_number: houseNumber,
            road,
            city,
            postcode
          }
        };
      })
      .filter(Boolean);
  };

  const fetchNominatim = async (query, { bounded = true } = {}) => {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: "8",
      countrycodes: "fr",
      "accept-language": "fr"
    });

    if (bounded) {
      params.set("bounded", "1");
      params.set("viewbox", "-5.0,51.0,10.0,41.0");
    }
    // api utilisé pour la recherche/suggestions
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  };

  const fetchPhoton = async (query) => {
    const params = new URLSearchParams({
      q: query,
      limit: "8",
      lang: "fr"
    });

    // api utilisé pour la recherche/suggestions
    const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const features = Array.isArray(payload?.features) ? payload.features : [];

    return features
      .map((feature) => {
        const props = feature.properties || {};
        const coords = Array.isArray(feature.geometry?.coordinates)
          ? feature.geometry.coordinates
          : [];
        const lon = coords[0];
        const lat = coords[1];

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return null;
        }

        const city = props.city || props.town || props.village || "";
        const postcode = props.postcode || "";
        const road = props.street || props.name || "";
        const houseNumber = props.housenumber || "";
        const line1 = [houseNumber, road].filter(Boolean).join(" ");
        const display_name = [line1, city, postcode].filter(Boolean).join(", ");

        return {
          lat: String(lat),
          lon: String(lon),
          display_name: display_name || props.name || `${lat}, ${lon}`,
          address: {
            house_number: houseNumber,
            road,
            city,
            postcode
          }
        };
      })
      .filter(Boolean);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fonction pour récupérer les suggestions
  const fetchSuggestions = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      let data = await fetchAdresseGouv(query);

      // 
      if (!Array.isArray(data) || data.length === 0) {
        data = await fetchNominatim(query, { bounded: true });
      }

      // 
      if (!Array.isArray(data) || data.length === 0) {
        data = await fetchNominatim(query, { bounded: false });
      }

      //
      if (!Array.isArray(data) || data.length === 0) {
        const withoutLeadingNumber = query.replace(/^\s*\d+[A-Za-z]?\s+/, "").trim();
        if (withoutLeadingNumber && withoutLeadingNumber !== query) {
          data = await fetchNominatim(withoutLeadingNumber, { bounded: false });
        }
      }

      //
      if (!Array.isArray(data) || data.length === 0) {
        data = await fetchPhoton(query);
      }

      const safeData = Array.isArray(data) ? data : [];
      const formattedSuggestions = safeData
        .map((item) => {
          const address = item.address || {};
          const city = getLocationLabel(address);
          const postcode = address.postcode || "";
          const roadLabel = [address.house_number, address.road || address.pedestrian]
            .filter(Boolean)
            .join(" ");
          const displayAddress = [roadLabel, city, postcode].filter(Boolean).join(", ");

          return {
            ...item,
            city,
            postcode,
            display_name: displayAddress || item.display_name,
            matchScore: scoreSuggestion(item, query)
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);

      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error("Erreur lors de la recuperation des suggestions:", error);
      setSuggestions([]);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange?.(newValue);
    fetchSuggestions(newValue);
  };

  const handleSuggestionClick = (suggestion) => {
    onSelect?.(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="ResearchBarWrapper" ref={searchInputRef}>
      <div className="search-input-container">
        <input
          type="text"
          className="ResearchBarInput"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Rechercher une adresse..."
          aria-label="Rechercher une adresse"
        />
        <img
          src={SearchIcon}
          alt=""
          className="search-icon"
          aria-hidden="true"
          style={{ cursor: "pointer" }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="suggestions-list">
            {suggestions.map((suggestion, index) => {
              const displayName =
                suggestion.display_name.length > 50
                  ? `${suggestion.display_name.substring(0, 50)}...`
                  : suggestion.display_name;
              return (
                <li
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                  title={suggestion.display_name}
                >
                  {displayName}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
