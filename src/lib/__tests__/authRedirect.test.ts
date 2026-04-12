import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthRedirectUrl,
  buildAuthRoute,
  buildPasswordResetRedirectUrl,
  getCurrentAppPath,
  resolvePostAuthPath,
} from '../authRedirect';

function setLocation(url: string) {
  const parsed = new URL(url);
  vi.stubGlobal('window', {
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
});
