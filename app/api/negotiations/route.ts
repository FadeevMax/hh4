import { NextRequest, NextResponse } from 'next/server';
import TokenModel from '@/lib/models/token';
import ApplicationModel from '@/lib/models/application';

export async function POST(request: NextRequest) {
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

    // Need to clone the request since FormData can only be read once
    // const formData = await request.formData();

    // We'll create a new FormData object and extract the user ID if present
    const formData = await request.formData();
    const resume_id = formData.get('resume_id') as string;
    const vacancy_id = formData.get('vacancy_id') as string;
    const message = formData.get('message') as string | null;
    
    // Validate required fields
    if (!vacancy_id || !resume_id) {
      return NextResponse.json(
        { error: 'Vacancy ID and resume ID are required' },
        { status: 400 }
      );
    }

    // Get user ID from token for application tracking
    let userId = null;
    try {
      const tokenInfo = await fetch('https://api.hh.ru/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'HH-User-Agent': 'hh-auto-apply/1.0 (maxfade@gmail.com)'
        }
      });
      
      if (tokenInfo.ok) {
        const userData = await tokenInfo.json();
        userId = userData.id;
      }
    } catch (error) {
      console.error('Failed to get user ID from token:', error);
    }

    // Check if user already applied to this vacancy
    if (userId) {
      try {
        const existingApplication = await ApplicationModel.findByVacancyAndUser(userId, vacancy_id);
        if (existingApplication) {
          return NextResponse.json(
            { error: 'You have already applied to this vacancy', application: existingApplication },
            { status: 400 }
          );
        }
      } catch (error) {
        console.warn('Failed to check for existing application:', error);
      }
    }

    // Get detailed vacancy information for saving
    let vacancyData = null;
    try {
      const vacancyResponse = await fetch(`https://api.hh.ru/vacancies/${vacancy_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'HH-User-Agent': 'hh-auto-apply/1.0 (maxfade@gmail.com)'
        }
      });

      if (vacancyResponse.ok) {
        vacancyData = await vacancyResponse.json();
      }
    } catch (error) {
      console.error('Failed to fetch vacancy details:', error);
    }

    // Create new FormData to send to HH.ru
    const hhFormData = new FormData();
    hhFormData.append('vacancy_id', vacancy_id);
    hhFormData.append('resume_id', resume_id);
    if (message) hhFormData.append('message', message);

    // Apply to the vacancy
    const applyResponse = await fetch('https://api.hh.ru/negotiations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'HH-User-Agent': 'hh-auto-apply/1.0 (maxfade@gmail.com)'
        // Content-Type will be set automatically by FormData
      },
      body: hhFormData
    });

    // Get raw response
    const applyText = await applyResponse.text();
    let applyData = null;
    try {
      applyData = applyText ? JSON.parse(applyText) : null;
    } catch {
      applyData = { raw: applyText };
    }

    // Check if request was successful
    if (!applyResponse.ok && applyResponse.status !== 303) {
      return NextResponse.json(
        { error: 'Failed to apply to vacancy', details: applyData },
        { status: applyResponse.status }
      );
    }

    // Save application record if we have vacancy data and user ID
    let application = null;
    if (userId && vacancyData) {
      // Format salary for display
      let salaryDisplay = 'Не указана';
      if (vacancyData.salary) {
        const { from, to, currency } = vacancyData.salary;
        if (from && to) {
          salaryDisplay = `${from} - ${to} ${currency}`;
        } else if (from) {
          salaryDisplay = `от ${from} ${currency}`;
        } else if (to) {
          salaryDisplay = `до ${to} ${currency}`;
        }
      }

      try {
        application = await ApplicationModel.saveApplication({
          userId,
          vacancyId: vacancy_id,
          vacancyTitle: vacancyData.name,
          companyName: vacancyData.employer.name,
          salaryDisplay,
          location: vacancyData.area.name,
          appliedAt: Date.now(),
          status: 'applied',
          url: vacancyData.alternate_url,
          coverLetter: message || ''
        });
      } catch (error) {
        console.error('Failed to save application record:', error);
      }
    }

    // If it's a 303 redirect, it's likely a success (HH.ru often redirects after successful applications)
    if (applyResponse.status === 303) {
      const location = applyResponse.headers.get('Location');
      return NextResponse.json({
        success: true,
        redirectUrl: location,
        application
      });
    }

    return NextResponse.json({
      success: true,
      application,
      hh_response: applyData
    });

  } catch (error) {
    console.error('Error in /negotiations API route:', error);
    return NextResponse.json(
      { error: 'Internal server error during vacancy application', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 