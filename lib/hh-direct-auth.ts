import { User } from '../types';

const HH_API_BASE_URL = 'https://api.hh.ru';

export class HHDirectAuth {
  private static credentials = {
    username: process.env.HH_USERNAME || '+7 985 695-64-50',
    password: process.env.HH_PASSWORD || 'Maxim244'
  };

  static setCredentials(username: string, password: string) {
    this.credentials = { username, password };
  }

  static async login(): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(`${HH_API_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: this.credentials.username,
        password: this.credentials.password,
        client_id: process.env.HH_CLIENT_ID || '',
        client_secret: process.env.HH_CLIENT_SECRET || '',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to login to HH.ru');
    }

    return response.json();
  }

  static async getUserInfo(access_token: string): Promise<User> {
    const response = await fetch(`${HH_API_BASE_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    const data = await response.json();
    
    return {
      id: data.id,
      email: data.email,
      name: data.first_name + ' ' + data.last_name,
      settings: {
        autoApply: false,
        preferredLocations: [],
        preferredSalary: {},
        preferredSchedule: [],
        preferredExperience: [],
        preferredEmployment: [],
        keywords: [],
        excludeKeywords: [],
      },
    };
  }

  static async refreshToken(refresh_token: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(`${HH_API_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: process.env.HH_CLIENT_ID || '',
        client_secret: process.env.HH_CLIENT_SECRET || '',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return response.json();
  }
} 