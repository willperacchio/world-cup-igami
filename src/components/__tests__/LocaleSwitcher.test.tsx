import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LocaleSwitcher from "../LocaleSwitcher";

describe("LocaleSwitcher", () => {
  it("renders the current locale name", () => {
    render(<LocaleSwitcher />);
    // useLocale is mocked to return "en" → English
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("opens a menu of all locales when clicked", () => {
    render(<LocaleSwitcher />);
    // English appears once (as the toggle button label)
    expect(screen.getAllByText("English")).toHaveLength(1);
    fireEvent.click(screen.getByText("English"));
    // After open, multiple locales should be visible (Español, Français, etc.)
    expect(screen.getByText("Español")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.getByText("Deutsch")).toBeInTheDocument();
  });
});
