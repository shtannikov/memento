import assert from 'node:assert/strict';
import test from 'node:test';
import {speechCommands} from './voice';

test('builds macOS speech and lossless WAV conversion commands', () => {
  assert.deepEqual(speechCommands('Zuzana', 175, 'káva', '/tmp/in.aiff', '/tmp/out.wav'), {
    say: ['-v', 'Zuzana', '-r', '175', '-o', '/tmp/in.aiff', 'káva'],
    convert: ['-f', 'WAVE', '-d', 'LEI16@44100', '/tmp/in.aiff', '/tmp/out.wav'],
  });
});
