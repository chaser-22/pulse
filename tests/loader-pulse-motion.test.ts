import assert from 'node:assert/strict';
import test from 'node:test';
import { getLoaderPulseRate } from '../lib/loader-pulse-motion';

test('loader pulse rate accelerates continuously with loading progress', () => {
  const checkpoints = [0, 25, 50, 75, 90, 100].map(getLoaderPulseRate);

  for (let index = 1; index < checkpoints.length; index += 1) {
    assert.ok(checkpoints[index] > checkpoints[index - 1]);
  }

  assert.ok(checkpoints[0] >= 0.6 && checkpoints[0] <= 0.8);
  assert.ok(checkpoints.at(-1)! >= 3 && checkpoints.at(-1)! <= 3.5);
});

test('loader pulse rate clamps progress outside 0 to 100', () => {
  assert.equal(getLoaderPulseRate(-20), getLoaderPulseRate(0));
  assert.equal(getLoaderPulseRate(130), getLoaderPulseRate(100));
});
