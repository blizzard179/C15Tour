export const DEFAULT_GENERAL_SETTINGS = {
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

export const SEGMENT_COLOR_PALETTE = ["#4A6CF7", "#2AA876", "#FF9F1C", "#E63946", "#7B61FF", "#0096C7"];

export const mergeGeneralSettings = (input) => ({
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

export const getAdjustedRouteDurationMinutes = (resolvedGeneralSettings, routeDistanceKm, routeDurationMinutes) => {
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

export const formatTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const parseTime = (timeStr) => {
  if (!timeStr || timeStr === "--:--") return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

export const stepsText = (waypointCount) => {
  if (waypointCount === 0) return "Aucune etape ajoutee";
  if (waypointCount === 1) return "1 etape";
  return `${waypointCount} etapes`;
};
