import { api } from "./api.js";

export interface Resume {
  id: string;
  rawText: string;
  updatedAt: string;
}

export const resumeService = {
  async get(): Promise<Resume | null> {
    try {
      const res = await api.get<{ resume: Resume }>("/resume");
      return res.data.resume;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  async uploadFile(file: File): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    await api.post("/resume/upload", formData);
  },

  async uploadText(text: string): Promise<void> {
    await api.post("/resume/upload", { text });
  },

  async remove(): Promise<void> {
    await api.delete("/resume");
  },
};
