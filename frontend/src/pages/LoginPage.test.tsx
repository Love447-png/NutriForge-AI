import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { LocalAuthProvider } from "../hooks/useLocalAuth";
import { LoginPage } from "./LoginPage";


describe("LoginPage", () => {
  it("renders sign in form", () => {
    render(
      <LocalAuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </LocalAuthProvider>,
    );

    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });
});
