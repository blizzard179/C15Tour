import { API_BASE_URL } from '@/constants/api';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type TripStep = {
  step_latitude: number;
  step_longitude: number;
  step_name?: string | null;
};

export type RouteGeometry = {
  coordinates: number[][];
};

export type RouteSummary = {
  distanceKm?: number | null;
  durationSeconds?: number | null;
};

export type RouteResult = {
  geometry: RouteGeometry | null;
  summary: RouteSummary | null;
};

export type GuidanceResult = {
  instruction: string | null;
  distanceToNextManeuverMeters: number | null;
  distanceToTargetMeters: number | null;
  durationSeconds: number | null;
};

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

function toKm(meters: unknown) {
  return typeof meters === 'number' && Number.isFinite(meters)
    ? Number((meters / 1000).toFixed(2))
    : null;
}

export async function fetchTripSteps(tripId: number | string) {
  const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/steps`);
  if (!response.ok) {
    throw new Error(`Trip steps error: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as TripStep[]) : [];
}

export async function computeTripRoute(tripId: number | string): Promise<RouteResult> {
  const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/compute`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`Trip route error: ${response.status}`);
  }

  const data = await response.json();
  if (!data?.geometry?.coordinates) {
    return { geometry: null, summary: null };
  }

  return {
    geometry: { coordinates: data.geometry.coordinates },
    summary: {
      distanceKm: data.distance ?? null,
      durationSeconds: data.duration ?? null
    }
  };
}

export async function computeOsrmDistance(from: Coordinates, to: Coordinates) {
  const url = `${OSRM_BASE_URL}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=false`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM distance error: ${response.status}`);
  }

  const data = await response.json();
  return toKm(data?.routes?.[0]?.distance);
}

function buildInstruction(step: any) {
  if (!step?.maneuver) return null;

  const modifierMap: Record<string, string> = {
    left: 'a gauche',
    right: 'a droite',
    slight_left: 'legerement a gauche',
    slight_right: 'legerement a droite',
    sharp_left: 'franchement a gauche',
    sharp_right: 'franchement a droite',
    straight: 'tout droit',
    uturn: 'demi-tour'
  };
  const rawModifier = typeof step.maneuver.modifier === 'string' ? step.maneuver.modifier : '';
  const modifier = rawModifier ? ` ${modifierMap[rawModifier] ?? rawModifier}` : '';
  const name = step.name ? ` sur ${step.name}` : '';
  switch (step.maneuver.type) {
    case 'turn':
      return `Tournez${modifier}${name}`.trim();
    case 'merge':
      return `Rejoignez${name}`.trim();
    case 'depart':
      return `Partez${modifier}${name}`.trim();
    case 'arrive':
      return 'Vous etes arrive';
    case 'roundabout':
      return `Prenez le rond-point${name}`.trim();
    case 'new name':
      return `Continuez${name}`.trim();
    case 'on ramp':
      return `Prenez la bretelle${name}`.trim();
    case 'off ramp':
      return `Sortez${name}`.trim();
    case 'fork':
      return `A l'embranchement${modifier}${name}`.trim();
    case 'end of road':
      return `Au bout de la route${modifier}${name}`.trim();
    case 'use lane':
      return `Utilisez la voie${modifier}${name}`.trim();
    case 'continue':
      return `Continuez${modifier}${name}`.trim();
    default:
      return `Continuez${name}`.trim();
  }
}

export async function computeGuidance(from: Coordinates, to: Coordinates): Promise<GuidanceResult> {
  const url = `${OSRM_BASE_URL}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=false&steps=true&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM guidance error: ${response.status}`);
  }

  const data = await response.json();
  const route = data?.routes?.[0];
  const leg = route?.legs?.[0];
  const steps = Array.isArray(leg?.steps) ? leg.steps : [];
  const stepIndex = steps.findIndex((candidate) => candidate?.maneuver?.type && candidate.maneuver.type !== 'depart');
  const resolvedIndex = stepIndex >= 0 ? stepIndex : (steps.length > 0 ? 0 : -1);
  const step = resolvedIndex >= 0 ? steps[resolvedIndex] : null;
  const distanceToNextManeuverMeters = resolvedIndex <= 0
    ? (typeof steps?.[0]?.distance === 'number' ? steps[0].distance : null)
    : steps
      .slice(0, resolvedIndex)
      .reduce((total: number, item: any) => (
        typeof item?.distance === 'number' ? total + item.distance : total
      ), 0);

  return {
    instruction: buildInstruction(step),
    distanceToNextManeuverMeters,
    distanceToTargetMeters: typeof route?.distance === 'number' ? route.distance : null,
    durationSeconds: typeof route?.duration === 'number' ? route.duration : null
  };
}

export async function computeDistanceToStart(currentLocation: Coordinates | null, steps: TripStep[]) {
  if (!currentLocation || steps.length === 0) {
    return null;
  }

  const start = steps[0];
  const to = {
    latitude: Number(start?.step_latitude),
    longitude: Number(start?.step_longitude)
  };

  if (!Number.isFinite(to.latitude) || !Number.isFinite(to.longitude)) {
    return null;
  }

  return computeOsrmDistance(currentLocation, to);
}

export async function reverseGeocodeStreetName(location: Coordinates) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.latitude}&lon=${location.longitude}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'C15Tour/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Reverse geocode error: ${response.status}`);
  }

  const data = await response.json();
  const address = data?.address ?? {};
  const street =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.path ||
    address.neighbourhood ||
    address.suburb ||
    address.city ||
    address.town ||
    address.village;

  return typeof street === 'string' && street.trim() ? street : null;
}

export default {
  fetchTripSteps,
  computeTripRoute,
  computeOsrmDistance,
  computeGuidance,
  computeDistanceToStart,
  reverseGeocodeStreetName
};