import { NextRequest, NextResponse } from 'next/server';
import TokenModel from '@/lib/models/token';
import ApplicationModel from '@/lib/models/application';

export const dynamic = "force-dynamic";

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

    // Fetch applications from local DB
    const applications = await ApplicationModel.findByUserId(userId);
    return NextResponse.json({
      applications: applications.map(app => ({
        id: (app as any)._id?.toString?.() || app.id,
        vacancyId: app.vacancyId,
        vacancyName: app.vacancyTitle,
        employerName: app.companyName,
        status: app.status,
        createdAt: new Date(app.appliedAt).toISOString(),
        updatedAt: new Date(app.appliedAt).toISOString(),
        hasUpdates: false,
        url: app.url,
        coverLetter: app.coverLetter || ''
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