import { api } from "./api.js";

export interface MatchScore {
  score: number | null;
  hasResume: boolean;
  hasJobDescription: boolean;
}

export const matchingService = {
  async getMatchScore(applicationId: string): Promise<MatchScore> {
    const res = await api.get<MatchScore>(`/applications/${applicationId}/match-score`);
    return res.data;
  },
};
