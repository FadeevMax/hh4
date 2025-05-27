import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }
    const accessToken = authHeader.substring(7);

    // First check if user is a job seeker
    const meResponse = await fetch('https://api.hh.ru/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'HH-User-Agent': 'hh-auto-apply/1.0 (maxfade@gmail.com)'
      }
    });

    if (!meResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get user info' },
        { status: meResponse.status }
      );
    }

    const userData = await meResponse.json();

    // Check if user has resumes
    const resumesResponse = await fetch('https://api.hh.ru/resumes/mine', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'HH-User-Agent': 'hh-auto-apply/1.0 (maxfade@gmail.com)'
      }
    });

    if (!resumesResponse.ok) {
      // If we get 403, it means user is not a job seeker
      if (resumesResponse.status === 403) {
        return NextResponse.json({
          items: [],
          message: 'User is not registered as a job seeker'
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch resumes' },
        { status: resumesResponse.status }
      );
    }

    const resumesData = await resumesResponse.json();

    // Return the resumes
    return NextResponse.json({
      items: resumesData.items || [],
      found: resumesData.found || 0
    });

  } catch (error) {
    console.error('Error in /api/user/resumes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 