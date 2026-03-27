/**
 * Speech-to-Text via OpenAI Whisper API
 * Based on Helio/Ganesha pattern.
 * Uses OPENAI_API_KEY from environment.
 */

const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export async function transcribeWithWhisper(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  // Derive filename extension from MIME type
  let ext = mimeType.split('/')[1]?.split(';')[0] ?? 'webm';
  if (ext === 'mp4') ext = 'm4a';
  if (ext === 'mpeg') ext = 'mp3';
  const filename = `audio.${ext}`;

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  // Auto-detect language (handles German, English, Swiss German)

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as { text: string };
  return result.text;
}
