import {rm} from 'node:fs/promises';
import {fail} from './lib/command';
import {generatedEpisodeDir, loadEpisode, renderPath} from './lib/project';

try {
  const props = await loadEpisode(process.argv[2]);
  const targets = [generatedEpisodeDir(props.episode), renderPath(props.episode)];
  for (const target of targets) {
    await rm(target, {recursive: true, force: true});
    process.stdout.write(`Removed ${target}\n`);
  }
} catch (error) {
  fail(error);
}
