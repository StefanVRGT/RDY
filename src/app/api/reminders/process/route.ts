import { NextRequest, NextResponse } from 'next/server';
import { processExerciseReminders } from '@/lib/reminders/exercise-reminders';
import { processAllSessionReminders } from '@/lib/reminders/session-reminders';

// This endpoint processes pending exercise and session reminders
// It should be called by a scheduler (e.g., Vercel Cron, external cron service)
// The endpoint is protected by an API key

export async function GET(request: NextRequest) {
  // Verify API key for security
  const apiKey = request.headers.get('x-api-key');
  const expectedApiKey = process.env.REMINDER_API_KEY;

  // Allow if API key is set and matches, or if no key is configured (development)
  if (expectedApiKey && apiKey !== expectedApiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Process all reminder types in parallel
    const [exerciseResult, sessionResult] = await Promise.all([
      processExerciseReminders(),
      processAllSessionReminders(),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      exercises: exerciseResult,
      sessions: sessionResult.sessions,
      groupSessions: sessionResult.groupSessions,
    });
  } catch (error) {
    console.error('Error processing reminders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
