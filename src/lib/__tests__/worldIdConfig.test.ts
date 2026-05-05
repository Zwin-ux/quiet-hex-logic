import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_WORLD_ID_ACTION,
  getWorldIdAction,
  getWorldIdAppId,
  getWorldIdConfigurationIssue,
  isWorldIdConfigured,
} from '../worldIdConfig';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worldIdConfig', () => {
  it('uses runtime env for the app id and action when present', () => {
    vi.stubGlobal('window', {
      __HEXLOGY_RUNTIME_ENV__: {
        VITE_WORLD_ID_APP_ID: 'app_test_board',
        VITE_WORLD_ID_ACTION: 'verify-account',
      },
    });

    expect(getWorldIdAppId()).toBe('app_test_board');
    expect(getWorldIdAction()).toBe('verify-account');
    expect(isWorldIdConfigured()).toBe(true);
    expect(getWorldIdConfigurationIssue()).toBeNull();
  });

  it('falls back to the default action when the runtime env omits it', () => {
    vi.stubGlobal('window', {
      __HEXLOGY_RUNTIME_ENV__: {
        VITE_WORLD_ID_APP_ID: 'app_test_board',
      },
    });

    expect(getWorldIdAction()).toBe(DEFAULT_WORLD_ID_ACTION);
  });

  it('uses the Mini App id as the World ID app fallback', () => {
    vi.stubGlobal('window', {
      __HEXLOGY_RUNTIME_ENV__: {
        VITE_WORLD_APP_ID: 'app_world_board',
      },
    });

    expect(getWorldIdAppId()).toBe('app_world_board');
    expect(isWorldIdConfigured()).toBe(true);
  });

  it('reports when the deployment is missing the app id', () => {
    vi.stubGlobal('window', {
      __HEXLOGY_RUNTIME_ENV__: {},
    });

    expect(getWorldIdAppId()).toBe('');
    expect(isWorldIdConfigured()).toBe(false);
    expect(getWorldIdConfigurationIssue()).toBe('World ID is not configured for this deployment yet.');
  });
});
