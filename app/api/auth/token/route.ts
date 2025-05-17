import { NextRequest, NextResponse } from 'next/server';
import UserModel from '@/lib/models/user';
import TokenModel from '@/lib/models/token';

export async function POST(request: NextRequest) {
  try {
    // 1. Получение и валидация кода
    const { code } = await request.json();
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // 2. Параметры для HH
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T',
      client_secret: 'JFVAEI4Q1HRILG8Q6IDL7SAJK1PCS6FHL9I6B9K0CI4SVDIRKGVE1TMI9N658TDQ',
      redirect_uri: 'https://hh-7c9gp334w-maxs-projects-7786cae4.vercel.app/auth/callback',
      code: code
    });

    // 3. Запрос токенов
    const tokenResponse = await fetch('https://hh.ru/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    // 4. Обработка ответа
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('HH Token Error:', tokenData);
      return NextResponse.json(
        { error: tokenData.error_description || 'HH API Error' },
        { status: tokenResponse.status }
      );
    }

    // 5. Получение данных пользователя
    const userResponse = await fetch('https://api.hh.ru/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }
    const userData = await userResponse.json();

    // 6. Сохранение данных
    let user = await UserModel.findByHhId(userData.id);
    if (!user) {
      user = await UserModel.createUser({
        username: userData.email || `hh_${userData.id}`,
        hhId: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
      });
    }

    await TokenModel.saveToken(
      user.id,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );

    // 7. Ответ клиенту
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
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
