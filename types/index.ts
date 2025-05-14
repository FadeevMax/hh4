// HH.ru API Types
export interface HHVacancy {
  id: string;
  name: string;
  area: {
    name: string;
  };
  salary?: {
    from?: number;
    to?: number;
    currency?: string;
  };
  employer: {
    name: string;
    logo_url?: string;
  };
  published_at: string;
  created_at: string;
  archived: boolean;
  url: string;
  alternate_url: string;
  schedule: {
    name: string;
  };
  experience: {
    name: string;
  };
  employment: {
    name: string;
  };
}

// Application Types
export interface JobApplication {
  id: string;
  vacancyId: string;
  userId: string;
  status: 'pending' | 'applied' | 'rejected' | 'accepted';
  appliedAt: Date;
  responseReceivedAt?: Date;
  notes?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  hhApiKey?: string;
  hhApiSecret?: string;
  settings: UserSettings;
}

export interface UserSettings {
  autoApply: boolean;
  preferredLocations: string[];
  preferredSalary: {
    from?: number;
    to?: number;
  };
  preferredSchedule: string[];
  preferredExperience: string[];
  preferredEmployment: string[];
  keywords: string[];
  excludeKeywords: string[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
} 