import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSpam } from './spam.ts';

test('accepts normal text', () => {
  assert.equal(checkSpam('hello there', ''), null);
});

test('rejects honeypot', () => {
  assert.equal(checkSpam('hi', 'bot'), 'honeypot_triggered');
});

test('rejects link flood', () => {
  const body = 'http://a http://b http://c http://d http://e http://f';
  assert.equal(checkSpam(body, ''), 'too_many_links');
});

test('rejects excessive caps', () => {
  const body = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  assert.equal(checkSpam(body, ''), 'excessive_caps');
});
