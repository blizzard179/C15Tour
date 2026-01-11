import React from "react";
import SearchIcon from "@shared/global_assets/pictos/Search.svg";

export default function ResearchBar({ value, onChange, placeholder }) {
  return (
    <div className="ResearchBarWrapper">
      <div className="search-input-container">
        <input
          type="text"
          className="ResearchBarInput"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder || "Rechercher un point d’intérêt"}
          aria-label="Rechercher un point d’intérêt"
        />
        <img 
          src={SearchIcon} 
          alt="" 
          className="search-icon" 
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
