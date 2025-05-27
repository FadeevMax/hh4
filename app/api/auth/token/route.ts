import { NextRequest, NextResponse } from 'next/server';
import UserModel from '@/lib/models/user';
import TokenModel from '@/lib/models/token';

export async function POST(request: NextRequest) {
  try {
    // 1. Получение и валидация кода
    const { code } = await request.json();
    if (!code) {
      console.error('Token exchange: No code provided');
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    console.log('Token exchange: Starting with code:', code);

    // 2. Параметры для HH
    const redirectUri = process.env.NEXT_PUBLIC_HH_REDIRECT_URI;
    if (!redirectUri) {
      console.error('Token exchange: Missing NEXT_PUBLIC_HH_REDIRECT_URI');
      return NextResponse.json(
        { error: 'Server configuration error: Missing redirect URI' },
        { status: 500 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_HH_CLIENT_ID;
    const clientSecret = process.env.HH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Token exchange: Missing client credentials');
      return NextResponse.json(
        { error: 'Server configuration error: Missing client credentials' },
        { status: 500 }
      );
    }

    console.log('Token exchange: Using redirect URI:', redirectUri);

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code
    });

    console.log('Token exchange: Request params:', {
      grant_type: 'authorization_code',
      client_id: '***',
      redirect_uri: redirectUri,
      code: code
    });

    // 3. Запрос токенов
    console.log('Token exchange: Sending request to HH.ru');
    const tokenResponse = await fetch('https://hh.ru/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    // 4. Обработка ответа
    const tokenData = await tokenResponse.json();
    console.log('Token exchange: HH.ru response status:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      console.error('Token exchange: HH.ru error:', tokenData);
      return NextResponse.json(
        { error: tokenData.error_description || 'HH API Error' },
        { status: tokenResponse.status }
      );
    }

    console.log('Token exchange: Successfully received tokens');

    // 5. Получение данных пользователя
    console.log('Token exchange: Fetching user data');
    const userResponse = await fetch('https://api.hh.ru/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    if (!userResponse.ok) {
      console.error('Token exchange: Failed to fetch user data:', await userResponse.text());
      throw new Error('Failed to fetch user data');
    }
    const userData = await userResponse.json();
    console.log('Token exchange: Successfully fetched user data');

    // 6. Сохранение данных
    let user = await UserModel.findByHhId(userData.id);
    if (!user) {
      // Check for existing user by username/email (to avoid duplicate key error)
      const usernameToCheck = userData.email || `hh_${userData.id}`;
      user = await UserModel.findByUsername(usernameToCheck);
      if (!user) {
        console.log('Token exchange: Creating new user');
        user = await UserModel.createUser({
          username: usernameToCheck,
          hhId: userData.id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email,
        });
      } else {
        console.log('Token exchange: Found user by username/email, using existing user');
      }
    }

    console.log('Token exchange: Saving tokens');
    await TokenModel.saveToken(
      user.id,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );

    // 7. Ответ клиенту
    console.log('Token exchange: Sending success response');
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expirationTimestamp: Date.now() + tokenData.expires_in * 1000,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name
      }
    });

  } catch (error) {
    console.error('Token exchange: Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
