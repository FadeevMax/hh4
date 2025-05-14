import { User } from '../types';

const HH_OAUTH_URL = 'https://hh.ru/oauth';
const CLIENT_ID = process.env.HH_CLIENT_ID;
const CLIENT_SECRET = process.env.HH_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/callback';

export class HHAuth {
  static getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID!,
      redirect_uri: REDIRECT_URI,
    });

    return `${HH_OAUTH_URL}/authorize?${params.toString()}`;
  }

  static async getAccessToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      code,
      redirect_uri: REDIRECT_URI,
    });

    const response = await fetch(`${HH_OAUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    return response.json();
  }

  static async refreshToken(refresh_token: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token,
    });

    const response = await fetch(`${HH_OAUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return response.json();
  }

  static async getUserInfo(access_token: string): Promise<User> {
    const response = await fetch('https://api.hh.ru/me', {
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
} 