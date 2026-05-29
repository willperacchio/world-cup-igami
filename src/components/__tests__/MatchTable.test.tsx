import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchTable from "../MatchTable";
import { matches, scorigami } from "@/lib/data";

describe("MatchTable", () => {
  it("renders the first page of matches without crashing", () => {
    render(<MatchTable matches={matches} scorigami={scorigami} />);
    // Active-sort column carries a sort-arrow suffix (default: date desc),
    // so match by substring instead of exact text.
    expect(screen.getByText(/table\.date/)).toBeInTheDocument();
    expect(screen.getByText(/table\.home/)).toBeInTheDocument();
    expect(screen.getByText(/table\.away/)).toBeInTheDocument();
  });

  it("filters by search query", () => {
    render(<MatchTable matches={matches} scorigami={scorigami} />);
    const input = screen.getByPlaceholderText("table.searchPlaceholder") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Brazil" } });
    // After filtering, at least one Brazil row should be present
    const brazilCells = screen.queryAllByText("Brazil");
    expect(brazilCells.length).toBeGreaterThan(0);
  });

  it("toggles the Scorigami-only filter button", () => {
    render(<MatchTable matches={matches} scorigami={scorigami} />);
    const btn = screen.getByRole("button", { name: /Scorigami/ });
    fireEvent.click(btn);
    // After click, the showing-of count line should reflect a reduced result set
    // (we just check the component didn't crash and the button is still findable)
    expect(btn).toBeInTheDocument();
  });
});
