import { api } from "./api.js";

export type ApplicationStatus = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED";

export interface Application {
  id: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  notes: string | null;
  jobDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationDto {
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
  status?: ApplicationStatus;
  notes?: string;
  jobDescription?: string;
}

export interface UpdateApplicationDto {
  companyName?: string;
  jobTitle?: string;
  jobUrl?: string;
  status?: ApplicationStatus;
  notes?: string;
  jobDescription?: string;
}

export const applicationService = {
  async getAll(): Promise<Application[]> {
    const response = await api.get<{ applications: Application[] }>("/applications");
    return response.data.applications;
  },

  async getById(id: string): Promise<Application> {
    const response = await api.get<{ application: Application }>(`/applications/${id}`);
    return response.data.application;
  },

  async create(data: CreateApplicationDto): Promise<Application> {
    const response = await api.post<{ application: Application }>("/applications", data);
    return response.data.application;
  },

  async update(id: string, data: UpdateApplicationDto): Promise<Application> {
    const response = await api.patch<{ application: Application }>(`/applications/${id}`, data);
    return response.data.application;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/applications/${id}`);
  }
};

