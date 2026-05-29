import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FunFacts from "../FunFacts";
import { matches, scorigami } from "@/lib/data";

describe("FunFacts", () => {
  it("renders all the major sections without crashing", () => {
    render(<FunFacts matches={matches} scorigami={scorigami} />);

    // Section headings come through as i18n keys via our mock
    expect(screen.getByText("funFacts.trueScorigamisTitle")).toBeInTheDocument();
    expect(screen.getByText("funFacts.mostCommonTitle")).toBeInTheDocument();
    expect(screen.getByText("funFacts.highestScoringTitle")).toBeInTheDocument();
    expect(screen.getByText("funFacts.biggestBlowoutsTitle")).toBeInTheDocument();
    expect(screen.getByText("funFacts.scorigamiLeadersTitle")).toBeInTheDocument();
    expect(screen.getByText("funFacts.allTimeStatsTitle")).toBeInTheDocument();
    expect(screen.getByText("funFacts.stageBreakdownTitle")).toBeInTheDocument();
    expect(screen.getByText("funFacts.tournamentTrendsTitle")).toBeInTheDocument();
    expect(screen.getByText("funFacts.frontierTitle")).toBeInTheDocument();
  });

  it("computes a non-zero total goals stat from real data", () => {
    render(<FunFacts matches={matches} scorigami={scorigami} />);
    // totalGoals is rendered via toLocaleString — should not be "0"
    const totalGoalsLabel = screen.getByText("funFacts.totalGoals");
    const card = totalGoalsLabel.parentElement;
    const numericNode = card?.querySelector(".text-lg");
    expect(numericNode?.textContent).not.toBe("0");
  });
});
