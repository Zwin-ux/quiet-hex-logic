import { afterEach, describe, expect, it, vi } from 'vitest';

function stubBrowser(search = '') {
  vi.stubGlobal('window', {
    location: {
      search,
    },
    __HEXLOGY_RUNTIME_ENV__: {
      VITE_WORLD_APP_ID: 'app_test_board',
    },
  });
}

function stubNavigator(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  });
}

async function loadClient(miniKitOverrides: Record<string, unknown> = {}) {
  vi.resetModules();

  const miniKit = {
    install: vi.fn(),
    isInstalled: vi.fn(() => false),
    walletAuth: vi.fn(),
    share: vi.fn(),
    sendHapticFeedback: vi.fn(),
    user: null,
    deviceProperties: null,
    ...miniKitOverrides,
  };

  vi.doMock('@worldcoin/minikit-js', () => ({
    MiniKit: miniKit,
  }));

  const client = await import('../client');
  return { client, miniKit };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.doUnmock('@worldcoin/minikit-js');
});

describe('worldApp client', () => {
  it('reads the World App id from runtime env', async () => {
    stubBrowser();
    const { client } = await loadClient();

    expect(client.getWorldAppId()).toBe('app_test_board');
  });

  it('detects a mocked World surface without MiniKit installed', async () => {
    stubBrowser('?surface=world');
    const { client, miniKit } = await loadClient({
      isInstalled: vi.fn(() => false),
    });

    expect(client.isLikelyWorldApp()).toBe(true);
    expect(miniKit.install).not.toHaveBeenCalled();
  });

  it('installs MiniKit once and returns the SDK installed state', async () => {
    stubBrowser();
    const { client, miniKit } = await loadClient({
      isInstalled: vi.fn(() => true),
    });

    expect(client.installWorldApp()).toBe(true);
    expect(client.installWorldApp()).toBe(true);
    expect(miniKit.install).toHaveBeenCalledTimes(1);
    expect(miniKit.install).toHaveBeenCalledWith('app_test_board');
  });

  it('runs wallet auth only when MiniKit is installed', async () => {
    stubBrowser();
    const walletAuth = vi.fn().mockResolvedValue({
      data: {
        address: '0xabc',
        message: 'message',
        signature: 'signature',
        version: 1,
      },
    });
    const { client } = await loadClient({
      isInstalled: vi.fn(() => true),
      walletAuth,
    });

    await expect(
      client.runWorldWalletAuth({
        nonce: 'nonce',
        requestId: 'request-id',
        statement: 'Play real people.',
        expirationTime: '2026-04-29T12:00:00.000Z',
      }),
    ).resolves.toMatchObject({ address: '0xabc' });

    expect(walletAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 'nonce',
        requestId: 'request-id',
        statement: 'Play real people.',
      }),
    );
  });

  it('falls back to copying share text outside World App', async () => {
    stubBrowser();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({
      clipboard: { writeText },
    });
    const { client } = await loadClient({
      isInstalled: vi.fn(() => false),
    });

    await client.shareWorldApp({
      title: 'BOARD',
      text: 'Room open',
      url: 'https://board.test/rooms/ABC123',
    });

    expect(writeText).toHaveBeenCalledWith('BOARD\nRoom open\nhttps://board.test/rooms/ABC123');
  });

  it('maps haptic presets to MiniKit feedback commands', async () => {
    stubBrowser();
    const sendHapticFeedback = vi.fn().mockResolvedValue(undefined);
    const { client } = await loadClient({
      isInstalled: vi.fn(() => true),
      sendHapticFeedback,
    });

    await client.sendWorldHapticFeedback('invalid');
    await client.sendWorldHapticFeedback('move');

    expect(sendHapticFeedback).toHaveBeenNthCalledWith(1, {
      hapticsType: 'notification',
      style: 'error',
    });
    expect(sendHapticFeedback).toHaveBeenNthCalledWith(2, {
      hapticsType: 'impact',
      style: 'light',
    });
  });
});
