import React, { useMemo, useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import PenIcon from "@shared/global_assets/pictos/Pen.svg";
import BackIcon from "@shared/global_assets/pictos/Back.svg";
import CheckIcon from "@shared/global_assets/pictos/Check.svg";
import FlagIcon from "@shared/global_assets/pictos/Flag.svg";
import GearIcon from "@shared/global_assets/pictos/Gear.svg";
import ShareIcon from "@shared/global_assets/pictos/Share.svg";
import DownloadIcon from "@shared/global_assets/pictos/Download.svg";
import SaveIcon from "@shared/global_assets/pictos/Save.svg";
import PlusIcon from "@shared/global_assets/pictos/Plus.svg";
import CloseIcon from "@shared/global_assets/pictos/Close.svg";
import MenuIcon from "@shared/global_assets/pictos/Menu.svg";

// Réglages par défaut appliqués si aucune préférence n'a encore été définie
const DEFAULT_GENERAL_SETTINGS = {
  segmentsCount: 1,
  routeType: {
    avoidMotorway: true,
    avoidFastRoad: true,
    avoidTrack: true
  },
  speed: {
    generalSpeedKmH: 50,
    autoReductionEnabled: true,
    reductionPercent: 20
  }
};

// Fusionne les réglages fournis avec les valeurs par défaut, pour toujours
// disposer d'un objet complet même si certaines clés manquent (ex: ancien convoi sauvegardé)
const mergeGeneralSettings = (input) => ({
  segmentsCount: Math.max(1, Number.parseInt(input?.segmentsCount, 10) || 1),
  routeType: {
    ...DEFAULT_GENERAL_SETTINGS.routeType,
    ...(input?.routeType || {})
  },
  speed: {
    ...DEFAULT_GENERAL_SETTINGS.speed,
    ...(input?.speed || {})
  }
});

// en dev : const BACKEND_BASE_URL = 'http://localhost:3000';
const BACKEND_BASE_URL = import.meta.env.VITE_API_URL ?? ''; // URL de l'API backend (vide = même origine)
const MOBILE_DEEP_LINK_BASE = "c15tourmobile://join"; // schéma de lien profond vers l'application mobile (rejoindre un convoi)
const SEGMENT_COLOR_PALETTE = ["#4A6CF7", "#2AA876", "#FF9F1C", "#E63946", "#7B61FF", "#0096C7"];

// Carte latérale affichant le détail du convoi en cours d'édition : nom, heure de
// départ, liste des étapes (regroupées par segments), et actions (paramètres,
// partage, sauvegarde, export). Gère aussi toute la synchronisation avec le backend.
export default function CardConvoi({
  initialName = "Nom du convoi",
  initialStartTime = "00:00",
  waypoints = [],
  waypointNames = [],
  initialStepConfigs = {},
  initialBackendTripId = null,
  routeDurationMinutes = null,
  routeLegDurationsMinutes = [],
  routeLegDistancesKm = [],
  routeDistanceKm = null,
  generalSettings = DEFAULT_GENERAL_SETTINGS,
  shareTrip: savedShareTrip = null,
  onUpdateWaypoint,
  onDeleteWaypoint,
  onReorderWaypoints,
  onGeneralSettingsChange,
  canExportGpx = false,
  onExportGpx,
  canExportPdf = false,
  onExportPdf,
  canSaveConvoy = false,
  onSaveConvoy,
  onPersistConvoy,
  onBackToConvoySelector,
  onConvoyNameChange,
  onSegmentConfigChange,
  onTripPersisted
}) {
  const [name, setName] = useState(initialName);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [isEdited, setIsEdited] = useState(false); // passe à true dès qu'au moins une étape a été ajoutée
  const [configPopup, setConfigPopup] = useState(null); // index de l'étape dont le popup de configuration est ouvert
  const [editData, setEditData] = useState({
    name: "",
    arrivalTime: "00:00",
    breakTime: 5,
    hasBreak: true,
    segmentSections: 1,
    segmentColor: SEGMENT_COLOR_PALETTE[0],
    segmentRank: 1
  });
  const [isEditing, setIsEditing] = useState(false); // édition du nom du convoi
  const [isEditingTime, setIsEditingTime] = useState(false); // édition de l'heure de départ
  const [stepsConfig, setStepsConfig] = useState({}); // configuration par étape (pause, segment, couleur...), indexée par position
  const [tempTime, setTempTime] = useState(initialStartTime);
  const [draggedIndex, setDraggedIndex] = useState(null); // index de l'étape en cours de glissement
  const [dragOverIndex, setDragOverIndex] = useState(null); // index de l'étape survolée pendant le glissement
  const [dragOverSegmentRank, setDragOverSegmentRank] = useState(null); // segment survolé pendant le glissement
  const [pendingAddSegment, setPendingAddSegment] = useState(null); // segment ciblé quand on ajoute une étape via "+ Ajouter une étape"
  const [isGeneralSettingsOpen, setIsGeneralSettingsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportSaveMessage, setExportSaveMessage] = useState("");
  const [persistMessage, setPersistMessage] = useState("");
  const [backendTripId, setBackendTripId] = useState(initialBackendTripId); // id du trajet une fois enregistré côté serveur
  const [shareTrip, setShareTrip] = useState(savedShareTrip); // codes de partage (admin/participant) une fois le trajet enregistré
  const [generalSettingsDraft, setGeneralSettingsDraft] = useState(mergeGeneralSettings(generalSettings)); // brouillon modifié dans la popup de paramètres généraux
  const [isNameButtonLocked, setIsNameButtonLocked] = useState(false); // anti double-clic sur le bouton nom

  // Valeurs par défaut d'une configuration d'étape non encore personnalisée
  const createDefaultEditDataItem = () => ({
    name: "",
    arrivalTime: "00:00",
    breakTime: 0,
    hasBreak: false
  });

  const getEditDataItem = (index) => editData[index] || createDefaultEditDataItem();

  // Récupère la config de pause d'une étape telle qu'elle a été chargée depuis le
  // backend/localStorage (avant toute modification via le popup de configuration)
  const getStepLoadConfig = (index) => {
    const waypoint = waypoints[index] || {};
    const hasStop = waypoint.step_is_stop ?? waypoint.isStop ?? false;
    const stopDuration = waypoint.step_stop_duration ?? waypoint.stopDuration;
    return {
      hasBreak: Boolean(hasStop),
      breakTime: hasStop ? (Number.isFinite(stopDuration) ? stopDuration : 0) : 0
    };
  };

  // Temps de pause effectif d'une étape : priorité à la configuration modifiée
  // par l'utilisateur, sinon celle chargée initialement
  const getStepBreakTime = (index) => {
    const configured = stepsConfig[index];
    if (configured && Number.isFinite(configured.breakTime)) {
      return configured.breakTime;
    }
    return getStepLoadConfig(index).breakTime;
  };

  const updateEditDataItem = (index, updater) =>
    setEditData((prev) => ({
      ...prev,
      [index]: updater(prev[index] || createDefaultEditDataItem())
    }));

  // Fusionne la configuration d'étapes initiale (venant du parent, ex: convoi rechargé)
  // avec celle déjà présente localement, sans écraser les modifications en cours
  useEffect(() => {
    setStepsConfig(prev => {
      const merged = { ...prev };
      Object.entries(initialStepConfigs).forEach(([key, value]) => {
        merged[key] = { ...(prev[key] || {}), ...value };
      });
      return merged;
    });
  }, [initialStepConfigs]);

  const popupRef = useRef(null);
  const inputRef = useRef(null);
  const timeInputRef = useRef(null);
  const previousWaypointCountRef = useRef(waypoints.length); // permet de détecter l'ajout d'un nouveau waypoint

  // Réglages généraux toujours complets (fusionnés avec les valeurs par défaut)
  const resolvedGeneralSettings = useMemo(
    () => mergeGeneralSettings(generalSettings),
    [generalSettings]
  );

  // Synchronise l'état local avec les props quand le convoi parent change (ex: changement de convoi ouvert)
  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    setBackendTripId(initialBackendTripId ?? null);
  }, [initialBackendTripId]);

  useEffect(() => {
    setShareTrip(savedShareTrip);
  }, [savedShareTrip]);

  // Dès qu'une étape existe, on affiche le détail complet de la carte convoi
  useEffect(() => {
    if (waypoints.length > 0) {
      setIsEdited(true);
    }
  }, [waypoints.length]);

  // Place le focus (et sélectionne le texte) dans le champ nom dès l'entrée en mode édition
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Place le focus dans le champ heure dès l'entrée en mode édition
  useEffect(() => {
    if (isEditingTime && timeInputRef.current) {
      timeInputRef.current.focus();
    }
  }, [isEditingTime]);

  // Ferme le popup de configuration d'étape si l'utilisateur clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setConfigPopup(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Quand un nouveau waypoint apparaît (ajouté via la recherche d'adresse ou un clic
  // sur la carte), on lui assigne automatiquement un rang de segment : soit le segment
  // ciblé explicitement via "+ Ajouter une étape" (pendingAddSegment), avec réordonnancement
  // si besoin, soit le même segment que l'étape précédente par défaut.
  useEffect(() => {
    const previousCount = previousWaypointCountRef.current;
    const currentCount = waypoints.length;

    if (currentCount > previousCount && currentCount > 0) {
      const newWaypointIndex = currentCount - 1;
      const newWaypoint = waypoints[newWaypointIndex];
      // Map clicks (ClickHandler) produce {lat,lng} with no display_name.
      // Search results from ResearchBar always include display_name.
      const isFromSearch = Boolean(newWaypoint && newWaypoint.display_name !== undefined);

      if (pendingAddSegment && isFromSearch) {
        const targetRank = pendingAddSegment.rank;

        // Find the last existing waypoint with the same rank before the new one,
        // so we can insert the new waypoint right after it (within its segment block).
        let insertAfter = -1;
        for (let i = 0; i < newWaypointIndex; i++) {
          if (getStepSegmentRank(i) === targetRank) insertAfter = i;
        }

        const insertPosition = insertAfter + 1;
        // Reorder only when there are waypoints of other segments between the
        // insertion point and the newly appended waypoint.
        const needsReorder = insertAfter >= 0 && insertPosition < newWaypointIndex;
        if (needsReorder) {
          onReorderWaypoints?.(newWaypointIndex, insertPosition);
          // Atomically reorder stepsConfig and assign the target rank.
          setStepsConfig((prev) => {
            const order = Array.from({ length: currentCount }, (_, i) => i);
            const [moved] = order.splice(newWaypointIndex, 1);
            order.splice(insertPosition, 0, moved);
            const next = {};
            order.forEach((oldIdx, newIdx) => {
              if (prev[oldIdx] !== undefined) next[newIdx] = prev[oldIdx];
            });
            next[insertPosition] = { ...(next[insertPosition] || {}), segmentRank: targetRank };
            return next;
          });
        } else {
          setStepsConfig((prev) => ({
            ...prev,
            [newWaypointIndex]: { ...(prev[newWaypointIndex] || {}), segmentRank: targetRank }
          }));
        }
        setPendingAddSegment(null);
      } else {
        // Map click (or search without pendingAddSegment): inherit rank from the previous waypoint.
        // Map clicks never consume pendingAddSegment so the pending intent stays active.
        const inheritRank = currentCount > 1 ? getStepSegmentRank(currentCount - 2) : 1;
        setStepsConfig((prev) => ({
          ...prev,
          [newWaypointIndex]: { ...(prev[newWaypointIndex] || {}), segmentRank: inheritRank }
        }));
      }
    }

    previousWaypointCountRef.current = currentCount;
  }, [waypoints.length, pendingAddSegment]);

  const hasWaypoints = waypoints.length > 0;
  const segmentCount = useMemo(() => Math.max(0, waypoints.length - 1), [waypoints.length]); // nombre de tronçons = nombre d'étapes - 1
  const configuredSegmentsCount = useMemo(
    () => Math.max(1, Number.parseInt(resolvedGeneralSettings.segmentsCount, 10) || 1),
    [resolvedGeneralSettings.segmentsCount]
  );

  // Nombre de sous-sections (pour l'affichage en pointillé alterné) configuré pour une étape
  const getStepSegmentSections = (index) => {
    const rawValue = stepsConfig[index]?.stepNoSections;
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  };

  // Rang du segment (groupe d'étapes) auquel appartient une étape donnée
  const getStepSegmentRank = (index) => {
    const rawValue = stepsConfig[index]?.segmentRank;
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  };

  // Couleur du segment : celle configurée explicitement, sinon une couleur de la palette
  // choisie automatiquement selon le rang, pour que chaque segment reste visuellement distinct
  const getStepSegmentColor = (index) => {
    const rank = getStepSegmentRank(index);
    return stepsConfig[index]?.segmentColor || SEGMENT_COLOR_PALETTE[(rank - 1) % SEGMENT_COLOR_PALETTE.length];
  };

  // Propage la configuration des segments (sections, couleur, rang) au composant parent
  // Carte.jsx, pour qu'il puisse dessiner le tracé de la route avec ces couleurs
  useEffect(() => {
    if (typeof onSegmentConfigChange !== "function") return;
    if (pendingAddSegment) return;
    const config = Array.from({ length: waypoints.length }, (_, index) => ({
      stepNoSections: getStepSegmentSections(index),
      segmentColor: getStepSegmentColor(index),
      segmentRank: getStepSegmentRank(index)
    }));
    onSegmentConfigChange(config);
  }, [waypoints.length, segmentCount, stepsConfig, onSegmentConfigChange, pendingAddSegment]);
  const stepsText = useMemo(() => {
    if (waypoints.length === 0) return "Aucune etape ajoutee";
    if (waypoints.length === 1) return "1 etape";
    return `${waypoints.length} etapes`;
  }, [waypoints.length]);

  // Durée totale du trajet, recalculée à partir de la distance réelle et de la vitesse
  // configurée par l'utilisateur (avec application éventuelle d'une réduction automatique),
  // ou à défaut à partir de la durée renvoyée par le moteur de routage.
  const getAdjustedRouteDurationMinutes = () => {
    const speed = Number(resolvedGeneralSettings.speed.generalSpeedKmH);
    if (speed > 0 && Number.isFinite(routeDistanceKm) && routeDistanceKm >= 0) {
      let adjusted = (routeDistanceKm / speed) * 60;

      if (resolvedGeneralSettings.speed.autoReductionEnabled) {
        const reduction = Math.max(0, Number(resolvedGeneralSettings.speed.reductionPercent) || 0);
        adjusted *= 1 + reduction / 100;
      }

      return Math.max(0, Math.round(adjusted));
    }

    if (!Number.isFinite(routeDurationMinutes) || routeDurationMinutes < 0) return null;

    let adjusted = routeDurationMinutes;

    if (resolvedGeneralSettings.speed.autoReductionEnabled) {
      const reduction = Math.max(0, Number(resolvedGeneralSettings.speed.reductionPercent) || 0);
      adjusted *= 1 + reduction / 100;
    }

    return Math.max(0, Math.round(adjusted));
  };

  // Durée de trajet estimée pour un tronçon donné (entre deux étapes consécutives),
  // en utilisant la distance/durée réelle du tronçon si disponible, sinon en répartissant
  // équitablement la durée totale entre tous les tronçons.
  const getSegmentTravelTime = (index) => {
    const speed = Number(resolvedGeneralSettings.speed.generalSpeedKmH);
    const routeLegDistance = routeLegDistancesKm[index];
    if (speed > 0 && Number.isFinite(routeLegDistance) && routeLegDistance >= 0) {
      let adjustedLeg = (routeLegDistance / speed) * 60;
      if (resolvedGeneralSettings.speed.autoReductionEnabled) {
        const reduction = Math.max(0, Number(resolvedGeneralSettings.speed.reductionPercent) || 0);
        adjustedLeg *= 1 + reduction / 100;
      }
      return Math.max(0, Math.round(adjustedLeg));
    }

    const routeLegDuration = routeLegDurationsMinutes[index];
    if (Number.isFinite(routeLegDuration) && routeLegDuration >= 0) {
      let adjustedLeg = routeLegDuration;
      if (resolvedGeneralSettings.speed.autoReductionEnabled) {
        const reduction = Math.max(0, Number(resolvedGeneralSettings.speed.reductionPercent) || 0);
        adjustedLeg *= 1 + reduction / 100;
      }
      return Math.max(0, Math.round(adjustedLeg));
    }

    const configuredTravelTime = stepsConfig[index]?.travelTime;
    if (Number.isFinite(configuredTravelTime)) {
      return Math.max(0, configuredTravelTime);
    }

    const adjustedRouteDurationMinutes = getAdjustedRouteDurationMinutes();

    if (Number.isFinite(adjustedRouteDurationMinutes) && adjustedRouteDurationMinutes >= 0) {
      if (segmentCount <= 1) return adjustedRouteDurationMinutes;
      return Math.round(adjustedRouteDurationMinutes / segmentCount);
    }

    return 30;
  };

  // Durée totale de conduite (hors pauses), en sommant chaque tronçon sauf si aucun
  // tronçon n'a de durée personnalisée : on utilise alors directement la durée globale ajustée
  const getTotalTravelTime = () => {
    if (segmentCount === 0) return 0;

    const hasConfiguredSegmentTimes = Array.from({ length: segmentCount }).some((_, i) =>
      Number.isFinite(stepsConfig[i]?.travelTime)
    );

    const adjustedRouteDurationMinutes = getAdjustedRouteDurationMinutes();
    if (!hasConfiguredSegmentTimes && Number.isFinite(adjustedRouteDurationMinutes)) {
      return adjustedRouteDurationMinutes;
    }

    let total = 0;
    for (let i = 0; i < segmentCount; i += 1) {
      total += getSegmentTravelTime(i);
    }
    return total;
  };

  // Heure d'arrivée finale = heure de départ + temps de trajet total + toutes les pauses
  const calculateArrivalTime = () => {
    if (!startTime || startTime === "--:--") return "--:--";
    if (waypoints.length <= 1) return startTime;

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    let totalMinutes = startHours * 60 + startMinutes;
    totalMinutes += getTotalTravelTime();

    for (let i = 0; i < waypoints.length; i += 1) {
      totalMinutes += getStepBreakTime(i);
    }

    const arrivalHours = Math.floor(totalMinutes / 60) % 24;
    const arrivalMinutes = totalMinutes % 60;

    return `${String(arrivalHours).padStart(2, "0")}:${String(arrivalMinutes).padStart(2, "0")}`;
  };

  // Heure d'arrivée estimée à une étape intermédiaire donnée
  const calculateWaypointTime = (index) => {
    if (!startTime || startTime === "--:--") return "--:--";
    if (index === 0 || waypoints.length === 1) return startTime;

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    let totalMinutes = startHours * 60 + startMinutes;

    for (let i = 0; i < index; i += 1) {
      totalMinutes += getSegmentTravelTime(i);
    }

    for (let i = 0; i < index; i += 1) {
      totalMinutes += getStepBreakTime(i);
    }

    const waypointHours = Math.floor(totalMinutes / 60) % 24;
    const waypointMinutes = totalMinutes % 60;
    return `${String(waypointHours).padStart(2, "0")}:${String(waypointMinutes).padStart(2, "0")}`;
  };

  // Valide le nouveau nom du convoi (ignoré si vide) et notifie le parent
  const handleNameSubmit = () => {
    const trimmedName = name.trim();
    if (trimmedName !== "") {
      setName(trimmedName);
      onConvoyNameChange?.(trimmedName);
      setIsEditing(false);
      setIsEdited(true);
    }
  };

  // Verrouille temporairement le bouton nom pour éviter un double-clic qui
  // enchaînerait immédiatement édition puis validation (ou l'inverse)
  const lockNameButtonTemporarily = () => {
    setIsNameButtonLocked(true);
    if (nameButtonLockTimeoutRef.current) {
      clearTimeout(nameButtonLockTimeoutRef.current);
    }
    nameButtonLockTimeoutRef.current = setTimeout(() => {
      setIsNameButtonLocked(false);
      nameButtonLockTimeoutRef.current = null;
    }, 1500);
  };

  // Bouton unique qui bascule entre "éditer" et "valider" selon l'état courant
  const handleNameButtonClick = () => {
    if (isNameButtonLocked) return;

    if (isEditing) {
      handleNameSubmit();
    } else {
      setIsEditing(true);
    }

    lockNameButtonTemporarily();
  };

  // Prépare le champ heure temporaire avant d'entrer en mode édition
  const startTimeEdit = () => {
    let [hours, minutes] = startTime.split(":");
    hours = (hours || "00").padStart(2, "0");
    minutes = (minutes || "00").padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    setIsEditingTime(true);
    setTempTime(formattedTime);
  };

  // Valide la nouvelle heure de départ saisie
  const handleTimeSubmit = () => {
    let [hours, minutes] = tempTime.split(":");
    hours = (hours || "00").padStart(2, "0");
    minutes = (minutes || "00").padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    setStartTime(formattedTime);
    setTempTime(formattedTime);
    setIsEditingTime(false);
  };

  // Ouvre le sélecteur natif d'heure (ou simule un clic si showPicker n'est pas supporté par le navigateur)
  const openTimePicker = () => {
    const input = timeInputRef.current;
    if (!input) return;

    input.focus();
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  };

  // Donne le focus à la barre de recherche pour permettre l'ajout d'une nouvelle étape
  const handleAddWaypointClick = () => {
    const searchInput = document.querySelector(".ResearchBarInput");
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Ouvre (ou ferme si déjà ouvert) le popup de configuration d'une étape, en
  // préremplissant les champs avec la configuration actuelle (modifiée ou chargée)
  const handleConfigClick = (index, e) => {
    e.stopPropagation();
    const currentConfig = stepsConfig[index] || {};
    const currentName = waypointNames[index] || "";
    const loadedConfig = getStepLoadConfig(index);

    setConfigPopup(configPopup === index ? null : index);
    const hasConfiguredBreak = currentConfig.breakTime !== undefined;
    const hasBreak = hasConfiguredBreak ? currentConfig.breakTime > 0 : loadedConfig.hasBreak;

    setEditData((prev) => ({
      ...prev,
      [index]: {
        name: currentConfig.name !== undefined ? currentConfig.name : currentName,
        arrivalTime: currentConfig.arrivalTime || "00:00",
        breakTime: hasConfiguredBreak ? currentConfig.breakTime : loadedConfig.breakTime || 5,
        hasBreak
      },
      segmentSections: getStepSegmentSections(index),
      segmentColor: getStepSegmentColor(index),
      segmentRank: getStepSegmentRank(index)
    }));
  };

  // Mémorise le segment ciblé puis ouvre la recherche : le prochain waypoint ajouté
  // sera automatiquement rattaché à ce segment (cf. useEffect sur waypoints.length)
  const handleAddWaypointToSegment = (rank) => {
    setPendingAddSegment({
      rank,
      expectedIndex: waypoints.length
    });
    handleAddWaypointClick();
  };

  // Valide le popup de configuration d'une étape : enregistre la config locale
  // et notifie le parent (Carte.jsx) du nouveau nom / état de pause
  const handleSaveConfig = (e) => {
    e.stopPropagation();
    if (configPopup === null) return;

    const currentEditData = editData[configPopup] || createDefaultEditDataItem();
    const nameToSave =
      currentEditData.name !== undefined ? currentEditData.name.trim() : `Point ${configPopup + 1}`;

    const config = {
      name: nameToSave,
      arrivalTime: currentEditData.arrivalTime || "00:00",
      breakTime: currentEditData.hasBreak ? parseInt(currentEditData.breakTime, 10) || 0 : 0,
      stepNoSections: Math.max(1, parseInt(editData.segmentSections, 10) || 1),
      segmentColor: editData.segmentColor || SEGMENT_COLOR_PALETTE[0],
      segmentRank: Math.max(1, parseInt(editData.segmentRank, 10) || 1)
    };

    setStepsConfig((prev) => ({
      ...prev,
      [configPopup]: config
    }));

    onUpdateWaypoint?.(configPopup, nameToSave, null, {
      step_is_stop: config.breakTime > 0,
      step_stop_duration: config.breakTime || 0
    });
    setConfigPopup(null);
  };

  // Supprime une étape et décale les index des configurations associées
  // (edit data, steps config) pour rester cohérent avec la nouvelle liste
  const handleDeleteWaypointAtIndex = (index, e) => {
    e.stopPropagation();
    onDeleteWaypoint?.(index);

    setStepsConfig((prev) => {
      const next = {};
      Object.keys(prev).forEach((key) => {
        const k = Number(key);
        if (k < index) next[k] = prev[k];
        if (k > index) next[k - 1] = prev[k];
      });
      return next;
    });

    setEditData((prev) => {
      const next = {};
      Object.keys(prev).forEach((key) => {
        const k = Number(key);
        if (k < index) next[k] = prev[k];
        if (k > index) next[k - 1] = prev[k];
      });
      return next;
    });

    if (configPopup === index) {
      setConfigPopup(null);
    }
  };

  // Réordonne la configuration des étapes en accord avec un déplacement de waypoint (drag & drop)
  const reorderStepsConfig = (fromIndex, toIndex) => {
    setStepsConfig((prev) => {
      const length = waypoints.length;
      if (length <= 1) return prev;

      const order = Array.from({ length }, (_, i) => i);
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);

      const next = {};
      order.forEach((oldIndex, newIndex) => {
        if (prev[oldIndex] !== undefined) next[newIndex] = prev[oldIndex];
      });
      return next;
    });
  };

  // --- Glisser-déposer des étapes pour les réordonner ou changer leur segment ---
  const handleDragStart = (index, e) => {
    setDraggedIndex(index);
    setDragOverIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }
  };

  const handleDragOver = (index, e) => {
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  // Étape déposée sur une autre étape : réordonnancement à l'intérieur/entre les segments
  const handleDrop = (targetIndex, e) => {
    e.preventDefault();
    const sourceIndex = draggedIndex;
    setDragOverIndex(null);
    setDraggedIndex(null);
    setDragOverSegmentRank(null);

    if (sourceIndex === null || sourceIndex === undefined || sourceIndex === targetIndex) return;

    onReorderWaypoints?.(sourceIndex, targetIndex);
    reorderStepsConfig(sourceIndex, targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSegmentRank(null);
  };

  // Suit le segment survolé pendant un glissement, pour l'indication visuelle de la zone de dépôt
  const handleSegmentDragOver = (rank, e) => {
    e.preventDefault();
    if (dragOverSegmentRank !== rank) {
      setDragOverSegmentRank(rank);
    }
  };

  // Étape déposée directement sur l'en-tête d'un segment : bascule cette étape dans ce segment
  const handleDropOnSegment = (rank, e) => {
    e.preventDefault();
    const sourceIndex = draggedIndex;
    setDragOverSegmentRank(null);
    setDragOverIndex(null);
    setDraggedIndex(null);

    if (sourceIndex === null || sourceIndex === undefined) return;

    setStepsConfig((prev) => ({
      ...prev,
      [sourceIndex]: {
        ...(prev[sourceIndex] || {}),
        segmentRank: rank
      }
    }));
  };

  // Ajoute un nouveau segment vide (incrémente simplement le nombre de segments configuré)
  const handleAddSegment = () => {
    const newCount = configuredSegmentsCount + 1;
    onGeneralSettingsChange?.({
      ...resolvedGeneralSettings,
      segmentsCount: newCount
    });
  };

  // Supprime le dernier segment : les étapes qui y étaient rattachées sont
  // rabattues sur le nouveau dernier segment pour ne perdre aucune étape
  const handleRemoveSegment = () => {
    if (configuredSegmentsCount <= 1) return;
    const newCount = configuredSegmentsCount - 1;
    setStepsConfig((prev) => {
      const next = {};
      Object.keys(prev).forEach((key) => {
        const k = Number(key);
        const current = prev[k] || {};
        const currentRank = Number.parseInt(current.segmentRank, 10) || 1;
        next[k] = {
          ...current,
          segmentRank: Math.min(currentRank, newCount)
        };
      });
      return next;
    });
    onGeneralSettingsChange?.({
      ...resolvedGeneralSettings,
      segmentsCount: newCount
    });
  };

  // Ouvre la popup de paramètres généraux avec un brouillon initialisé sur les valeurs actuelles
  const openGeneralSettings = () => {
    setGeneralSettingsDraft(mergeGeneralSettings(resolvedGeneralSettings));
    setIsGeneralSettingsOpen(true);
  };

  const closeGeneralSettings = () => {
    setIsGeneralSettingsOpen(false);
  };

  // Valide le brouillon des paramètres généraux : les rangs de segment existants sont
  // ramenés dans les bornes valides si le nombre de segments a été réduit
  const saveGeneralSettings = () => {
    const normalizedSegmentsCount = Math.max(1, Number.parseInt(generalSettingsDraft.segmentsCount, 10) || 1);
    setStepsConfig((prev) => {
      const next = {};
      Object.keys(prev).forEach((key) => {
        const k = Number(key);
        const current = prev[k] || {};
        const currentRank = Number.parseInt(current.segmentRank, 10) || 1;
        next[k] = {
          ...current,
          segmentRank: Math.min(Math.max(1, currentRank), normalizedSegmentsCount)
        };
      });
      return next;
    });
    onGeneralSettingsChange?.({
      ...generalSettingsDraft,
      segmentsCount: normalizedSegmentsCount
    });
    setIsGeneralSettingsOpen(false);
  };

  const getParticipantShareCode = (trip = shareTrip) =>
    trip?.trip_user_code || trip?.trip_participant_code || "";

  // Le partage n'est possible que si le trajet a déjà été enregistré côté serveur (codes générés)
  const hasShareCodes = () => Boolean(shareTrip?.trip_admin_code && getParticipantShareCode());

  const openShareModal = () => {
    if (!hasShareCodes()) {
      setIsShareModalOpen(false);
      setPersistMessage("Erreur : sauvegarde le convoi pour générer les codes et QR codes.");
      return;
    }

    setPersistMessage("");
    setIsShareModalOpen(true);
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
  };

  const openExportModal = () => {
    setExportSaveMessage("");
    setIsExportOpen(true);
  };
  const closeExportModal = () => {
    setExportSaveMessage("");
    setIsExportOpen(false);
  };

  const handleExportGpx = () => {
    onExportGpx?.();
  };

  const handleExportPdf = () => {
    onExportPdf?.();
  };

  // Sauvegarde le convoi dans le localStorage du navigateur (sans appel au backend),
  // utile pour ne pas perdre le travail en cours même sans connexion
  const handleSaveConvoyLocally = async () => {
    if (!waypoints || waypoints.length < 2) {
      setExportSaveMessage("Impossible d'enregistrer localement : au moins 2 étapes requises.");
      return;
    }

    const tripPayload = buildTripPayload();
    const steps = await buildStepsPayload();
    const pendingPayload = {
      trip: tripPayload,
      steps
    };

    saveTripPayloadLocally(pendingPayload);
    setExportSaveMessage("Convoi sauvegarde temporairement.");

    if (typeof onSaveConvoy === "function") {
      onSaveConvoy();
    }
  };

  const PERSIST_TRIP_STORAGE_KEY = "C15Tour.pendingTrip";

  // Conserve temporairement le dernier payload de trajet envoyé/à envoyer au backend
  // (utile pour diagnostiquer ou rejouer un envoi qui aurait échoué)
  const saveTripPayloadLocally = (payload) => {
    try {
      localStorage.setItem(
        PERSIST_TRIP_STORAGE_KEY,
        JSON.stringify({
          createdAt: new Date().toISOString(),
          payload
        })
      );
    } catch (error) {
      console.warn("Unable to save pending trip locally", error);
    }
  };

  // Efface le brouillon local une fois l'enregistrement confirmé côté serveur
  const clearPendingTripPayload = () => {
    try {
      localStorage.removeItem(PERSIST_TRIP_STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to clear pending trip payload", error);
    }
  };

  // Construit l'objet "trip" (métadonnées du trajet) attendu par l'API backend
  const buildTripPayload = () => {
    const trimmedName = name.trim() || initialName || "Convoi";
    let tripStartTime = null;

    if (startTime && startTime !== "--:--") {
      const [hours, minutes] = startTime.split(":").map(Number);
      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        tripStartTime = date.toISOString();
      }
    }

    const speedValue = Number(resolvedGeneralSettings.speed.generalSpeedKmH);
    const isReduced = Boolean(resolvedGeneralSettings.speed.autoReductionEnabled);

    return {
      trip_name: trimmedName,
      trip_speed: Number.isFinite(speedValue) && speedValue > 0 ? speedValue : null,
      trip_start_time: tripStartTime,
      trip_autoroute: resolvedGeneralSettings.routeType.avoidMotorway,
      trip_voie_rapide: resolvedGeneralSettings.routeType.avoidFastRoad,
      trip_chemin: resolvedGeneralSettings.routeType.avoidTrack,
      trip_is_reduced: isReduced,
      trip_reduction: isReduced ? Number(resolvedGeneralSettings.speed.reductionPercent || 0) : 0,
      trip_nb_sections: Math.max(1, Number.parseInt(resolvedGeneralSettings.segmentsCount, 10) || 1)
    };
  };

  // Retrouve une adresse lisible à partir de coordonnées GPS (géocodage inverse),
  // utilisé pour les étapes qui n'ont qu'une position sans libellé (ex: clic sur la carte)
  const reverseGeocodeAddress = async (lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json`
      );
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data?.display_name || null;
    } catch (error) {
      console.warn('Reverse geocode failed', error);
      return null;
    }
  };

  // Détermine l'adresse à afficher/enregistrer pour une étape, avec repli progressif :
  // adresse déjà connue > géocodage inverse > coordonnées brutes > nom de la recherche
  const getStepAddress = async (waypoint, index) => {
    if (waypoint.address) {
      return waypoint.address;
    }

    const lat = Number(waypoint.lat);
    const lng = Number(waypoint.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const reversedAddress = await reverseGeocodeAddress(lat, lng);
      if (reversedAddress) {
        return reversedAddress;
      }
      return `${lat}, ${lng}`;
    }

    return waypoint.display_name || waypoint.name || waypointNames[index] || "";
  };

  // Construit la liste des étapes ("steps") au format attendu par l'API backend,
  // en résolvant d'abord les adresses manquantes en parallèle
  const buildStepsPayload = async () => {
    const stepAddresses = await Promise.all(
      waypoints.map((waypoint, index) => getStepAddress(waypoint, index))
    );

    return waypoints.map((waypoint, index) => {
      var address = stepAddresses[index];
      address = address.substring(0, 255);
      var nameToUse = waypointNames[index] || address || `Etape ${index + 1}`;
      nameToUse = nameToUse.substring(0, 100);
      const stepConfig = stepsConfig[index] || getStepLoadConfig(index);
      const shouldStop = Boolean(stepConfig.hasBreak);
      const stopDuration = Number.isFinite(stepConfig.breakTime) ? stepConfig.breakTime : null;

      return {
        step_name: nameToUse,
        step_address: address,
        step_latitude: Number(waypoint.lat),
        step_longitude: Number(waypoint.lng),
        step_is_stop: shouldStop,
        step_stop_duration: shouldStop && stopDuration != null ? stopDuration : null,
        step_order: index + 1,
        step_no_sections: index < segmentCount ? getStepSegmentSections(index) : 1
      };
    });
  };

  // --- Appels API pour la persistance des étapes d'un trajet côté backend ---
  const fetchExistingTripSteps = async (tripId) => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/trips/${tripId}/steps`);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error || response.statusText || `HTTP ${response.status}`);
    }
    return response.json();
  };

  const createTripStep = async (tripId, stepPayload) => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/trips/${tripId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stepPayload)
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error || response.statusText || `HTTP ${response.status}`);
    }
    return response.json();
  };

  const updateTripStep = async (stepId, stepPayload) => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/steps/${stepId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stepPayload)
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error || response.statusText || `HTTP ${response.status}`);
    }
    return response.json();
  };

  const deleteTripStep = async (stepId) => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/steps/${stepId}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error || response.statusText || `HTTP ${response.status}`);
    }
  };

  const reorderTripSteps = async (tripId, stepIds) => {
    if (!Array.isArray(stepIds) || stepIds.length === 0) return;
    const response = await fetch(`${BACKEND_BASE_URL}/api/trips/${tripId}/steps/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepIds })
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error || response.statusText || `HTTP ${response.status}`);
    }
    return response.json();
  };

  // Crée toutes les étapes d'un trajet fraîchement enregistré (première sauvegarde)
  const persistTripSteps = async (tripId) => {
    const steps = await buildStepsPayload();
    for (const step of steps) {
      await createTripStep(tripId, step);
    }
  };

  // Synchronise les étapes d'un trajet déjà existant avec l'état local actuel :
  // met à jour les étapes en commun, crée les nouvelles, supprime celles en trop,
  // puis renvoie l'ordre final au backend pour conserver la cohérence du trajet.
  const syncTripSteps = async (tripId) => {
    const existingSteps = await fetchExistingTripSteps(tripId);
    const steps = await buildStepsPayload();
    const finalStepIds = [];
    const updateCount = Math.min(existingSteps.length, steps.length);

    for (let i = 0; i < updateCount; i += 1) {
      const existingStep = existingSteps[i];
      const payload = { ...steps[i] };
      delete payload.step_order;
      await updateTripStep(existingStep.step_id, payload);
      finalStepIds.push(existingStep.step_id);
    }

    for (let i = updateCount; i < steps.length; i += 1) {
      const createdStep = await createTripStep(tripId, steps[i]);
      finalStepIds.push(createdStep.step_id);
    }

    for (let i = steps.length; i < existingSteps.length; i += 1) {
      await deleteTripStep(existingSteps[i].step_id);
    }

    if (finalStepIds.length > 0) {
      await reorderTripSteps(tripId, finalStepIds);
    }
  };

  // Enregistre (ou met à jour) le convoi côté serveur : sauvegarde locale d'abord,
  // puis création/mise à jour du trajet et de ses étapes via l'API. En cas d'échec
  // de la persistance des étapes lors d'une première création, on supprime le trajet
  // orphelin créé côté serveur pour éviter de laisser un trajet sans aucune étape.
  const handlePersistConvoy = async () => {
    setPersistMessage("");
    if (!waypoints || waypoints.length < 2) {
      setPersistMessage("Un convoi doit contenir au moins deux étapes pour être enregistré.");
      return;
    }

    const savedLocally = onSaveConvoy?.();
    if (!savedLocally) {
      setPersistMessage("Impossible d'enregistrer localement le convoi avant l'envoi.");
      return;
    }

    const tripPayload = buildTripPayload();
    const steps = await buildStepsPayload();
    const pendingPayload = {
      trip: tripPayload,
      steps,
      backendTripId
    };

    saveTripPayloadLocally(pendingPayload);

    try {
      const method = backendTripId ? "PUT" : "POST";
      const tripUrl = backendTripId
        ? `${BACKEND_BASE_URL}/api/trips/${backendTripId}`
        : `${BACKEND_BASE_URL}/api/trips`;

      const tripResponse = await fetch(tripUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripPayload)
      });

      if (!tripResponse.ok) {
        const errorBody = await tripResponse.json().catch(() => null);
        throw new Error(errorBody?.error || tripResponse.statusText || `HTTP ${tripResponse.status}`);
      }

      const createdTrip = await tripResponse.json();
      const tripId = createdTrip.trip_id;
      setBackendTripId(tripId);
      try {
        if (backendTripId) {
          await syncTripSteps(tripId);
        } else {
          await persistTripSteps(tripId);
        }
      } catch (stepsError) {
        console.error("Failed to persist steps", stepsError);
        if (!backendTripId) {
          let deleteTrip = false;

          // on regarde si des étapes ont été créées malgré l'erreur, pour éviter de laisser un trip sans étapes en cas de problème de persistance
          await fetch(`${BACKEND_BASE_URL}/api/trips/${createdTrip.trip_id}/steps`, {
            method: "GET"
          }).then((res) => res.json()).then((data) => {
            console.log("Steps persisted before failure:", data);
            if (Array.isArray(data) && data.length === 0) {
              console.warn("No steps were persisted for the trip before failure, deleting created trip");
              deleteTrip = true;
            }
          }).catch((fetchStepsError) => {
            console.error("Failed to fetch steps after persistence failure", fetchStepsError);
            deleteTrip = true;
          });

          if (deleteTrip) {
            // Suppression du trip créé pour éviter d'avoir un trip sans étapes
            setBackendTripId(null);
            await fetch(`${BACKEND_BASE_URL}/api/trips/${createdTrip.trip_id}`, {
              method: "DELETE"
            }).catch((deleteError) => {
              console.error("Failed to delete trip after steps persistence failure", deleteError);
            });
          }
        }
        throw new Error("Une erreur est survenue lors de l'enregistrement des étapes. Veuillez réessayer.");
      }
      clearPendingTripPayload();
      setShareTrip(createdTrip);
      onTripPersisted?.(createdTrip, savedLocally);
      setPersistMessage("Convoi enregistré avec succès.");
      onPersistConvoy?.(createdTrip.trip_id);
    }
    catch (error) {
      console.error("Failed to persist convoy", error);
      setPersistMessage(
        `Erreur lors de l'enregistrement du convoi : ${error.message || "Une erreur s'est produite"}`
      );
    }
  };

  // Affiche le popup de configuration d'une étape (nom, heure d'arrivée, pause) si ouvert
  const renderWaypointConfig = (index) => {
    if (configPopup !== index) return null;
    const currentEditData = getEditDataItem(index);

    return (
      <div className="waypoint-config-overlay">
        <div className="waypoint-config-popup" ref={popupRef}>
          <h3>Configuration de l'étape</h3>

          <div className="form-group">
            <label htmlFor="step-name">Nom de l'étape</label>
            <input
              id="step-name"
              type="text"
              value={currentEditData.name}
              onChange={(e) => updateEditDataItem(index, (prev) => ({ ...prev, name: e.target.value }))}
              className="config-input"
              placeholder="Nom de l'étape"
            />
          </div>

          <div className="form-group">
            <label htmlFor="arrival-time">Heure d'arrivée</label>
            <input
              id="arrival-time"
              type="time"
              value={currentEditData.arrivalTime || "00:00"}
              onChange={(e) => updateEditDataItem(index, (prev) => ({ ...prev, arrivalTime: e.target.value }))}
              className="config-input"
            />
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="has-break"
                checked={currentEditData.hasBreak}
                onChange={(e) => updateEditDataItem(index, (prev) => ({ ...prev, hasBreak: e.target.checked }))}
                className="config-checkbox"
              />
              <label htmlFor="has-break" value="currentEditData.hasBreak">
                Ajouter un temps de pause
              </label>
            </div>
            {currentEditData.hasBreak && (
              <div className="break-time-container">
                <input
                  id="break-time"
                  type="number"
                  min="0"
                  value={currentEditData.breakTime}
                  onChange={(e) =>
                    updateEditDataItem(index, (prev) => ({
                      ...prev,
                      breakTime: parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="config-input"
                />
                <span className="break-time-label">minutes</span>
              </div>
            )}
          </div>

          <div className="popup-actions">
            <button className="delete-btn" onClick={() => setConfigPopup(null)}>
              Annuler
            </button>
            <button className="validate-btn" onClick={handleSaveConfig}>
              Valider
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Affiche la popup des paramètres généraux du trajet (segments, type de route, vitesse)
  const renderGeneralSettings = () => {
    if (!isGeneralSettingsOpen) return null;

    return (
      <div className="general-settings-overlay" onClick={closeGeneralSettings}>
        <div className="general-settings-popup" onClick={(e) => e.stopPropagation()}>
          <h3>PARAMETRES GENERAUX</h3>

          <div className="settings-section">
            <div className="settings-section-title">Segments</div>
            <div className="settings-row">
              <span>Nombre de segments</span>
              <div className="settings-inline">
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="settings-number-input"
                  value={generalSettingsDraft.segmentsCount}
                  onChange={(e) =>
                    setGeneralSettingsDraft((prev) => ({
                      ...prev,
                      segmentsCount: Math.max(1, parseInt(e.target.value, 10) || 1)
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Type de route</div>
            <label className="settings-row">
              <span>Autoroute</span>
              <input
                type="checkbox"
                checked={generalSettingsDraft.routeType.avoidMotorway}
                onChange={(e) =>
                  setGeneralSettingsDraft((prev) => ({
                    ...prev,
                    routeType: { ...prev.routeType, avoidMotorway: e.target.checked }
                  }))
                }
              />
            </label>
            <label className="settings-row">
              <span>Voie rapide</span>
              <input
                type="checkbox"
                checked={generalSettingsDraft.routeType.avoidFastRoad}
                onChange={(e) =>
                  setGeneralSettingsDraft((prev) => ({
                    ...prev,
                    routeType: { ...prev.routeType, avoidFastRoad: e.target.checked }
                  }))
                }
              />
            </label>
            <label className="settings-row">
              <span>Chemin</span>
              <input
                type="checkbox"
                checked={generalSettingsDraft.routeType.avoidTrack}
                onChange={(e) =>
                  setGeneralSettingsDraft((prev) => ({
                    ...prev,
                    routeType: { ...prev.routeType, avoidTrack: e.target.checked }
                  }))
                }
              />
            </label>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Vitesse</div>
            <div className="settings-row">
              <span>Vitesse générale</span>
              <div className="settings-inline">
                <input
                  type="number"
                  min="0"
                  max="130"
                  className="settings-number-input"
                  value={generalSettingsDraft.speed.generalSpeedKmH}
                  onChange={(e) =>
                    setGeneralSettingsDraft((prev) => ({
                      ...prev,
                      speed: {
                        ...prev.speed,
                        generalSpeedKmH: Math.max(0, parseInt(e.target.value, 10) || 0)
                      }
                    }))
                  }
                />
                <span>Km/h</span>
              </div>
            </div>

            <label className="settings-row">
              <span>Réduction automatique</span>
              <input
                type="checkbox"
                checked={generalSettingsDraft.speed.autoReductionEnabled}
                onChange={(e) =>
                  setGeneralSettingsDraft((prev) => ({
                    ...prev,
                    speed: { ...prev.speed, autoReductionEnabled: e.target.checked }
                  }))
                }
              />
            </label>

            {generalSettingsDraft.speed.autoReductionEnabled && (
              <div className="settings-row settings-sub-row">
                <span>Appliquer une diminution de</span>
                <div className="settings-inline">
                  <input
                    type="number"
                    min="0"
                    max="80"
                    className="settings-number-input"
                    value={generalSettingsDraft.speed.reductionPercent}
                    onChange={(e) =>
                      setGeneralSettingsDraft((prev) => ({
                        ...prev,
                        speed: {
                          ...prev.speed,
                          reductionPercent: Math.max(0, parseInt(e.target.value, 10) || 0)
                        }
                      }))
                    }
                  />
                  <span>%</span>
                </div>
              </div>
            )}
          </div>

          <div className="general-settings-actions general-settings-actions--settings">
            <button className="delete-btn" onClick={closeGeneralSettings}>ANNULER</button>
            <button className="validate-btn" onClick={saveGeneralSettings}>VALIDER</button>
          </div>
        </div>
      </div>
    );
  };

  // Affiche la popup de partage : codes et QR codes pour rejoindre le convoi
  // en tant qu'organisateur ou participant depuis l'application mobile
  const renderShareModal = () => {
    if (!isShareModalOpen) return null;
    const participantCode = getParticipantShareCode();
    const organizerUrl = shareTrip?.trip_admin_code
      ? `${MOBILE_DEEP_LINK_BASE}?role=leader&code=${encodeURIComponent(shareTrip.trip_admin_code)}`
      : "";
    const participantUrl = participantCode
      ? `${MOBILE_DEEP_LINK_BASE}?role=participant&code=${encodeURIComponent(participantCode)}`
      : "";

    return (
      <div className="general-settings-overlay" onClick={closeShareModal}>
        <div className="general-settings-popup share-popup" onClick={(e) => e.stopPropagation()}>
          <h3>PARTAGER LE CONVOI</h3>

          <div style={{ display: "flex", flexDirection: "row", gap: "20px" }}>
            <div style={{ flex: 1 }}>
              <h4>Organisateur</h4>
              <div style={{ display: "flex", flexDirection: "row", gap: "10px", alignItems: "baseline" }}>
                <h5>Code</h5>
                <div>
                  {shareTrip?.trip_admin_code}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "row", gap: "10px", marginTop: "14px" }}>
                <h5>QR Code</h5>
                <div className="share-qr">
                  {organizerUrl ? (
                    <QRCodeSVG
                      value={organizerUrl}
                      size={"auto"}
                      fgColor="#8f2f66"
                      includeMargin
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h4>Participant</h4>
              <div style={{ display: "flex", flexDirection: "row", gap: "10px", alignItems: "baseline" }}>
                <h5>Code</h5>
                <div>
                  {participantCode}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "row", gap: "10px", marginTop: "14px" }}>
                <h5>QR Code</h5>
                <div className="share-qr">
                  {participantUrl ? (
                    <QRCodeSVG
                      value={participantUrl}
                      size={"auto"}
                      fgColor="#8f2f66"
                      includeMargin
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="general-settings-actions">
            <button className="validate-btn" onClick={closeShareModal}>✗ FERMER</button>
          </div>
        </div>
      </div>
    );
  };

  // Affiche la popup d'export : téléchargement PDF/GPX et sauvegarde locale
  const renderExportModal = () => {
    if (!isExportOpen) return null;

    return (
      <div className="general-settings-overlay" onClick={closeExportModal}>
        <div className="general-settings-popup export-popup" onClick={(e) => e.stopPropagation()}>
          <h3>EXPORTER LE TRAJET</h3>

          <div className="settings-section">
            <div className="settings-section-title">Format</div>

            <div className="settings-row export-row">
              <span>PDF</span>
              <button
                className="export-link-btn"
                type="button"
                onClick={handleExportPdf}
                disabled={!canExportPdf}
              >
                Télécharger
              </button>
            </div>

            <div className="settings-row export-row">
              <span>GPX</span>
              <button
                className="export-link-btn"
                type="button"
                onClick={handleExportGpx}
                disabled={!canExportGpx}
              >
                Télécharger
              </button>
            </div>

            <div className="settings-row export-row">
              <span>Enregistrer localement</span>
              <button
                className="export-link-btn"
                type="button"
                onClick={handleSaveConvoyLocally}
                disabled={!canSaveConvoy}
              >
                Enregistrer
              </button>
            </div>
            {exportSaveMessage && <div className="export-save-message">{exportSaveMessage}</div>}
          </div>

          <div className="general-settings-actions">
            <button className="validate-btn export-back-btn" onClick={closeExportModal}>
              RETOUR
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Rendu principal : en-tête (nom du convoi), corps (départ, étapes, arrivée),
  // boutons d'action et popups (paramètres, partage, export) ---
  return (
    <div className="convoyCard">
      <div className="convoyHeader">
        <div className="convoyNameRow">
          {onBackToConvoySelector && (
            <button
              className="iconBtn convoyBackBtn"
              type="button"
              aria-label="Retour a la selection des convois"
              onClick={onBackToConvoySelector}
            >
              <img src={BackIcon} alt="Retour" />
            </button>
          )}
          {isEditing ? (
            <input
              ref={inputRef}
              className="convoyNameInput"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit();
                if (e.key === "Escape") {
                  setName(initialName);
                  setIsEditing(false);
                }
              }}
              onBlur={handleNameSubmit}
            />
          ) : (
            <div className="convoyTitle">{name}</div>
          )}
          <button
            className="iconBtn"
            type="button"
            aria-label={isEditing ? "Valider" : "Editer le nom"}
            onClick={handleNameButtonClick}
            disabled={isNameButtonLocked}
          >
            <img src={isEditing ? CheckIcon : PenIcon} alt={isEditing ? "Valider" : "Editer le nom"} />
          </button>
        </div>
      </div>

      {isEdited && (
        <div className="convoyBody">
          <div className="convoySection">
            <div className="convoySectionLeft">
              <img src={FlagIcon} alt="Départ" className="flagIcon" />
              <span className="label">DÉPART</span>
            </div>

            <div className="timeEdit">
              {isEditingTime ? (
                <>
                  <div
                    className="timeInputWrapper"
                    onClick={openTimePicker}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <input
                      ref={timeInputRef}
                      type="time"
                      className="timeInput"
                      value={tempTime}
                      onChange={(e) => setTempTime(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTimeSubmit();
                        if (e.key === "Escape") {
                          setTempTime(startTime);
                          setIsEditingTime(false);
                        }
                      }}
                      step="60"
                    />
                    <div className="timeDisplay">{tempTime}</div>
                  </div>
                  <button className="iconBtn" type="button" aria-label="Valider l'heure" onClick={handleTimeSubmit}>
                    <img src={CheckIcon} alt="Valider" />
                  </button>
                </>
              ) : (
                <>
                  <div className="timeDisplay">{startTime}</div>
                  <button className="iconBtn" type="button" aria-label="Editer l'heure" onClick={startTimeEdit}>
                    <img src={PenIcon} alt="Editer" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="steps-container">
            {!hasWaypoints ? (
              <div className="stepsEmpty" onClick={handleAddWaypointClick}>
                <img alt="" className="plus-icon" src={PlusIcon} />
                {stepsText}
              </div>
            ) : (
              <div className="steps-list">
                {(() => {
                  // Regroupe les étapes consécutives appartenant au même segment (dans
                  // l'ordre du trajet), puis ajoute les segments configurés mais encore vides
                  const runs = [];
                  waypoints.forEach((_, index) => {
                    const rank = getStepSegmentRank(index);
                    if (runs.length === 0 || runs[runs.length - 1].rank !== rank) {
                      runs.push({ rank, indexes: [index] });
                    } else {
                      runs[runs.length - 1].indexes.push(index);
                    }
                  });
                  // Add empty segments that have no waypoints yet
                  for (let r = 1; r <= configuredSegmentsCount; r++) {
                    if (!runs.some((run) => run.rank === r)) {
                      runs.push({ rank: r, indexes: [] });
                    }
                  }

                  return (
                    <>
                    {runs.map((run, runIdx) => {
                    const { rank, indexes } = run;
                    const segmentColor = indexes.length > 0
                      ? getStepSegmentColor(indexes[0])
                      : SEGMENT_COLOR_PALETTE[(rank - 1) % SEGMENT_COLOR_PALETTE.length];

                    return (
                      <div
                        key={`run-${runIdx}`}
                        className={`segment-block ${dragOverSegmentRank === rank ? "is-drop-target" : ""}`}
                        onDragOver={(e) => handleSegmentDragOver(rank, e)}
                        onDrop={(e) => handleDropOnSegment(rank, e)}
                      >
                        <div className="segment-heading">
                          <span>Segment {rank}</span>
                          <span className="segment-color-square" style={{ backgroundColor: segmentColor }} />
                        </div>
                        <div className="segment-rows">
                          <div className="segment-vertical-bar" style={{ backgroundColor: segmentColor }} />
                          <div className="segment-rows-list">
                            {indexes.map((index) => {
                              const isFirst = index === 0;
                              const isLast = index === waypoints.length - 1;
                              const label =
                                waypointNames[index] ||
                                (isFirst ? "Point de depart" : isLast ? "Point d'arrivee" : `Etape ${index + 1}`);

                              return (
                                <div
                                  key={index}
                                  className={`step-item ${draggedIndex === index ? "is-dragging" : ""} ${dragOverIndex === index ? "is-drag-over" : ""}`}
                                  onDragOver={(e) => handleDragOver(index, e)}
                                  onDrop={(e) => handleDrop(index, e)}
                                >
                                  <button
                                    className="step-drag-btn"
                                    type="button"
                                    aria-label={`Reordonner l'etape ${index + 1}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(index, e)}
                                    onDragEnd={handleDragEnd}
                                  >
                                    <img src={MenuIcon} alt="Deplacer" />
                                  </button>

                                  <div className="step-content">
                                    <div className="step-number">{index + 1}</div>
                                    <div className="step-info">
                                      <div className="step-name">{label}</div>
                                      <div className="step-time">
                                        {calculateWaypointTime(index)}
                                        {stepsConfig[index]?.breakTime > 0 && ` - ${stepsConfig[index].breakTime} min`}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    className={`step-config-btn ${configPopup === index ? "active" : ""}`}
                                    onClick={(e) => handleConfigClick(index, e)}
                                  >
                                    <img src={GearIcon} alt="Configurer" />
                                  </button>

                                  <button
                                    className="step-delete-btn"
                                    type="button"
                                    aria-label={`Supprimer l'etape ${index + 1}`}
                                    onClick={(e) => handleDeleteWaypointAtIndex(index, e)}
                                  >
                                    <img src={CloseIcon} alt="Supprimer" />
                                  </button>

                                  {renderWaypointConfig(index)}
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              className="segment-add-btn"
                              onClick={() => handleAddWaypointToSegment(rank)}
                            >
                              <img alt="" className="plus-icon" src={PlusIcon} />
                              Ajouter une etape
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                    <div className="segment-actions-row">
                    <button
                      type="button"
                      className="add-segment-btn"
                      onClick={handleAddSegment}
                    >
                      <img alt="" className="plus-icon" src={PlusIcon} />
                      Ajouter un segment
                    </button>
                    {configuredSegmentsCount > 1 && (
                      <button
                        type="button"
                        className="remove-segment-btn"
                        onClick={handleRemoveSegment}
                      >
                        &minus;
                      </button>
                    )}
                    </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="convoySection bottom">
            <div className="convoySectionLeft">
              <img src={FlagIcon} alt="Arrivee" className="flagIcon" />
              <span className="label">ARRIVÉE</span>
            </div>
            <div className="arriveeTime">{calculateArrivalTime()}</div>
          </div>

          <div className="convoyActions">
            <button className="iconBtn" type="button" aria-label="Parametres" onClick={openGeneralSettings}>
              <img src={GearIcon} alt="Parametres" />
            </button>
            <button className="iconBtn" type="button" aria-label="Partager" onClick={openShareModal}>
              <img src={ShareIcon} alt="Partager" />
            </button>
            <button className="iconBtn" type="button" aria-label="Enregistrer" onClick={handlePersistConvoy}>
              <img src={SaveIcon} alt="Enregistrer" />
            </button>
            <button className="iconBtn" type="button" aria-label="Telecharger" onClick={openExportModal}>
              <img src={DownloadIcon} alt="Telecharger" />
            </button>
          </div>
          {persistMessage && <div className="persist-message">{persistMessage}</div>}
        </div>
      )}

      {renderGeneralSettings()}
      {renderShareModal()}
      {renderExportModal()}
    </div>
  );
}
