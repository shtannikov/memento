import assert from 'node:assert/strict';
import test from 'node:test';
import {ANSWER_SPEECH_FRAME, FRAMES_PER_ITEM, parseEpisodeManifest, parseLanguagePack, resolveQuizVideoProps} from './manifest';

const language = {
  id: 'test', targetLanguage: 'Test', locale: 'xx-XX', seriesLabel: 'TEST QUIZ',
  questionText: 'What is this?', tts: {voice: 'Test Voice', questionRate: 190, answerRate: 175},
};

const item = (slug: string) => ({
  term: slug, slug, visualPrompt: `a ${slug}`, accent: '#123ABC', pale: '#F0F0F0',
});

const episode = {
  id: 'sample', languageId: 'test', topic: 'Sample',
  items: ['one', 'two', 'three', 'four', 'five'].map(item),
};

test('parses a non-Czech language and five-item episode', () => {
  assert.deepEqual(resolveQuizVideoProps(language, episode), {language, episode});
});

test('rejects an episode with the wrong item count', () => {
  assert.throws(() => parseEpisodeManifest({...episode, items: episode.items.slice(0, 4)}), /exactly 5/);
});

test('rejects duplicate and unsafe slugs', () => {
  assert.throws(() => parseEpisodeManifest({...episode, items: episode.items.map(() => item('same'))}), /unique/);
  assert.throws(() => parseEpisodeManifest({...episode, items: [item('../bad'), ...episode.items.slice(1)]}), /kebab-case/);
});

test('rejects invalid colors and language mismatches', () => {
  assert.throws(() => parseEpisodeManifest({...episode, items: [{...item('one'), accent: 'red'}, ...episode.items.slice(1)]}), /hex color/);
  assert.throws(() => resolveQuizVideoProps(language, {...episode, languageId: 'other'}), /does not match/);
});

test('keeps product id and standards locale distinct', () => {
  assert.deepEqual(parseLanguagePack({...language, id: 'cz', locale: 'cs-CZ'}), {...language, id: 'cz', locale: 'cs-CZ'});
});

test('reserves enough time for a natural multiword answer recording', () => {
  assert.equal((FRAMES_PER_ITEM - ANSWER_SPEECH_FRAME) / 30, 37 / 30);
});
