import React, { useMemo, useState } from "react";
import PenIcon from "@shared/global_assets/pictos/Pen.svg";
import FlagIcon from "@shared/global_assets/pictos/Flag.svg";
import GearIcon from "@shared/global_assets/pictos/Gear.svg";
import ShareIcon from "@shared/global_assets/pictos/Share.svg";
import DownloadIcon from "@shared/global_assets/pictos/Download.svg";

export default function ConvoyCard({
  initialName = "NOM DE L'ÉDITION",
  initialStartTime = "00:00",
}) {
  const [name, setName] = useState(initialName);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [isEdited, setIsEdited] = useState(false);

  // Fake data a remplacer plus tard
  const data = useMemo(
    () => ({
      departLabel: "DÉPART",
      arriveeLabel: "ARRIVÉE",
      arriveeTime: "00:00",
      stepsText: "Aucune étape ajoutée",
    }),
    []
  );

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (e.target.value !== initialName) {
      setIsEdited(true);
    }
  };

  return (
    <div className="convoyCard">
      {/* Header (mode édition) */}
      <div className="convoyHeader">
        <div className="convoyNameRow">
          <input
            className="convoyNameInput"
            value={name}
            onChange={handleNameChange}
            placeholder="Nom du convoi"
          />
          <button className="iconBtn" type="button" aria-label="Éditer le nom">
            <img src={PenIcon} alt="Éditer" />
          </button>
        </div>
      </div>

      {/* Body (affichage) */}
      {isEdited && (
      <div className="convoyBody">
        <div className="convoyTitleRow">
          <div className="convoyTitle">{name || " "}</div>
          <button className="iconBtn" type="button" aria-label="Éditer">
            <img src={PenIcon} alt="Éditer" />
          </button>
        </div>

        <div className="convoySection">
          <div className="convoySectionLeft">
            <img src={FlagIcon} alt="Départ" className="flagIcon" />
            <span className="label">{data.departLabel}</span>
          </div>

          <div className="timeEdit">
            <input
              className="timeInput"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="00:00"
            />
            <button className="iconBtn" type="button" aria-label="Éditer l’heure">
              <img src={PenIcon} alt="Éditer" />
            </button>
          </div>
        </div>

        <div className="stepsEmpty">{data.stepsText}</div>

        <div className="convoySection bottom">
          <div className="convoySectionLeft">
            <img src={FlagIcon} alt="Arrivée" className="flagIcon" />
            <span className="label">{data.arriveeLabel}</span>
          </div>

          <div className="arriveeTime">{data.arriveeTime}</div>
        </div>

        <div className="convoyActions">
          <button className="iconBtn" type="button" aria-label="Paramètres">
            <img src={GearIcon} alt="Paramètres" />
          </button>
          <button className="iconBtn" type="button" aria-label="Partager">
            <img src={ShareIcon} alt="Partager" />
          </button>
          <button className="iconBtn" type="button" aria-label="Télécharger">
            <img src={DownloadIcon} alt="Télécharger" />
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
