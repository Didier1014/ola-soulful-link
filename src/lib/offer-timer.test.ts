import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { offerTimerMinutes, offerSecondsLeft } from './offer-timer';
test('reference offer lasts 40 minutes and never resets at expiration', () => {
  assert.equal(offerTimerMinutes({ enabled: true, countdown_min: 40 }), 40);
  assert.equal(offerSecondsLeft(2400000, 0), 2400);
  assert.equal(offerSecondsLeft(2400000, 2401000), 0);
  assert.equal(offerTimerMinutes({ enabled: false, countdown_min: 40 }), null);
});