import React, { useMemo, useState } from "react";
import PenIcon from "@shared/global_assets/pictos/Pen.svg";
import FlagIcon from "@shared/global_assets/pictos/Flag.svg";
import GearIcon from "@shared/global_assets/pictos/Gear.svg";
import ShareIcon from "@shared/global_assets/pictos/Share.svg";
import DownloadIcon from "@shared/global_assets/pictos/Download.svg";

export default function ConvoyCard({
  initialName = "Nom du convoi",
  initialStartTime = "00:00",
}) {
  const [name, setName] = useState(initialName);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [isEdited, setIsEdited] = useState(false);

  const [expanded, setExpanded] = useState(false);

  const containerStyle = useMemo(
    () => ({
      maxHeight: expanded ? '1000px' : '0px',
      transition: 'max-height 0.5s ease-out',
      overflow: 'hidden'
    }),
    [expanded]
  );


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
  };

  const handleConfirmEdit = () => {
    if (name.trim() !== '') {
      setExpanded(true);
      setIsEdited(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirmEdit();
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
            onKeyDown={handleKeyPress}
            placeholder="Nom du convoi"
          />
          <button 
            className="iconBtn" 
            type="button" 
            aria-label="Éditer le nom"
            onClick={handleConfirmEdit}
          >
            <img src={PenIcon} alt="Éditer" />
          </button>
        </div>
      </div>

      {/* Body (affichage) */}
      {isEdited && (
      <div className="convoyBody">
        <div className="convoyTitleRow">
          <div className="convoyTitle">{name || " "}</div>

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
