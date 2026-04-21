import React from "react";
import roadsTourLogo from "@shared/global_assets/logos/roads_toursb_by_c15_tour.svg";

export default function RoadsTour() {
  return (
    <div className="roads-tour-badge" aria-label="Roads Tour by C15 Tour">
      <img
        src={roadsTourLogo}
        className="roads-tour-logo"
        alt="ROADS TOUR By C15 Tour"
      />
    </div>
  );
}
