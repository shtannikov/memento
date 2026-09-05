import {fail} from './lib/command';
import {buildObjectPrompt, loadEpisode} from './lib/project';

try {
  const props = await loadEpisode(process.argv[2]);
  for (const [index, item] of props.episode.items.entries()) {
    process.stdout.write(`\n--- ${index + 1}. ${item.term} (${item.slug}.png) ---\n\n${await buildObjectPrompt(props.language.id, item)}\n`);
  }
} catch (error) {
  fail(error);
}
