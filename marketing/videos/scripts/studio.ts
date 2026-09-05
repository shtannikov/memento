import {relative} from 'node:path';
import {fail, runCommand} from './lib/command';
import {VIDEOS_ROOT, loadEpisode, missingAssetPaths} from './lib/project';

try {
  const props = await loadEpisode(process.argv[2]);
  const missing = missingAssetPaths(props);
  if (missing.length > 0) throw new Error(`Cannot open Studio; missing assets:\n${missing.map((path) => `- ${relative(VIDEOS_ROOT, path)}`).join('\n')}`);
  await runCommand('remotion', ['studio', 'src/index.ts', '--props', JSON.stringify(props)]);
} catch (error) {
  fail(error);
}
