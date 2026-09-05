import assert from 'node:assert/strict';
import test from 'node:test';
import {buildObjectPrompt, loadAllProjects, loadEpisode, parseSelector, requiredAssetPaths, resolveInside, VIDEOS_ROOT} from './project';

test('loads all seven Czech manifests against the application registry', async () => {
  const projects = await loadAllProjects();
  assert.equal(projects.length, 7);
  assert.ok(projects.every(({language, episode}) => language.id === 'cz' && episode.languageId === 'cz'));
});

test('parses safe selectors and rejects traversal', () => {
  assert.deepEqual(parseSelector('cz/cafe'), {languageId: 'cz', episodeId: 'cafe'});
  assert.throws(() => parseSelector('../cafe'), /Expected an episode selector/);
  assert.throws(() => resolveInside(VIDEOS_ROOT, '..', 'outside'), /Refusing path outside/);
});

test('derives language-scoped core and generated asset paths', async () => {
  const props = await loadEpisode('cz/cafe');
  const paths = requiredAssetPaths(props);
  assert.ok(paths.some((path) => path.endsWith('/public/languages/cz/question.wav')));
  assert.ok(paths.some((path) => path.endsWith('/public/generated/cz/cafe/images/kava.png')));
  assert.ok(paths.some((path) => path.endsWith('/public/generated/cz/cafe/audio/kava.wav')));
});

test('assembles the language prompt with item meaning and hidden term context', async () => {
  const props = await loadEpisode('cz/cafe');
  const prompt = await buildObjectPrompt('cz', props.episode.items[0]);
  assert.match(prompt, /photorealistic/i);
  assert.match(prompt, /ceramic cup of freshly brewed coffee/);
  assert.match(prompt, /"káva"/);
});
