import { NextRequest, NextResponse } from 'next/server';
import TokenModel from '@/lib/models/token';

export async function GET(request: NextRequest) {
  // Add a delay to prevent overloading the API with repeated requests
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    // Get user ID from the URL params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's access token - don't auto-refresh, let the client handle that
    const token = await TokenModel.getLatestToken(userId);
    if (!token) {
      console.log(`No valid token found for user ${userId}`);
      return NextResponse.json(
        { 
          error: 'No valid token found. Please re-authenticate with HH.ru',
          requireReauth: true 
        },
        { status: 401 }
      );
    }

    console.log(`Fetching applications for user ${userId}`);

    // Call the HH API to get user's applications
    const response = await fetch('https://api.hh.ru/negotiations', {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'User-Agent': 'HHAutoApply/1.0 (api@test.com)'
      }
    });

    if (!response.ok) {
      // Check specific HH.ru error responses
      if (response.status === 401) {
        console.log(`Token expired for user ${userId}`);
        return NextResponse.json(
          { 
            error: 'Unauthorized. Token expired.',
            requireReauth: true 
          },
          { status: 401 }
        );
      }
      
      const errorText = await response.text();
      console.error(`HH API error: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        { error: `HH API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Process and return the application data
    // Note: This would need to be adjusted based on the actual HH.ru API response format
    const applications = data.items || [];
    
    return NextResponse.json({
      applications: applications.map((item: any) => ({
        id: item.id,
        vacancyId: item.vacancy ? item.vacancy.id : 'unknown',
        vacancyName: item.vacancy ? item.vacancy.name : 'Unknown position',
        employerName: item.vacancy && item.vacancy.employer ? item.vacancy.employer.name : 'Unknown employer',
        status: item.state ? item.state.name : 'Unknown status',
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.updated_at || new Date().toISOString(),
        hasUpdates: item.has_updates || false,
        url: item.vacancy ? item.vacancy.alternate_url : '#'
      })),
      total: applications.length
    });

  } catch (error) {
    console.error('Error in applications API:', error);
    return NextResponse.json(
      { error: 'Internal server error processing applications' },
      { status: 500 }
    );
  }
} 