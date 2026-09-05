import {access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join} from 'node:path';
import {fail} from './lib/command';
import {VIDEOS_ROOT, loadLanguage} from './lib/project';
import {generateSpeech} from './lib/voice';

try {
  const languageId = process.argv[2];
  if (!languageId) throw new Error('Expected a language id, for example cz');
  const language = await loadLanguage(languageId);
  const destination = join(VIDEOS_ROOT, 'public/languages', language.id, 'question.wav');
  let exists = true;
  try { await access(destination, constants.F_OK); } catch { exists = false; }
  if (exists && !process.argv.includes('--force')) throw new Error(`${destination} already exists; pass --force to replace this committed core asset`);
  await generateSpeech({voice: language.tts.voice, rate: language.tts.questionRate, text: language.questionText, destination});
  process.stdout.write(`Generated ${destination}\n`);
} catch (error) {
  fail(error);
}
