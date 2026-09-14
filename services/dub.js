const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { GoogleGenAI } = require('@google/genai');

const ffmpeg = require('ffmpeg-static');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve() : reject(new Error(err || `${cmd} failed with code ${code}`)));
  });
}

function safeJson(text) {
  const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const a = cleaned.indexOf('{');
  const b = cleaned.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(cleaned.slice(a, b + 1));
  throw new Error('Gemini did not return valid JSON.');
}

async function geminiText(ai, prompt) {
  const r = await ai.interactions.create({ model: process.env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash', input: prompt });
  return r.output_text || '';
}

async function transcribeAndTranslate(audioPath, sourceLanguage) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const file = await ai.files.upload({ file: audioPath, config: { mime_type: 'audio/mp3' } });

  const tr = await ai.interactions.create({
    model: process.env.GEMINI_TRANSCRIBE_MODEL || 'gemini-3.5-transcribe',
    input: [
      { type: 'text', text: sourceLanguage && sourceLanguage !== 'auto'
        ? `Transcribe this audio exactly. The spoken language is ${sourceLanguage}. Return only the transcript.`
        : 'Transcribe this audio exactly. Detect the spoken language automatically. Return only the transcript.' },
      { type: 'audio', uri: file.uri, mime_type: file.mimeType }
    ]
  });
  const transcript = (tr.output_text || '').trim();
  if (!transcript) throw new Error('No speech was detected in the video audio.');

  const prompt = `Translate the following spoken dialogue into natural Khmer for voice dubbing. Keep the meaning, names and tone. Do not explain anything. Return ONLY valid JSON in this exact shape: {"khmer":"..."}.\n\nSOURCE:\n${transcript}`;
  const translated = safeJson(await geminiText(ai, prompt));
  if (!translated.khmer) throw new Error('Khmer translation was empty.');
  return { transcript, khmer: translated.khmer };
}

async function tts(text, outPath, voiceId) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('Missing ELEVENLABS_API_KEY in Render Environment.');
  if (!voiceId) throw new Error('Missing ELEVENLABS_VOICE_ID in Render Environment.');
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2', output_format: 'mp3_44100_128' })
  });
  if (!r.ok) throw new Error(`ElevenLabs TTS failed (${r.status}): ${await r.text()}`);
  fs.writeFileSync(outPath, Buffer.from(await r.arrayBuffer()));
}

async function processDub(input, outputDir, opts) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY in Render Environment.');
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('Missing ELEVENLABS_API_KEY in Render Environment.');

  fs.mkdirSync(outputDir, { recursive: true });
  const base = path.basename(input, path.extname(input));
  const work = path.join(outputDir, `${base}-work`);
  fs.mkdirSync(work, { recursive: true });
  const audio = path.join(work, 'source.mp3');
  const voice = path.join(work, 'khmer.mp3');
  const out = path.join(outputDir, `${base}-khmer-dub.mp4`);

  await run(ffmpeg, ['-y', '-i', input, '-vn', '-ac', '1', '-ar', '44100', '-b:a', '128k', audio]);
  const result = await transcribeAndTranslate(audio, opts.sourceLanguage);
  await tts(result.khmer, voice, process.env.ELEVENLABS_VOICE_ID);

  // Replace the original audio with the Khmer dub. The video stream is copied without re-encoding.
  await run(ffmpeg, ['-y', '-i', input, '-i', voice, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out]);

  fs.rmSync(work, { recursive: true, force: true });
  return { status: 'completed', output: `/outputs/${path.basename(out)}`, transcript: result.transcript, khmer: result.khmer };
}

module.exports = { processDub };
                     
