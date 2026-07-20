import { api } from "./api.js";

export interface DashboardMetrics {
  total: number;
  statusCounts: Record<string, number>;
  responseRate: number;
  interviewConversionRate: number;
  avgDaysToResponse: number | null;
  topCompanies: { company: string; count: number }[];
  timeline: { week: string; count: number }[];
}

export const metricsService = {
  async getMetrics(): Promise<DashboardMetrics> {
    const response = await api.get<{ metrics: DashboardMetrics }>("/dashboard/metrics");
    return response.data.metrics;
  },
};
