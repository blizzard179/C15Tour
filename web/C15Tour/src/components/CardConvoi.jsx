import React, { useMemo, useState, useRef, useEffect } from "react";
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

const DEFAULT_GENERAL_SETTINGS = {
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

const mergeGeneralSettings = (input) => ({
  routeType: {
    ...DEFAULT_GENERAL_SETTINGS.routeType,
    ...(input?.routeType || {})
  },
  speed: {
    ...DEFAULT_GENERAL_SETTINGS.speed,
    ...(input?.speed || {})
  }
});

const BACKEND_BASE_URL = "http://localhost:3000";

export default function CardConvoi({
  initialName = "Nom du convoi",
  initialStartTime = "00:00",
  waypoints = [],
  waypointNames = [],
  initialStepConfigs = {},
  initialBackendTripId = null,
  routeDurationMinutes = null,
  generalSettings = DEFAULT_GENERAL_SETTINGS,
  onUpdateWaypoint,
  onDeleteWaypoint,
  onReorderWaypoints,
  onGeneralSettingsChange,
  canExportGpx = false,
  onExportGpx,
  canSaveConvoy = false,
  onSaveConvoy,
  onBackToConvoySelector,
  onConvoyNameChange
}) {
  const [name, setName] = useState(initialName);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [isEdited, setIsEdited] = useState(false);
  const [configPopup, setConfigPopup] = useState(null);
  const [editData, setEditData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [stepsConfig, setStepsConfig] = useState({});
  const [tempTime, setTempTime] = useState(initialStartTime);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isGeneralSettingsOpen, setIsGeneralSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportSaveMessage, setExportSaveMessage] = useState("");
  const [persistMessage, setPersistMessage] = useState("");
  const [backendTripId, setBackendTripId] = useState(initialBackendTripId);
  const [generalSettingsDraft, setGeneralSettingsDraft] = useState(mergeGeneralSettings(generalSettings));
  const [isNameButtonLocked, setIsNameButtonLocked] = useState(false);

  const createDefaultEditDataItem = () => ({
    name: "",
    arrivalTime: "00:00",
    breakTime: 0,
    hasBreak: false
  });

  const getEditDataItem = (index) => editData[index] || createDefaultEditDataItem();

  const getStepLoadConfig = (index) => {
    const waypoint = waypoints[index] || {};
    const hasStop = waypoint.step_is_stop ?? waypoint.isStop ?? false;
    const stopDuration = waypoint.step_stop_duration ?? waypoint.stopDuration;
    return {
      hasBreak: Boolean(hasStop),
      breakTime: hasStop ? (Number.isFinite(stopDuration) ? stopDuration : 0) : 0
    };
  };

  const getStepBreakTime = (index) => {
    const configured = stepsConfig[index];
    if (configured && Number.isFinite(configured.breakTime)) {
      return configured.breakTime;
    }
    return getStepLoadConfig(index).breakTime;
  };

  const updateEditDataItem = (index, updater) =>
    setEditData((prev) => {
      const next = [...prev];
      next[index] = updater(prev[index] || createDefaultEditDataItem());
      return next;
    });

  useEffect(() => {
    setStepsConfig({ ...initialStepConfigs });
  }, [initialStepConfigs]);

  const popupRef = useRef(null);
  const inputRef = useRef(null);
  const timeInputRef = useRef(null);
  const nameButtonLockTimeoutRef = useRef(null);

  const resolvedGeneralSettings = useMemo(
    () => mergeGeneralSettings(generalSettings),
    [generalSettings]
  );

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    setBackendTripId(initialBackendTripId ?? null);
  }, [initialBackendTripId]);

  useEffect(() => {
    if (waypoints.length > 0) {
      setIsEdited(true);
    }
  }, [waypoints.length]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditingTime && timeInputRef.current) {
      timeInputRef.current.focus();
    }
  }, [isEditingTime]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setConfigPopup(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (nameButtonLockTimeoutRef.current) {
        clearTimeout(nameButtonLockTimeoutRef.current);
      }
    };
  }, []);

  const hasWaypoints = waypoints.length > 0;
  const stepsText = useMemo(() => {
    if (waypoints.length === 0) return "Aucune etape ajoutee";
    if (waypoints.length === 1) return "1 etape";
    return `${waypoints.length} etapes`;
  }, [waypoints.length]);

  const getAdjustedRouteDurationMinutes = () => {
    if (!Number.isFinite(routeDurationMinutes) || routeDurationMinutes < 0) return null;

    const speed = Number(resolvedGeneralSettings.speed.generalSpeedKmH);
    const speedFactor = speed > 0 ? 50 / speed : 1;

    let adjusted = routeDurationMinutes * speedFactor;

    if (resolvedGeneralSettings.speed.autoReductionEnabled) {
      const reduction = Math.max(0, Number(resolvedGeneralSettings.speed.reductionPercent) || 0);
      adjusted *= 1 + reduction / 100;
    }

    return Math.max(0, Math.round(adjusted));
  };

  const getSegmentTravelTime = (index) => {
    const configuredTravelTime = stepsConfig[index]?.travelTime;
    if (Number.isFinite(configuredTravelTime)) {
      return Math.max(0, configuredTravelTime);
    }

    const segmentCount = Math.max(0, waypoints.length - 1);
    const adjustedRouteDurationMinutes = getAdjustedRouteDurationMinutes();

    if (Number.isFinite(adjustedRouteDurationMinutes) && adjustedRouteDurationMinutes >= 0) {
      if (segmentCount <= 1) return adjustedRouteDurationMinutes;
      return Math.round(adjustedRouteDurationMinutes / segmentCount);
    }

    return 30;
  };

  const getTotalTravelTime = () => {
    const segmentCount = Math.max(0, waypoints.length - 1);
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

  const handleNameSubmit = () => {
    const trimmedName = name.trim();
    if (trimmedName !== "") {
      setName(trimmedName);
      onConvoyNameChange?.(trimmedName);
      setIsEditing(false);
      setIsEdited(true);
    }
  };

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

  const handleNameButtonClick = () => {
    if (isNameButtonLocked) return;

    if (isEditing) {
      handleNameSubmit();
    } else {
      setIsEditing(true);
    }

    lockNameButtonTemporarily();
  };

  const startTimeEdit = () => {
    let [hours, minutes] = startTime.split(":");
    hours = (hours || "00").padStart(2, "0");
    minutes = (minutes || "00").padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    setIsEditingTime(true);
    setTempTime(formattedTime);
  };

  const handleTimeSubmit = () => {
    let [hours, minutes] = tempTime.split(":");
    hours = (hours || "00").padStart(2, "0");
    minutes = (minutes || "00").padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    setStartTime(formattedTime);
    setTempTime(formattedTime);
    setIsEditingTime(false);
  };

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

  const handleAddWaypointClick = () => {
    const searchInput = document.querySelector(".ResearchBarInput");
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleConfigClick = (index, e) => {
    e.stopPropagation();
    const currentConfig = stepsConfig[index] || {};
    const currentName = waypointNames[index] || "";
    const loadedConfig = getStepLoadConfig(index);

    setConfigPopup(configPopup === index ? null : index);
    setEditData((prev) => {
      const next = [...prev];
      next[index] = {
        name: currentConfig.name !== undefined ? currentConfig.name : currentName,
        arrivalTime: currentConfig.arrivalTime || "00:00",
        breakTime:
          currentConfig.breakTime !== undefined ? currentConfig.breakTime : loadedConfig.breakTime,
        hasBreak:
          currentConfig.hasBreak !== undefined ? currentConfig.hasBreak : loadedConfig.hasBreak
      };
      return next;
    });
  };

  const handleSaveConfig = (e) => {
    e.stopPropagation();
    if (configPopup === null) return;

    const currentEditData = editData[configPopup] || createDefaultEditDataItem();
    const nameToSave =
      currentEditData.name !== undefined ? currentEditData.name.trim() : `Point ${configPopup + 1}`;

    const config = {
      name: nameToSave,
      arrivalTime: currentEditData.arrivalTime || "00:00",
      hasBreak: Boolean(currentEditData.hasBreak),
      breakTime: currentEditData.hasBreak ? parseInt(currentEditData.breakTime, 10) || 0 : 0
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
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });

    if (configPopup === index) {
      setConfigPopup(null);
    }
  };

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

  const handleDrop = (targetIndex, e) => {
    e.preventDefault();
    const sourceIndex = draggedIndex;
    setDragOverIndex(null);
    setDraggedIndex(null);

    if (sourceIndex === null || sourceIndex === undefined || sourceIndex === targetIndex) return;

    onReorderWaypoints?.(sourceIndex, targetIndex);
    reorderStepsConfig(sourceIndex, targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const openGeneralSettings = () => {
    setGeneralSettingsDraft(mergeGeneralSettings(resolvedGeneralSettings));
    setIsGeneralSettingsOpen(true);
  };

  const closeGeneralSettings = () => {
    setIsGeneralSettingsOpen(false);
  };

  const saveGeneralSettings = () => {
    onGeneralSettingsChange?.(generalSettingsDraft);
    setIsGeneralSettingsOpen(false);
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

  const handleSaveConvoyLocally = () => {
    if (!waypoints || waypoints.length < 2) {
      setExportSaveMessage("Impossible d'enregistrer localement : au moins 2 étapes requises.");
      return;
    }

    const tripPayload = buildTripPayload();
    const pendingPayload = {
      trip: tripPayload,
      steps: buildStepsPayload()
    };

    saveTripPayloadLocally(pendingPayload);
    setExportSaveMessage("Convoi sauvegarde temporairement.");

    if (typeof onSaveConvoy === "function") {
      onSaveConvoy();
    }
  };

  const PERSIST_TRIP_STORAGE_KEY = "C15Tour.pendingTrip";

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

  const clearPendingTripPayload = () => {
    try {
      localStorage.removeItem(PERSIST_TRIP_STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to clear pending trip payload", error);
    }
  };

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
      trip_reduction: isReduced ? Number(resolvedGeneralSettings.speed.reductionPercent || 0) : 0
    };
  };

  const buildStepsPayload = () => {
    return waypoints.map((waypoint, index) => {
      const address =
        waypoint.display_name || waypoint.address || waypoint.name || waypointNames[index] || `${waypoint.lat}, ${waypoint.lng}`;
      const nameToUse = waypointNames[index] || address || `Etape ${index + 1}`;
      const stepConfig = stepsConfig[index] || getStepLoadConfig(index);
      const shouldStop = Boolean(stepConfig.hasBreak);
      const stopDuration = Number.isFinite(stepConfig.breakTime) ? stepConfig.breakTime : 0;

      return {
        step_name: nameToUse,
        step_address: address,
        step_latitude: Number(waypoint.lat),
        step_longitude: Number(waypoint.lng),
        step_is_stop: shouldStop,
        step_stop_duration: shouldStop ? stopDuration : 0,
        step_order: index + 1
      };
    });
  };

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

  const persistTripSteps = async (tripId) => {
    const steps = buildStepsPayload();
    for (const step of steps) {
      await createTripStep(tripId, step);
    }
  };

  const syncTripSteps = async (tripId) => {
    const existingSteps = await fetchExistingTripSteps(tripId);
    const steps = buildStepsPayload();
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

  const handlePersistConvoy = async () => {
    setPersistMessage("");
    if (!waypoints || waypoints.length < 2) {
      setPersistMessage("Un convoi doit contenir au moins deux étapes pour être enregistre.");
      return;
    }

    const savedLocally = onSaveConvoy?.();
    if (!savedLocally) {
      setPersistMessage("Impossible d'enregistrer localement le convoi avant l'envoi.");
      return;
    }

    const tripPayload = buildTripPayload();
    const pendingPayload = {
      trip: tripPayload,
      steps: buildStepsPayload(),
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
          })
            .catch((fetchStepsError) => {
              console.error("Failed to fetch steps after persistence failure", fetchStepsError);
              deleteTrip = true;
            });

          if (deleteTrip) {
            // Suppression du trip créé pour éviter d'avoir un trip sans étapes
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
      setPersistMessage("Convoi enregistre avec succes.");
    } catch (error) {
      console.error("Failed to persist convoy", error);
      setPersistMessage(
        `Erreur lors de l'enregistrement du convoi : ${error.message || "Une erreur s'est produite"}`
      );
    }
  };

  const renderWaypointConfig = (index) => {
    if (configPopup !== index) return null;
    const currentEditData = getEditDataItem(index);

    return (
      <div className="waypoint-config-overlay">
        <div className="waypoint-config-popup" ref={popupRef}>
          <h3>Configuration de l'etape</h3>

          <div className="form-group">
            <label htmlFor="step-name">Nom de l'etape</label>
            <input
              id="step-name"
              type="text"
              value={currentEditData.name}
              onChange={(e) => updateEditDataItem(index, (prev) => ({ ...prev, name: e.target.value }))}
              className="config-input"
              placeholder="Nom de l'etape"
            />
          </div>

          <div className="form-group">
            <label htmlFor="arrival-time">Heure d'arrivee</label>
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

  const renderGeneralSettings = () => {
    if (!isGeneralSettingsOpen) return null;

    return (
      // parameters generaux
      <div className="general-settings-overlay" onClick={closeGeneralSettings}>
        <div className="general-settings-popup" onClick={(e) => e.stopPropagation()}>
          <h3>PARAMETRES GENERAUX</h3>

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
              <span>Vitesse generale</span>
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
              <span>Reduction automatique</span>
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

          <div className="general-settings-actions">
            <button className="delete-btn" onClick={closeGeneralSettings}>ANNULER</button>
            <button className="validate-btn" onClick={saveGeneralSettings}>VALIDER</button>
          </div>
        </div>
      </div>
    );
  };

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
              <button className="export-link-btn" type="button" disabled>
                Telecharger
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
                Telecharger
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
            <button className="delete-btn" onClick={closeExportModal}>RETOUR</button>
          </div>
        </div>
      </div>
    );
  };

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
              <img src={FlagIcon} alt="Depart" className="flagIcon" />
              <span className="label">DEPART</span>
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
                {waypoints.map((_, index) => {
                  const isFirst = index === 0;
                  const isLast = index === waypoints.length - 1;
                  const label =
                    waypointNames[index] ||
                    (isFirst ? "Point de depart" : isLast ? "Point d'arrivee" : `Etape ${index}`);

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
                            {getStepBreakTime(index) > 0 && ` - ${getStepBreakTime(index)} min`}
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
              </div>
            )}
          </div>

          <div className="convoySection bottom">
            <div className="convoySectionLeft">
              <img src={FlagIcon} alt="Arrivee" className="flagIcon" />
              <span className="label">ARRIVEE</span>
            </div>
            <div className="arriveeTime">{calculateArrivalTime()}</div>
          </div>

          <div className="convoyActions">
            <button className="iconBtn" type="button" aria-label="Parametres" onClick={openGeneralSettings}>
              <img src={GearIcon} alt="Parametres" />
            </button>
            <button className="iconBtn" type="button" aria-label="Partager">
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
      {renderExportModal()}
    </div>
  );
}
