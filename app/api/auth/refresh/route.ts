import { NextRequest, NextResponse } from 'next/server';
import TokenModel from '@/lib/models/token';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get the user's token from storage
    const token = await TokenModel.findByUserId(userId);
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token found for this user' },
        { status: 404 }
      );
    }

    // Set up parameters for token refresh
    const clientId = process.env.HH_API_KEY || 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T';
    const clientSecret = process.env.HH_API_SECRET || 'JFVAEI4Q1HRILG8Q6IDL7SAJK1PCS6FHL9I6B9K0CI4SVDIRKGVE1TMI9N658TDQ';
    
    // Create URL-encoded form body for refresh request
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refreshToken,
    });
    
    console.log('Attempting to refresh token for user:', userId);

    // Make the token refresh request to HH.ru
    const refreshResponse = await fetch('https://api.hh.ru/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const responseText = await refreshResponse.text();
    let refreshData;

    try {
      refreshData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse refresh response as JSON:', e);
      return NextResponse.json(
        { error: 'Invalid response from HH.ru' },
        { status: 500 }
      );
    }

    if (!refreshResponse.ok) {
      console.error('Error refreshing token:', refreshData);
      
      // If refresh token is expired or invalid, we need to re-authenticate
      if (refreshResponse.status === 400 && 
          (refreshData.error === 'invalid_grant' || refreshData.error === 'invalid_request')) {
        // Delete the token since it's no longer valid
        await TokenModel.deleteToken(userId);
        
        return NextResponse.json(
          { 
            error: 'Refresh token expired', 
            description: 'You need to re-authenticate with HH.ru',
            requireReauth: true
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: refreshData.error || 'Failed to refresh token', description: refreshData.error_description },
        { status: refreshResponse.status }
      );
    }

    // Save the new tokens
    await TokenModel.saveToken(
      userId, 
      refreshData.access_token, 
      refreshData.refresh_token, 
      refreshData.expires_in
    );

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresIn: refreshData.expires_in
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error during token refresh' },
      { status: 500 }
    );
  }
} 