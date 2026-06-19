import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RoadsTour from "./RoadsTour";

describe("RoadsTour", () => {
  it("renders the badge with correct aria-label", () => {
    render(<RoadsTour />);
    expect(screen.getByLabelText("Roads Tour by C15 Tour")).toBeInTheDocument();
  });

  it("renders the logo image", () => {
    render(<RoadsTour />);
    const img = screen.getByAltText("ROADS TOUR By C15 Tour");
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe("IMG");
  });
});
