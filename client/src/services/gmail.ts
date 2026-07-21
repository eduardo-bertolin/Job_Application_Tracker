import { api } from "./api.js";

export interface GmailStatus {
  connected: boolean;
  lastSyncAt: string | null;
  connectedAt: string | null;
  pendingSuggestions: number;
}

export interface EmailSuggestion {
  id: string;
  emailSubject: string;
  emailFrom: string;
  emailDate: string;
  suggestedStatus: string;
  confidence: string;
  snippet: string | null;
  status: string;
  application: { id: string; companyName: string; jobTitle: string } | null;
}

export const gmailService = {
  async getStatus(): Promise<GmailStatus> {
    const res = await api.get<GmailStatus>("/gmail/status");
    return res.data;
  },

  async connect(): Promise<string> {
    const res = await api.get<{ authUrl: string }>("/gmail/connect");
    return res.data.authUrl;
  },

  async sync(): Promise<{ newSuggestions: number; suggestions: EmailSuggestion[] }> {
    const res = await api.post<{ newSuggestions: number; suggestions: EmailSuggestion[] }>("/gmail/sync");
    return res.data;
  },

  async getSuggestions(): Promise<EmailSuggestion[]> {
    const res = await api.get<{ suggestions: EmailSuggestion[] }>("/gmail/suggestions");
    return res.data.suggestions;
  },

  async applySuggestion(id: string): Promise<void> {
    await api.post(`/gmail/apply-suggestion/${id}`);
  },

  async dismissSuggestion(id: string): Promise<void> {
    await api.post(`/gmail/dismiss-suggestion/${id}`);
  },

  async disconnect(): Promise<void> {
    await api.delete("/gmail/disconnect");
  },
};
