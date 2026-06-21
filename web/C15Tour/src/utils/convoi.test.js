import { describe, it, expect } from "vitest";
import {
  mergeGeneralSettings,
  getAdjustedRouteDurationMinutes,
  formatTime,
  parseTime,
  stepsText,
  DEFAULT_GENERAL_SETTINGS,
  SEGMENT_COLOR_PALETTE
} from "./convoi";

describe("mergeGeneralSettings", () => {
  it("returns defaults when input is null", () => {
    const result = mergeGeneralSettings(null);
    expect(result.segmentsCount).toBe(1);
    expect(result.routeType).toEqual(DEFAULT_GENERAL_SETTINGS.routeType);
    expect(result.speed).toEqual(DEFAULT_GENERAL_SETTINGS.speed);
  });

  it("returns defaults when input is undefined", () => {
    const result = mergeGeneralSettings(undefined);
    expect(result.segmentsCount).toBe(1);
  });

  it("parses segmentsCount from string", () => {
    const result = mergeGeneralSettings({ segmentsCount: "3" });
    expect(result.segmentsCount).toBe(3);
  });

  it("clamps segmentsCount to minimum 1", () => {
    expect(mergeGeneralSettings({ segmentsCount: 0 }).segmentsCount).toBe(1);
    expect(mergeGeneralSettings({ segmentsCount: -5 }).segmentsCount).toBe(1);
  });

  it("merges partial routeType with defaults", () => {
    const result = mergeGeneralSettings({ routeType: { avoidMotorway: false } });
    expect(result.routeType.avoidMotorway).toBe(false);
    expect(result.routeType.avoidFastRoad).toBe(true);
    expect(result.routeType.avoidTrack).toBe(true);
  });

  it("merges partial speed with defaults", () => {
    const result = mergeGeneralSettings({ speed: { generalSpeedKmH: 80 } });
    expect(result.speed.generalSpeedKmH).toBe(80);
    expect(result.speed.autoReductionEnabled).toBe(true);
    expect(result.speed.reductionPercent).toBe(20);
  });
});

describe("getAdjustedRouteDurationMinutes", () => {
  const defaultSettings = mergeGeneralSettings(DEFAULT_GENERAL_SETTINGS);

  it("calculates duration from distance and speed", () => {
    const result = getAdjustedRouteDurationMinutes(defaultSettings, 50, null);
    // 50km / 50km/h = 60min, +20% reduction = 72min
    expect(result).toBe(72);
  });

  it("returns null when no valid inputs", () => {
    const result = getAdjustedRouteDurationMinutes(defaultSettings, null, null);
    expect(result).toBeNull();
  });

  it("falls back to routeDurationMinutes when distance is not available", () => {
    const result = getAdjustedRouteDurationMinutes(defaultSettings, null, 100);
    // 100min + 20% = 120min
    expect(result).toBe(120);
  });

  it("does not apply reduction when disabled", () => {
    const settings = mergeGeneralSettings({
      speed: { generalSpeedKmH: 50, autoReductionEnabled: false }
    });
    const result = getAdjustedRouteDurationMinutes(settings, 50, null);
    // 50km / 50km/h = 60min, no reduction
    expect(result).toBe(60);
  });

  it("applies custom reduction percent", () => {
    const settings = mergeGeneralSettings({
      speed: { generalSpeedKmH: 100, autoReductionEnabled: true, reductionPercent: 50 }
    });
    const result = getAdjustedRouteDurationMinutes(settings, 100, null);
    // 100km / 100km/h = 60min, +50% = 90min
    expect(result).toBe(90);
  });

  it("returns null for negative routeDurationMinutes", () => {
    const result = getAdjustedRouteDurationMinutes(defaultSettings, null, -10);
    expect(result).toBeNull();
  });

  it("handles zero distance", () => {
    const result = getAdjustedRouteDurationMinutes(defaultSettings, 0, null);
    expect(result).toBe(0);
  });
});

describe("formatTime", () => {
  it("formats zero minutes as 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formats minutes correctly", () => {
    expect(formatTime(90)).toBe("01:30");
  });

  it("wraps around 24 hours", () => {
    expect(formatTime(24 * 60 + 30)).toBe("00:30");
  });

  it("pads single digits", () => {
    expect(formatTime(65)).toBe("01:05");
  });

  it("handles large values", () => {
    expect(formatTime(23 * 60 + 59)).toBe("23:59");
  });
});

describe("parseTime", () => {
  it("returns null for null input", () => {
    expect(parseTime(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseTime("")).toBeNull();
  });

  it("returns null for --:--", () => {
    expect(parseTime("--:--")).toBeNull();
  });

  it("parses 00:00", () => {
    expect(parseTime("00:00")).toBe(0);
  });

  it("parses time correctly", () => {
    expect(parseTime("01:30")).toBe(90);
  });

  it("parses 23:59", () => {
    expect(parseTime("23:59")).toBe(1439);
  });
});

describe("stepsText", () => {
  it("returns correct text for 0 waypoints", () => {
    expect(stepsText(0)).toBe("Aucune etape ajoutee");
  });

  it("returns correct text for 1 waypoint", () => {
    expect(stepsText(1)).toBe("1 etape");
  });

  it("returns correct text for multiple waypoints", () => {
    expect(stepsText(5)).toBe("5 etapes");
  });
});

describe("SEGMENT_COLOR_PALETTE", () => {
  it("has 6 colors", () => {
    expect(SEGMENT_COLOR_PALETTE).toHaveLength(6);
  });

  it("contains valid hex colors", () => {
    for (const color of SEGMENT_COLOR_PALETTE) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
