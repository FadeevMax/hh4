import { NextRequest, NextResponse } from 'next/server';
import UserModel from '@/lib/models/user';
import TokenModel from '@/lib/models/token';

export async function POST(request: NextRequest) {
  try {
    // Получаем код из запроса
    const { code } = await request.json();

    // Жестко прописываем параметры для продакшена
    const clientId = 'MI6VLQ3KDNT1BOOLBC7VAB9F4IB1V8A73KAQ21IKI59Q618SQDD5IPA2R9GMPF9T';
    const clientSecret = 'JFVAEI4Q1HRILG8Q6IDL7SAJK1PCS6FHL9I6B9K0CI4SVDIRKGVE1TMI9N658TDQ';
    const redirectUri = 'https://hh-7c9gp334w-maxs-projects-7786cae4.vercel.app/auth/callback';

    // Формируем параметры запроса
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUri);
    params.append('code', code);

    // Отправляем запрос к HH.ru
    const tokenResponse = await fetch('https://hh.ru/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    // Обработка ответа...
    const responseText = await tokenResponse.text();
    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', e);
      return NextResponse.json(
        { error: 'Invalid response from HH.ru' },
        { status: 500 }
      );
    }

    if (!tokenResponse.ok) {
      console.error('HH.ru error:', tokenData);
      return NextResponse.json(
        { 
          error: tokenData.error || 'Token exchange failed',
          description: tokenData.error_description 
        },
        { status: tokenResponse.status }
      );
    }

    // Получаем данные пользователя
    const userResponse = await fetch('https://api.hh.ru/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    if (!userResponse.ok) {
      console.error('User fetch error:', await userResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();

    // Обновляем/создаем пользователя
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
      await UserModel.updateUser(user.id, {
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
      });
      await UserModel.updateLastLogin(user.id);
    }

    // Сохраняем токены
    await TokenModel.saveToken(
      user.id, 
      tokenData.access_token, 
      tokenData.refresh_token, 
      tokenData.expires_in
    );

    // Формируем ответ
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expirationTimestamp: Date.now() + (tokenData.expires_in * 1000),
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name
      }
    });

  } catch (error) {
    console.error('Global error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
