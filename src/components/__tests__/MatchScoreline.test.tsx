import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchScoreline } from "../MatchScoreline";
import type { Match } from "@/lib/types";

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

describe("MatchScoreline", () => {
  it("renders both team names and the scoreline", () => {
    render(<MatchScoreline match={makeMatch()} />);
    expect(screen.getByText("Argentina")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.getByText(/3.+3/)).toBeInTheDocument();
  });

  it("orders by winner when orient='winner' (default)", () => {
    // 1–2 home/away, winner is away → 2–1 should display with winner first
    const m = makeMatch({ homeScore: 1, awayScore: 2, homeTeam: "Mexico", awayTeam: "Argentina" });
    const { container } = render(<MatchScoreline match={m} />);
    expect(container.textContent).toMatch(/Argentina.*2.*1.*Mexico/s);
  });

  it("preserves home/away order when orient='home'", () => {
    const m = makeMatch({ homeScore: 1, awayScore: 2, homeTeam: "Mexico", awayTeam: "Argentina" });
    const { container } = render(<MatchScoreline match={m} orient="home" />);
    expect(container.textContent).toMatch(/Mexico.*1.*2.*Argentina/s);
  });

  it("shows 'aet' suffix when match went to extra time but no shootout", () => {
    render(<MatchScoreline match={makeMatch({ extraTime: true, penaltyShootout: false })} />);
    expect(screen.getByText("aet")).toBeInTheDocument();
  });

  it("shows the penalty display when there was a shootout", () => {
    render(<MatchScoreline match={makeMatch()} />);
    // orientMatch gives the winner's penalty score first
    expect(screen.getByText(/pen/)).toBeInTheDocument();
  });

  it("renders Wikipedia and FIFA links when showLinks is true", () => {
    render(<MatchScoreline match={makeMatch()} showLinks linkVariant="labels" />);
    expect(screen.getByText("Wikipedia ↗")).toBeInTheDocument();
    expect(screen.getByText("FIFA ↗")).toBeInTheDocument();
  });

  it("uses compact icon labels when linkVariant='icons'", () => {
    render(<MatchScoreline match={makeMatch()} showLinks linkVariant="icons" />);
    expect(screen.getByText("W↗")).toBeInTheDocument();
    expect(screen.getByText("F↗")).toBeInTheDocument();
  });

  it("shows the date column when showDate is true", () => {
    render(<MatchScoreline match={makeMatch()} showDate />);
    expect(screen.getByText("2022-12-18")).toBeInTheDocument();
  });

  it("renders venue (stage + city) when showVenue is true", () => {
    render(<MatchScoreline match={makeMatch()} showVenue stageLabel="Final" />);
    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.getByText(/Lusail.*Qatar/)).toBeInTheDocument();
  });
});
