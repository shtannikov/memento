import {access, readFile, readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  type EpisodeItem,
  type EpisodeManifest,
  type QuizVideoProps,
  type VideoLanguagePack,
  parseEpisodeManifest,
  parseLanguagePack,
  resolveQuizVideoProps,
} from '../../src/manifest';

export const VIDEOS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const REPOSITORY_ROOT = resolve(VIDEOS_ROOT, '../..');

export type EpisodeSelector = {languageId: string; episodeId: string};

const safeId = /^[a-z][a-z0-9-]*$/;

export function parseSelector(value: string | undefined): EpisodeSelector {
  const parts = value?.split('/') ?? [];
  if (parts.length !== 2 || parts.some((part) => !safeId.test(part))) {
    throw new Error('Expected an episode selector in the form <language-id>/<episode-id>, for example cz/cafe');
  }
  return {languageId: parts[0], episodeId: parts[1]};
}

export function resolveInside(base: string, ...parts: string[]): string {
  const target = resolve(base, ...parts);
  const pathFromBase = relative(base, target);
  if (pathFromBase === '..' || pathFromBase.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(pathFromBase)) {
    throw new Error(`Refusing path outside ${base}`);
  }
  return target;
}

async function json(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`Could not read JSON file ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function assertRegisteredAppId(languageId: string): Promise<void> {
  const definitionPath = resolveInside(REPOSITORY_ROOT, 'src/app/_languages', languageId, 'index.ts');
  const registryPath = resolveInside(REPOSITORY_ROOT, 'src/app/_languages/registry.ts');
  if (!existsSync(definitionPath)) throw new Error(`Video language ${languageId} has no matching application language definition`);
  const [definition, registry] = await Promise.all([readFile(definitionPath, 'utf8'), readFile(registryPath, 'utf8')]);
  if (!new RegExp(`id:\\s*["']${languageId}["']`).test(definition) || !new RegExp(`from\\s*["']\\./${languageId}["']`).test(registry)) {
    throw new Error(`Video language ${languageId} is not registered as the same application id`);
  }
}

export async function loadLanguage(languageId: string): Promise<VideoLanguagePack> {
  if (!safeId.test(languageId)) throw new Error('Language id must use lowercase kebab-case');
  const path = resolveInside(VIDEOS_ROOT, 'languages', languageId, 'config.json');
  const language = parseLanguagePack(await json(path));
  if (language.id !== languageId) throw new Error(`Language pack id ${language.id} does not match directory ${languageId}`);
  await Promise.all([
    assertRegisteredAppId(languageId),
    access(resolveInside(VIDEOS_ROOT, 'languages', languageId, 'object-image-prompt.md')),
    access(resolveInside(VIDEOS_ROOT, 'languages', languageId, 'episode-request.md')),
  ]).catch((error: unknown) => {
    throw new Error(`Language pack ${languageId} is incomplete: ${error instanceof Error ? error.message : String(error)}`);
  });
  return language;
}

export async function loadEpisode(selectorValue: string | undefined): Promise<QuizVideoProps> {
  const selector = parseSelector(selectorValue);
  const [language, episodeValue] = await Promise.all([
    loadLanguage(selector.languageId),
    json(resolveInside(VIDEOS_ROOT, 'episodes', selector.languageId, `${selector.episodeId}.json`)),
  ]);
  const episode = parseEpisodeManifest(episodeValue);
  if (episode.id !== selector.episodeId) throw new Error(`Episode id ${episode.id} does not match filename ${selector.episodeId}.json`);
  return resolveQuizVideoProps(language, episode);
}

export function generatedEpisodeDir(episode: EpisodeManifest): string {
  return resolveInside(VIDEOS_ROOT, 'public/generated', episode.languageId, episode.id);
}

export function renderPath(episode: EpisodeManifest): string {
  return resolveInside(VIDEOS_ROOT, 'renders', episode.languageId, `${episode.id}.mp4`);
}

export function requiredAssetPaths(props: QuizVideoProps): string[] {
  const base = generatedEpisodeDir(props.episode);
  return [
    resolveInside(VIDEOS_ROOT, 'public/core/sfx/tick.wav'),
    resolveInside(VIDEOS_ROOT, 'public/core/sfx/ding.wav'),
    resolveInside(VIDEOS_ROOT, 'public/languages', props.language.id, 'question.wav'),
    ...props.episode.items.flatMap((item) => [join(base, 'images', `${item.slug}.png`), join(base, 'audio', `${item.slug}.wav`)]),
  ];
}

export function missingAssetPaths(props: QuizVideoProps): string[] {
  return requiredAssetPaths(props).filter((path) => !existsSync(path));
}

export async function buildObjectPrompt(languageId: string, item: EpisodeItem): Promise<string> {
  const templatePath = resolveInside(VIDEOS_ROOT, 'languages', languageId, 'object-image-prompt.md');
  const template = (await readFile(templatePath, 'utf8')).trim();
  return `${template}\n\nSubject for this asset: ${item.visualPrompt}\nTarget-language term for context only; do not render it: "${item.term}"`;
}

export async function loadAllProjects(): Promise<QuizVideoProps[]> {
  const languagesDir = resolveInside(VIDEOS_ROOT, 'languages');
  await Promise.all([
    access(resolveInside(VIDEOS_ROOT, 'public/core/sfx/tick.wav')),
    access(resolveInside(VIDEOS_ROOT, 'public/core/sfx/ding.wav')),
  ]).catch((error: unknown) => {
    throw new Error(`Committed core sound effects are incomplete: ${error instanceof Error ? error.message : String(error)}`);
  });
  const entries = await readdir(languagesDir, {withFileTypes: true});
  const projects: QuizVideoProps[] = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    await access(resolveInside(VIDEOS_ROOT, 'public/languages', entry.name, 'question.wav')).catch((error: unknown) => {
      throw new Error(`Language pack ${entry.name} has no committed question.wav: ${error instanceof Error ? error.message : String(error)}`);
    });
    const episodeDir = resolveInside(VIDEOS_ROOT, 'episodes', entry.name);
    const episodeFiles = (await readdir(episodeDir)).filter((name) => name.endsWith('.json')).sort();
    for (const episodeFile of episodeFiles) projects.push(await loadEpisode(`${entry.name}/${episodeFile.slice(0, -5)}`));
  }
  return projects;
}
