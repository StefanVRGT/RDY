import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { transcribeWithWhisper } from '@/lib/ai/whisper';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await transcribeWithWhisper(buffer, file.type);

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed';
    console.error('Transcription error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
