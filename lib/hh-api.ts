import { HHVacancy } from '../types';

const HH_API_BASE_URL = 'https://api.hh.ru';

export class HHApi {
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'HH-User-Agent': 'HH-Auto-Apply/1.0',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${HH_API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HH.ru API error: ${response.statusText}`);
    }

    return response.json();
  }

  async searchVacancies(params: {
    text?: string;
    area?: string;
    salary?: number;
    schedule?: string;
    experience?: string;
    employment?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ items: HHVacancy[]; pages: number; found: number }> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return this.request(`/vacancies?${queryParams.toString()}`);
  }

  async getVacancy(id: string): Promise<HHVacancy> {
    return this.request(`/vacancies/${id}`);
  }

  async applyToVacancy(vacancyId: string, message?: string): Promise<void> {
    return this.request(`/vacancies/${vacancyId}/response`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getApplicationStatus(vacancyId: string): Promise<{
    status: 'pending' | 'applied' | 'rejected' | 'accepted';
  }> {
    return this.request(`/vacancies/${vacancyId}/response/status`);
  }
} 