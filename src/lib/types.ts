export interface Match {
  date: string;
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
