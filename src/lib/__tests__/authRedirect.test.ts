import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildAppUrl,
  buildAuthRedirectUrl,
  buildAuthRoute,
  buildPasswordResetRedirectUrl,
  getCurrentAppPath,
  markPostAuthWelcomeSeen,
  parseAuthUrlState,
  resolveAuthCompletionPath,
  resolvePostAuthPath,
} from '../authRedirect';

function setLocation(url: string) {
  const parsed = new URL(url);
  const storage = new Map<string, string>();
  vi.stubGlobal('window', {
    __HEXLOGY_RUNTIME_ENV__: {},
    localStorage: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
    },
    location: {
      origin: parsed.origin,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auth redirect helpers', () => {
  it('preserves the current app path when building the auth route', () => {
    setLocation('https://board.test/worlds/demo-world?tab=rooms#live');

    expect(getCurrentAppPath()).toBe('/worlds/demo-world?tab=rooms#live');
    expect(buildAuthRoute()).toBe('/auth?next=%2Fworlds%2Fdemo-world%3Ftab%3Drooms%23live');
  });

  it('drops unsafe or recursive auth targets', () => {
    setLocation('https://board.test/worlds');

    expect(buildAuthRoute('https://evil.example')).toBe('/auth');
    expect(buildAuthRoute('//evil.example')).toBe('/auth');
    expect(buildAuthRoute('/auth?reset=true')).toBe('/auth');
    expect(resolvePostAuthPath('/auth?next=/worlds')).toBe('/worlds');
  });

  it('omits next when returning to the default post-auth path', () => {
    setLocation('https://board.test/worlds');

    expect(buildAuthRoute('/worlds')).toBe('/auth');
    expect(buildAuthRedirectUrl('/worlds')).toBe('https://board.test/auth');
    expect(buildPasswordResetRedirectUrl('/worlds')).toBe('https://board.test/auth?reset=true');
  });

  it('keeps explicit non-default return targets in auth and reset URLs', () => {
    setLocation('https://board.test/play');

    expect(buildAuthRedirectUrl('/tournaments/abc')).toBe(
      'https://board.test/auth?next=%2Ftournaments%2Fabc',
    );
    expect(buildPasswordResetRedirectUrl('/worlds/demo-world')).toBe(
      'https://board.test/auth?reset=true&next=%2Fworlds%2Fdemo-world',
    );
    expect(resolvePostAuthPath('/worlds/demo-world')).toBe('/worlds/demo-world');
  });

  it('prefers the canonical app origin when runtime env provides it', () => {
    setLocation('https://preview.board.test/play');
    window.__HEXLOGY_RUNTIME_ENV__ = {
      VITE_PUBLIC_APP_URL: 'https://board.example.com',
    };

    expect(buildAppUrl('/profile?connections=1')).toBe(
      'https://board.example.com/profile?connections=1',
    );
    expect(buildAuthRedirectUrl('/events')).toBe('https://board.example.com/auth?next=%2Fevents');
    expect(buildPasswordResetRedirectUrl('/events')).toBe(
      'https://board.example.com/auth?reset=true&next=%2Fevents',
    );
  });

  it('parses auth callback errors and strips transient params', () => {
    const state = parseAuthUrlState('?next=%2Fplay&error_description=Access%20denied&code=abc', '');

    expect(state.returnTo).toBe('/play');
    expect(state.hasExplicitNext).toBe(true);
    expect(state.authError).toBe('Access denied');
    expect(state.hasCode).toBe(true);
    expect(state.cleanedSearch).toBe('?next=%2Fplay');
    expect(state.notice?.tone).toBe('critical');
  });

  it('treats recovery callbacks as reset flow without clearing token hashes early', () => {
    const state = parseAuthUrlState('?next=%2Fworlds%2Fdemo-world', '#type=recovery&access_token=test-token');

    expect(state.returnTo).toBe('/worlds/demo-world');
    expect(state.hasExplicitNext).toBe(true);
    expect(state.isResetFlow).toBe(true);
    expect(state.shouldClearHash).toBe(false);
    expect(state.notice?.title).toBe('Reset your password');
  });

  it('sends first-run auth completions to the welcome desk when there is no explicit target', () => {
    setLocation('https://board.test/auth');

    expect(resolveAuthCompletionPath()).toBe('/welcome');
  });

  it('prefers the explicit next target over the welcome desk', () => {
    setLocation('https://board.test/auth?next=%2Fworlds%2Ffoundry');

    expect(
      resolveAuthCompletionPath({
        returnTo: '/worlds/foundry',
        hasExplicitNext: true,
      }),
    ).toBe('/worlds/foundry');
  });

  it('uses the default post-auth path after the welcome desk has already been seen', () => {
    setLocation('https://board.test/auth');
    markPostAuthWelcomeSeen();

    expect(resolveAuthCompletionPath()).toBe('/worlds');
  });
});
