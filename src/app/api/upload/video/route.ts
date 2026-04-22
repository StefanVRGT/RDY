import { NextRequest, NextResponse } from 'next/server';
import { createWriteStream, existsSync, unlinkSync } from 'fs';
import { mkdir } from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';
import busboy from 'busboy';
import { auth } from '@/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'video');
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  return new Promise<NextResponse>((resolve) => {
    const bb = busboy({
      headers: { 'content-type': contentType },
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    });

    let savedPath: string | null = null;
    let fileUrl: string | null = null;
    let mimeType: string | null = null;
    let fileSize = 0;
    let errorMsg: string | null = null;

    bb.on('file', (_field, stream, info) => {
      if (!ALLOWED_MIME_TYPES.includes(info.mimeType)) {
        errorMsg = 'Invalid file type. Only video files (MP4, WebM, MOV) are allowed.';
        stream.resume();
        return;
      }

      mimeType = info.mimeType;
      const ext = info.mimeType === 'video/quicktime' ? 'mov' : info.mimeType.split('/')[1];
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      savedPath = path.join(UPLOAD_DIR, filename);
      fileUrl = `/uploads/video/${filename}`;

      const writer = createWriteStream(savedPath);

      stream.on('data', (chunk: Buffer) => {
        fileSize += chunk.length;
      });

      stream.on('limit', () => {
        errorMsg = `File too large. Maximum size is 500 MB.`;
        writer.destroy();
        if (savedPath && existsSync(savedPath)) unlinkSync(savedPath);
        savedPath = null;
        fileUrl = null;
      });

      stream.on('error', () => {
        writer.destroy();
        if (savedPath && existsSync(savedPath)) unlinkSync(savedPath);
        savedPath = null;
        fileUrl = null;
        errorMsg = 'File stream error during upload.';
      });

      stream.pipe(writer);
    });

    bb.on('finish', () => {
      if (errorMsg) {
        resolve(NextResponse.json({ error: errorMsg }, { status: 400 }));
        return;
      }
      if (!fileUrl) {
        resolve(NextResponse.json({ error: 'No file provided' }, { status: 400 }));
        return;
      }
      resolve(NextResponse.json({ success: true, url: fileUrl, size: fileSize, type: mimeType }));
    });

    bb.on('error', (err) => {
      console.error('Video upload error:', err);
      if (savedPath && existsSync(savedPath)) unlinkSync(savedPath);
      resolve(NextResponse.json({ error: 'Upload failed' }, { status: 500 }));
    });

    Readable.fromWeb(request.body as import('stream/web').ReadableStream<Uint8Array>).pipe(bb);
  });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
