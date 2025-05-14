import { NextRequest, NextResponse } from 'next/server';
import UserModel from '@/lib/models/user';
import TokenModel from '@/lib/models/token';

export async function POST(request: NextRequest) {
  try {
    console.log('Token exchange request started');
    const { code } = await request.json();

    if (!code) {
      console.log('No authorization code provided');
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Set up parameters for token exchange
    const clientId = process.env.HH_API_KEY || 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T';
    const clientSecret = process.env.HH_API_SECRET || 'JFVAEI4Q1HRILG8Q6IDL7SAJK1PCS6FHL9I6B9K0CI4SVDIRKGVE1TMI9N658TDQ';
    // Explicitly set the full, exact redirect URI
    const redirectUri = 'http://localhost:3000/auth/callback';
    
    console.log('Using redirect URI:', redirectUri);
    console.log('Authorization code:', code);

    // Create URL-encoded form body for token request - using explicit string to ensure proper encoding
    const formBody = 
      `grant_type=authorization_code&` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `client_secret=${encodeURIComponent(clientSecret)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${encodeURIComponent(code)}`;
    
    console.log('Token request string:', formBody);

    // Make the token exchange request to HH.ru
    const tokenResponse = await fetch('https://hh.ru/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });

    // Log the raw response for debugging
    console.log('Token response status:', tokenResponse.status);
    const responseText = await tokenResponse.text();
    console.log('Token response body:', responseText);
    
    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse token response as JSON:', e);
      return NextResponse.json(
        { error: 'Invalid response from HH.ru' },
        { status: 500 }
      );
    }

    if (!tokenResponse.ok) {
      console.error('Error exchanging code for token:', tokenData);
      return NextResponse.json(
        { error: tokenData.error || 'Failed to exchange code for token', description: tokenData.error_description },
        { status: tokenResponse.status }
      );
    }

    // Get user info from HH.ru API
    const userResponse = await fetch('https://api.hh.ru/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Error fetching user data');
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();

    // Find or create user
    let user = await UserModel.findByHhId(userData.id);

    if (!user) {
      user = await UserModel.createUser({
        username: userData.email || `hh_${userData.id}`,
        hhId: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
      });
    } else {
      // Update user data
      await UserModel.updateUser(user.id, {
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
      });
      
      // Update last login
      await UserModel.updateLastLogin(user.id);
    }

    // Save tokens
    await TokenModel.saveToken(
      user.id, 
      tokenData.access_token, 
      tokenData.refresh_token, 
      tokenData.expires_in
    );

    // Calculate the exact expiration timestamp for the client
    const expirationTimestamp = Date.now() + (tokenData.expires_in * 1000);

    // Return the tokens and user data to the client
    return NextResponse.json({
      ...tokenData,
      expirationTimestamp,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name
      }
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error during token exchange' },
      { status: 500 }
    );
  }
} 