import { NextRequest, NextResponse } from 'next/server';
import TokenModel from '@/lib/models/token';

// Define vacancy interface based on HH.ru API response
interface HHVacancy {
  id: string;
  name: string;
  area: {
    id: string;
    name: string;
  };
  salary: {
    from: number | null;
    to: number | null;
    currency: string;
    gross: boolean;
  } | null;
  employer: {
    id: string;
    name: string;
  };
  snippet: {
    requirement?: string;
    responsibility?: string;
  } | null;
  alternate_url: string;
  published_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, filter } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's access token
    const token = await TokenModel.getLatestToken(userId);
    if (!token) {
      return NextResponse.json(
        { error: 'No valid token found. Please re-authenticate with HH.ru' },
        { status: 401 }
      );
    }

    // Build query parameters for HH.ru API
    const queryParams = new URLSearchParams();
    
    // Add text search (combines job title and keywords)
    let textSearch = filter.jobTitle || '';
    if (filter.keywordsInclude) {
      const includedKeywords = filter.keywordsInclude
        .split(',')
        .map((kw: string) => kw.trim())
        .filter((kw: string) => kw)
        .join(' ');
      
      if (includedKeywords) {
        if (textSearch) textSearch += ' ';
        textSearch += includedKeywords;
      }
    }
    
    if (textSearch) queryParams.append('text', textSearch);
    
    // Add salary filter
    if (filter.minSalary) queryParams.append('salary', filter.minSalary);
    if (filter.maxSalary) queryParams.append('only_with_salary', 'true');
    
    // Add location filter
    if (filter.location) queryParams.append('area', filter.location);
    
    // Set per_page parameter
    queryParams.append('per_page', '100');
    
    // Make request to HH.ru API
    const response = await fetch(`https://api.hh.ru/vacancies?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'User-Agent': 'HH-Auto-Apply/1.0 (max.fade@example.com)',
        'HH-User-Agent': 'HH-Auto-Apply/1.0 (max.fade@example.com)'
      }
    });

    if (!response.ok) {
      console.error('Error fetching vacancies', await response.text());
      return NextResponse.json(
        { error: 'Failed to fetch vacancies from HH.ru' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Process results to exclude vacancies with excluded keywords
    let results = data.items as HHVacancy[];
    
    if (filter.keywordsExclude) {
      const excludedKeywords = filter.keywordsExclude
        .split(',')
        .map((kw: string) => kw.trim().toLowerCase())
        .filter((kw: string) => kw);
      
      if (excludedKeywords.length > 0) {
        results = results.filter((vacancy: HHVacancy) => {
          const name = vacancy.name.toLowerCase();
          const snippet = vacancy.snippet ? 
            `${vacancy.snippet.requirement || ''} ${vacancy.snippet.responsibility || ''}`.toLowerCase() : '';
          
          return !excludedKeywords.some((kw: string) => name.includes(kw) || snippet.includes(kw));
        });
      }
    }
    
    // Return processed results
    return NextResponse.json({
      items: results,
      found: data.found,
      pages: data.pages,
      filteredCount: results.length
    });
  } catch (error) {
    console.error('Vacancy search error:', error);
    return NextResponse.json(
      { error: 'Internal server error during vacancy search' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(JSON.stringify({ error: 'Отсутствует токен авторизации' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.substring(7);
    const url = new URL(request.url);
    const searchParams = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      searchParams.append(key, value);
    });
    const apiUrl = `https://api.hh.ru/vacancies?${searchParams.toString()}`;
    console.log('Searching vacancies with URL:', apiUrl);
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'HH-User-Agent': 'hh-auto-apply/1.0 (maxfade@gmail.com)'
      },
    });
    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();
    console.log('API response text:', responseText);
    let data = null;
    if (responseText && contentType.includes('application/json')) {
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        return new NextResponse(JSON.stringify({ error: 'Некорректный ответ от API HH.ru', details: responseText }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    if (!response.ok) {
      console.error(`Error from HH API (status ${response.status}):`, data || responseText || 'No body');
      return new NextResponse(JSON.stringify({
        error: data?.error || data?.description || `Ошибка ${response.status}`,
        details: data || responseText || 'No body',
        status: response.status
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Vacancy search error:', error);
    return new NextResponse(JSON.stringify({
      error: error instanceof Error ? error.message : 'Ошибка при поиске вакансий',
      status: 500
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 