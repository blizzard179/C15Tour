import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeButton from "./HomeButton";

describe("HomeButton", () => {
  it("renders a button with a home image", () => {
    render(<HomeButton />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    const img = screen.getByAltText("Home");
    expect(img).toBeInTheDocument();
  });

  it("navigates to / on click", async () => {
    const user = userEvent.setup();
    delete window.location;
    window.location = { href: "/map" };

    render(<HomeButton />);
    await user.click(screen.getByRole("button"));

    expect(window.location.href).toBe("/");
  });
});
