import {access, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {runCommand} from './command';

export function speechCommands(voice: string, rate: number, text: string, aiffPath: string, wavPath: string) {
  return {
    say: ['-v', voice, '-r', String(rate), '-o', aiffPath, text],
    convert: ['-f', 'WAVE', '-d', 'LEI16@44100', aiffPath, wavPath],
  };
}

export async function assertVoiceTools(voice: string): Promise<void> {
  await Promise.all([access('/usr/bin/say'), access('/usr/bin/afconvert')]);
  const voices = execFileSync('/usr/bin/say', ['-v', '?'], {encoding: 'utf8'});
  if (!voices.split('\n').some((line) => line.startsWith(`${voice} `))) {
    throw new Error(`macOS voice "${voice}" is not installed`);
  }
}

export async function generateSpeech(input: {voice: string; rate: number; text: string; destination: string}): Promise<void> {
  await assertVoiceTools(input.voice);
  await mkdir(dirname(input.destination), {recursive: true});
  const temporaryDir = await mkdtemp(join(tmpdir(), 'memento-video-voice-'));
  const aiffPath = join(temporaryDir, 'speech.aiff');
  try {
    const commands = speechCommands(input.voice, input.rate, input.text, aiffPath, input.destination);
    await runCommand('/usr/bin/say', commands.say);
    await runCommand('/usr/bin/afconvert', commands.convert);
  } finally {
    await rm(temporaryDir, {recursive: true, force: true});
  }
}
