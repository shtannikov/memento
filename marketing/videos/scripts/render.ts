import {mkdir} from 'node:fs/promises';
import {dirname, relative} from 'node:path';
import {fail, runCommand} from './lib/command';
import {VIDEOS_ROOT, loadEpisode, missingAssetPaths, renderPath} from './lib/project';

try {
  const props = await loadEpisode(process.argv[2]);
  const missing = missingAssetPaths(props);
  if (missing.length > 0) throw new Error(`Cannot render; missing assets:\n${missing.map((path) => `- ${relative(VIDEOS_ROOT, path)}`).join('\n')}`);
  const output = renderPath(props.episode);
  await mkdir(dirname(output), {recursive: true});
  await runCommand('remotion', [
    'render', 'src/index.ts', 'VocabularyQuiz', output,
    '--props', JSON.stringify(props), '--codec=h264', '--crf=18',
  ]);
  process.stdout.write(`Rendered ${output}\n`);
} catch (error) {
  fail(error);
}
