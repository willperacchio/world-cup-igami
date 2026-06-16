export interface Match {
  date: string;
  /**
   * Full UTC kickoff timestamp (ISO 8601), when known — set for live 2026
   * matches from football-data.org. Lets same-day games sort by actual kickoff
   * time so late-night Americas matches (which roll past midnight UTC) still
   * order chronologically. Historical matches only have `date`.
   */
  kickoff?: string;
  tournament: string;
  stage: string;
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  homeScore: number;
  awayScore: number;
  extraTime: boolean;
  penaltyShootout: boolean;
  penaltyScore: string;
  stadium: string;
  city: string;
  country: string;
}

export interface ScorigamiEntry {
  lowScore: number;
  highScore: number;
  count: number;
  firstMatch: Match;
  lastMatch: Match;
}

export interface Summary {
  totalMatches: number;
  uniqueScores: number;
  maxScore: number;
  dateRange: {
    first: string;
    last: string;
  };
}
