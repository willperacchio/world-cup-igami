import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "../Footer";

describe("Footer", () => {
  it("renders without crashing", () => {
    render(<Footer />);
    expect(screen.getByText("footer.dataSource")).toBeInTheDocument();
  });

  it("credits football-data.org as the live data source", () => {
    render(<Footer />);
    expect(screen.getByText("footer.liveDataSource")).toBeInTheDocument();
    const fdLink = screen.getByText("footer.liveDataSource").closest("a");
    expect(fdLink).toHaveAttribute("href", "https://www.football-data.org");
  });

  it("links the Fjelstul historical data attribution", () => {
    render(<Footer />);
    const link = screen.getByText("footer.dataSource").closest("a");
    expect(link).toHaveAttribute("href", "https://github.com/jfjelstul/worldcup");
  });

  it("credits Jon Bois for the scorigami concept", () => {
    render(<Footer />);
    // Concept credit shares a div with an inline link; match via substring.
    expect(screen.getByText(/footer\.conceptCredit/)).toBeInTheDocument();
  });

  it("shows the FIFA trademark disclaimer", () => {
    render(<Footer />);
    expect(screen.getByText("footer.disclaimer")).toBeInTheDocument();
  });
});
