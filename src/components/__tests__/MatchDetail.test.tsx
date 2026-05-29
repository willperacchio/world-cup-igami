import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchDetail from "../MatchDetail";
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

describe("MatchDetail", () => {
  it("renders the 'no scorigami' explainer when entry is null", () => {
    render(
      <MatchDetail
        entry={null}
        allMatches={[]}
        lowScore={10}
        highScore={10}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("detail.noScorigamiTitle")).toBeInTheDocument();
  });

  it("renders the entry and matching games when entry exists", () => {
    const m = makeMatch();
    const entry: ScorigamiEntry = {
      lowScore: 3,
      highScore: 3,
      count: 1,
      firstMatch: m,
      lastMatch: m,
    };
    render(
      <MatchDetail
        entry={entry}
        allMatches={[m]}
        lowScore={3}
        highScore={3}
        onClose={vi.fn()}
      />,
    );
    // "3–3" appears in both the panel heading and the MatchScoreline row
    expect(screen.getAllByText(/3.+3/).length).toBeGreaterThanOrEqual(2);
    // Team names appear only in the MatchScoreline
    expect(screen.getByText("Argentina")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
  });

  it("fires onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <MatchDetail
        entry={null}
        allMatches={[]}
        lowScore={10}
        highScore={10}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("detail.close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
