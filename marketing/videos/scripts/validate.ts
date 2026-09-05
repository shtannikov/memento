import {relative} from 'node:path';
import {fail} from './lib/command';
import {VIDEOS_ROOT, loadAllProjects, loadEpisode, missingAssetPaths} from './lib/project';

try {
  if (process.argv.includes('--all')) {
    const projects = await loadAllProjects();
    process.stdout.write(`Validated ${projects.length} episode manifests.\n`);
  } else {
    const props = await loadEpisode(process.argv[2]);
    const missing = missingAssetPaths(props);
    if (missing.length > 0) throw new Error(`Episode is not render-ready. Missing:\n${missing.map((path) => `- ${relative(VIDEOS_ROOT, path)}`).join('\n')}`);
    process.stdout.write(`${props.episode.languageId}/${props.episode.id} is render-ready.\n`);
  }
} catch (error) {
  fail(error);
}
