import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResearchBar from "./ResearchBar";

describe("ResearchBar", () => {
  it("renders the search input with placeholder", () => {
    render(<ResearchBar value="" onChange={() => {}} onSelect={() => {}} />);
    expect(screen.getByPlaceholderText("Rechercher une adresse...")).toBeInTheDocument();
  });

  it("displays the provided value", () => {
    render(<ResearchBar value="Nantes" onChange={() => {}} onSelect={() => {}} />);
    expect(screen.getByDisplayValue("Nantes")).toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ResearchBar value="" onChange={handleChange} onSelect={() => {}} />);

    const input = screen.getByPlaceholderText("Rechercher une adresse...");
    await user.type(input, "P");

    expect(handleChange).toHaveBeenCalledWith("P");
  });

  it("has correct aria-label on input", () => {
    render(<ResearchBar value="" onChange={() => {}} onSelect={() => {}} />);
    expect(screen.getByLabelText("Rechercher une adresse")).toBeInTheDocument();
  });

  it("does not show suggestions initially", () => {
    render(<ResearchBar value="" onChange={() => {}} onSelect={() => {}} />);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
