import {access, mkdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join} from 'node:path';
import {fail} from './lib/command';
import {generatedEpisodeDir, loadEpisode} from './lib/project';
import {generateSpeech} from './lib/voice';

try {
  const props = await loadEpisode(process.argv[2]);
  const force = process.argv.includes('--force');
  const audioDir = join(generatedEpisodeDir(props.episode), 'audio');
  await mkdir(audioDir, {recursive: true});
  for (const item of props.episode.items) {
    const destination = join(audioDir, `${item.slug}.wav`);
    let exists = true;
    try { await access(destination, constants.F_OK); } catch { exists = false; }
    if (exists && !force) {
      process.stdout.write(`Keeping existing ${destination}\n`);
      continue;
    }
    await generateSpeech({voice: props.language.tts.voice, rate: props.language.tts.answerRate, text: item.term, destination});
    process.stdout.write(`Generated ${destination}\n`);
  }
} catch (error) {
  fail(error);
}
