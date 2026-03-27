import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { auth } from '@/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'video');
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB max
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only video files are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500MB.' },
        { status: 400 }
      );
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = file.type === 'video/quicktime' ? 'mov' : file.type.split('/')[1];
    const filename = `${timestamp}-${randomStr}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/video/${filename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
