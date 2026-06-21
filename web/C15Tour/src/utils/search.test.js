import { describe, it, expect } from "vitest";
import { normalize, getLocationLabel, scoreSuggestion } from "./search";

describe("normalize", () => {
  it("lowercases text", () => {
    expect(normalize("PARIS")).toBe("paris");
  });

  it("removes accents", () => {
    expect(normalize("Étoile")).toBe("etoile");
    expect(normalize("François")).toBe("francois");
    expect(normalize("crème brûlée")).toBe("creme brulee");
  });

  it("trims whitespace", () => {
    expect(normalize("  nantes  ")).toBe("nantes");
  });

  it("handles empty input", () => {
    expect(normalize("")).toBe("");
    expect(normalize()).toBe("");
  });

  it("handles combined transformations", () => {
    expect(normalize("  CHÂTEAUBRIANT  ")).toBe("chateaubriant");
  });
});

describe("getLocationLabel", () => {
  it("returns city when available", () => {
    expect(getLocationLabel({ city: "Nantes", town: "Other" })).toBe("Nantes");
  });

  it("falls back to town", () => {
    expect(getLocationLabel({ town: "Clisson" })).toBe("Clisson");
  });

  it("falls back to village", () => {
    expect(getLocationLabel({ village: "Tiffauges" })).toBe("Tiffauges");
  });

  it("falls back to municipality", () => {
    expect(getLocationLabel({ municipality: "Commune" })).toBe("Commune");
  });

  it("falls back to hamlet", () => {
    expect(getLocationLabel({ hamlet: "Le Bourg" })).toBe("Le Bourg");
  });

  it("falls back to county", () => {
    expect(getLocationLabel({ county: "Loire-Atlantique" })).toBe("Loire-Atlantique");
  });

  it("returns empty string when nothing matches", () => {
    expect(getLocationLabel({})).toBe("");
    expect(getLocationLabel()).toBe("");
  });

  it("respects priority order", () => {
    expect(getLocationLabel({
      county: "Loire-Atlantique",
      village: "Tiffauges",
      city: "Nantes"
    })).toBe("Nantes");
  });
});

describe("scoreSuggestion", () => {
  const makeSuggestion = (display_name, address = {}) => ({
    display_name,
    address
  });

  it("returns 0 for empty query", () => {
    const item = makeSuggestion("10 rue de Paris, Nantes, 44000");
    expect(scoreSuggestion(item, "")).toBe(0);
  });

  it("gives high score for exact display_name start match", () => {
    const item = makeSuggestion("10 rue de Paris, Nantes, 44000");
    const score = scoreSuggestion(item, "10 rue de paris");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it("scores road matches", () => {
    const item = makeSuggestion("10 rue de Paris, Nantes", {
      road: "rue de Paris",
      city: "Nantes"
    });
    const score = scoreSuggestion(item, "rue de paris nantes");
    expect(score).toBeGreaterThan(0);
  });

  it("scores postcode matches", () => {
    const item = makeSuggestion("Nantes, 44000", {
      city: "Nantes",
      postcode: "44000"
    });
    const score = scoreSuggestion(item, "44000 nantes");
    expect(score).toBeGreaterThanOrEqual(35);
  });

  it("scores city matches", () => {
    const item = makeSuggestion("10 rue X, Nantes", {
      city: "Nantes",
      road: "rue X"
    });
    const score = scoreSuggestion(item, "nantes");
    expect(score).toBeGreaterThan(0);
  });

  it("handles accented queries", () => {
    const item = makeSuggestion("Rue de l'Égalité, Orléans", {
      road: "Rue de l'Égalité",
      city: "Orléans"
    });
    const score = scoreSuggestion(item, "orleans");
    expect(score).toBeGreaterThan(0);
  });

  it("returns 0 for completely unrelated query", () => {
    const item = makeSuggestion("10 rue de Paris, Nantes", {
      road: "rue de Paris",
      city: "Nantes"
    });
    const score = scoreSuggestion(item, "zzzzzzz");
    expect(score).toBe(0);
  });
});
