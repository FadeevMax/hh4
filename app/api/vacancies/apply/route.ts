import { NextRequest, NextResponse } from 'next/server';
import TokenModel from '@/lib/models/token';
import ApplicationModel from '@/lib/models/application';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, vacancyId, resumeId, coverLetter, message } = body;
    const coverLetterToSend = coverLetter || message;

    // Allow access token from Authorization header if userId is not provided
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
          { error: 'No valid token found. Please re-authenticate with HH.ru' },
          { status: 401 }
        );
      }
      accessToken = token.accessToken;
    }

    if (!vacancyId || !resumeId) {
      return NextResponse.json(
        { error: 'Vacancy ID and resume ID are required' },
        { status: 400 }
      );
    }

    // Check if user already applied to this vacancy (optional, can be removed if not needed)
    if (userId) {
      const existingApplication = await ApplicationModel.findByVacancyAndUser(userId, vacancyId);
      if (existingApplication) {
        return NextResponse.json(
          { error: 'You have already applied to this vacancy', application: existingApplication },
          { status: 400 }
        );
      }
    }

    // Get detailed vacancy information
    const vacancyResponse = await fetch(`https://api.hh.ru/vacancies/${vacancyId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'HH-User-Agent': 'hh-auto-apply/1.0 (maxfade@gmail.com)'
      }
    });

    if (!vacancyResponse.ok) {
      const errorText = await vacancyResponse.text();
      return NextResponse.json(
        { error: 'Failed to fetch vacancy details from HH.ru', details: errorText },
        { status: vacancyResponse.status }
      );
    }

    const vacancyData = await vacancyResponse.json();

    // Prepare multipart/form-data for /negotiations
    const formData = new FormData();
    formData.append('vacancy_id', vacancyId);
    formData.append('resume_id', resumeId);
    if (coverLetterToSend) formData.append('message', coverLetterToSend);

    // Apply to the vacancy
    const applyResponse = await fetch(`https://api.hh.ru/negotiations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'HH-User-Agent': 'hh-auto-apply/1.0 (maxfade@gmail.com)'
        // Content-Type will be set automatically by FormData
      },
      body: formData
    });

    const applyText = await applyResponse.text();
    let applyData = null;
    try {
      applyData = applyText ? JSON.parse(applyText) : null;
    } catch {
      applyData = { raw: applyText };
    }

    if (!applyResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to apply to vacancy', details: applyData },
        { status: applyResponse.status }
      );
    }

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

    // Save application record (optional, can be removed if not needed)
    let application = null;
    if (userId) {
      application = await ApplicationModel.saveApplication({
        userId,
        vacancyId,
        vacancyTitle: vacancyData.name,
        companyName: vacancyData.employer.name,
        salaryDisplay,
        location: vacancyData.area.name,
        appliedAt: Date.now(),
        status: 'applied',
        url: vacancyData.alternate_url,
        coverLetter: coverLetterToSend || ''
      });
    }

    return NextResponse.json({
      success: true,
      application,
      hh_response: applyData
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error during vacancy application', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
} 