# Trex Story AI — Khmer Dub V4

Actual pipeline: video → FFmpeg audio extraction → Gemini transcription → Gemini Khmer translation → ElevenLabs Khmer TTS → FFmpeg MP4 export.

## Render Environment Variables
Set these in Render, not GitHub:
- GEMINI_API_KEY
- ELEVENLABS_API_KEY
- ELEVENLABS_VOICE_ID
- GEMINI_TRANSCRIBE_MODEL=gemini-3.5-transcribe
- GEMINI_TEXT_MODEL=gemini-3.8-flash
- ELEVENLABS_MODEL=eleven_multilingual_v2

The server bundles FFmpeg through ffmpeg-static, so Render does not need a system FFmpeg installation.
