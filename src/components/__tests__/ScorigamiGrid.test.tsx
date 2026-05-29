import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScorigamiGrid from "../ScorigamiGrid";
import type { ScorigamiEntry, Match } from "@/lib/types";

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    date: "2022-12-18",
    tournament: "2022 FIFA Men's World Cup",
    stage: "final",
    homeTeam: "Argentina",
    awayTeam: "France",
    homeCode: "ARG",
    awayCode: "FRA",
    homeScore: 3,
    awayScore: 3,
    extraTime: true,
    penaltyShootout: true,
    penaltyScore: "4-2",
    stadium: "Lusail",
    city: "Lusail",
    country: "Qatar",
    ...overrides,
  };
}

function makeGrid(): Map<string, ScorigamiEntry> {
  const grid = new Map<string, ScorigamiEntry>();
  // A unique (1-occurrence) entry and a common one
  grid.set("0-1", {
    lowScore: 0, highScore: 1, count: 50,
    firstMatch: makeMatch({ homeScore: 1, awayScore: 0 }),
    lastMatch: makeMatch({ homeScore: 1, awayScore: 0 }),
  });
  grid.set("3-3", {
    lowScore: 3, highScore: 3, count: 1,
    firstMatch: makeMatch(),
    lastMatch: makeMatch(),
  });
  return grid;
}

describe("ScorigamiGrid", () => {
  // Cell aria-labels come back from the mocked t() as
  // "grid.count <low> <high> <count>" or "grid.neverHappened <low> <high>".
  // We use those to disambiguate from the row/column header labels (0–10).
  const unique33 = /grid\.count 3 3 1/;
  const common01 = /grid\.count 0 1 50/;

  it("renders cells with counts for occurred scores", () => {
    render(<ScorigamiGrid grid={makeGrid()} maxScore={10} onCellClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: common01 })).toHaveTextContent("50");
    expect(screen.getByRole("button", { name: unique33 })).toHaveTextContent("1");
  });

  it("invokes onCellClick with the entry and coordinates when a cell is clicked", () => {
    const handler = vi.fn();
    render(<ScorigamiGrid grid={makeGrid()} maxScore={10} onCellClick={handler} />);
    fireEvent.click(screen.getByRole("button", { name: unique33 }));
    expect(handler).toHaveBeenCalledTimes(1);
    const [, low, high] = handler.mock.calls[0];
    expect(low).toBe(3);
    expect(high).toBe(3);
  });

  it("renders the rarity legend", () => {
    render(<ScorigamiGrid grid={makeGrid()} maxScore={10} onCellClick={vi.fn()} />);
    // Legend keys come through as i18n key strings via our mock
    expect(screen.getByText("grid.unique")).toBeInTheDocument();
    expect(screen.getByText("grid.never")).toBeInTheDocument();
  });

  it("exposes cells as focusable buttons with aria-labels (keyboard a11y)", () => {
    render(<ScorigamiGrid grid={makeGrid()} maxScore={10} onCellClick={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
    expect(buttons[0]).toHaveAttribute("aria-label");
  });

  it("activates onCellClick when Enter is pressed on a focused cell", () => {
    const handler = vi.fn();
    render(<ScorigamiGrid grid={makeGrid()} maxScore={10} onCellClick={handler} />);
    fireEvent.keyDown(screen.getByRole("button", { name: unique33 }), { key: "Enter" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("activates onCellClick when Space is pressed (and prevents default scroll)", () => {
    const handler = vi.fn();
    render(<ScorigamiGrid grid={makeGrid()} maxScore={10} onCellClick={handler} />);
    fireEvent.keyDown(screen.getByRole("button", { name: unique33 }), { key: " " });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
