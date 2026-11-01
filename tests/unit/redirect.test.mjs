import test from 'node:test';
import assert from 'node:assert/strict';
import { safeRedirectPath } from '../../src/lib/auth/redirect.ts';

test('keeps same-site paths, query and hash', () => {
  assert.equal(safeRedirectPath('/seller/orders?status=ready#top'), '/seller/orders?status=ready#top');
  assert.equal(safeRedirectPath('/dashboard'), '/dashboard');
});

test('rejects anything that could leave the site', () => {
  for (const bad of ['@evil.example/x', '//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)',
    'evil.example', '/\t/evil.example', '/\n/evil.example', '', null, undefined, '/' + 'a'.repeat(3000)]) {
    assert.equal(safeRedirectPath(bad), '/dashboard', JSON.stringify(bad));
  }
});

test('uses the supplied fallback', () => {
  assert.equal(safeRedirectPath('//x', '/seller'), '/seller');
});
