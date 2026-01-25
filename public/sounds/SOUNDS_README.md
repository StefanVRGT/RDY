# Notification Sounds

This directory should contain the following audio files for notification tones:

- `default.mp3` - Standard notification sound (recommended: 1-2 seconds)
- `gentle.mp3` - Soft, calming tone (recommended: 1-2 seconds)
- `chime.mp3` - Pleasant chime sound (recommended: 1 second)
- `alert.mp3` - Attention-grabbing alert (recommended: 1-2 seconds)

The `silent` tone does not require an audio file - it simply skips playback.

## Requirements

- Format: MP3 (for broad browser compatibility)
- Duration: 1-2 seconds recommended
- File size: Keep under 50KB for fast loading

## Usage

The service worker will attempt to play the corresponding sound based on the user's
notification tone preference. If a sound file is not found, the notification will
still display but without custom audio.

## Licensing

Ensure all audio files are properly licensed for use in the application.
