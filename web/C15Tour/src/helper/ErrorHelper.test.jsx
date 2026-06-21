import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

function renderWithRouterError(errorElement, errorToThrow) {
  const ThrowingComponent = () => {
    throw errorToThrow;
  };

  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <ThrowingComponent />,
        errorElement
      }
    ],
    { initialEntries: ["/"] }
  );

  return render(<RouterProvider router={router} />);
}

describe("ErrorHelper", () => {
  let ErrorComponent;

  beforeAll(async () => {
    const mod = await import("./ErrorHelper");
    ErrorComponent = mod.default;
  });

  it("renders an error message", () => {
    renderWithRouterError(<ErrorComponent />, new Error("Test failure"));
    expect(screen.getByText(/erreur/i)).toBeInTheDocument();
  });

  it("renders a string error", () => {
    renderWithRouterError(<ErrorComponent />, "Something broke");
    expect(screen.getByText(/Something broke/)).toBeInTheDocument();
  });

  it("renders fallback for unknown error types", () => {
    renderWithRouterError(<ErrorComponent />, 42);
    expect(screen.getByText(/Une erreur inattendue/)).toBeInTheDocument();
  });
});
