import { NextRequest, NextResponse } from 'next/server';
import TokenModel from '@/lib/models/token';

export async function GET(request: NextRequest) {
  // Add a delay to prevent API overloading
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    // Get user ID from the URL params or from the Authorization header
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // If not provided, try to get access token from Authorization header
    let accessToken = null;
    if (!userId) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'User ID or access token is required' },
          { status: 400 }
        );
      }
      accessToken = authHeader.substring(7);
    }

    // If userId is provided, get token from DB
    if (userId) {
      const token = await TokenModel.getLatestToken(userId);
      if (!token) {
        return NextResponse.json(
          { 
            error: 'No valid token found. Please re-authenticate with HH.ru',
            requireReauth: true
          },
          { status: 401 }
        );
      }
      accessToken = token.accessToken;
    }

    // Call HH.ru API to get user's resumes
    const response = await fetch('https://api.hh.ru/resumes/mine', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'HH-User-Agent': 'hh-auto-apply/1.0 (maxfade@gmail.com)'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Unauthorized. Token expired.',
            requireReauth: true 
          },
          { status: 401 }
        );
      }
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Error fetching resumes: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      items: data.items || [],
      found: data.found || 0
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error processing resumes' },
      { status: 500 }
    );
  }
} 