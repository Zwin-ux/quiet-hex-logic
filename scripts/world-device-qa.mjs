import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REQUIRED_RUNTIME_KEYS = [
  'VITE_WORLD_APP_ID',
  'VITE_WORLD_ID_ACTION',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
];

const WORLD_ENDPOINTS = [
  { method: 'POST', path: '/api/world/nonce' },
  { method: 'POST', path: '/api/world/complete-wallet-auth' },
  { method: 'POST', path: '/api/world/rp-signature' },
  { method: 'POST', path: '/api/world/verify-id' },
  { method: 'GET', path: '/api/world/quickplay/state' },
  { method: 'POST', path: '/api/world/quickplay' },
];

const WORLD_BUNDLE_LABELS = [
  'World seat',
  'Enter a human room.',
  'Quick ranked',
  'Open unranked room',
  'Bind World wallet',
];

const VISUAL_DEVICES = [
  { id: 'ios', label: 'iPhone 15', width: 393, height: 852, scale: 2 },
  { id: 'android', label: 'Pixel 8', width: 412, height: 915, scale: 2 },
];

const VISUAL_ROUTES = [
  { id: 'world-surface', label: 'World surface', path: '/?surface=world' },
  { id: 'play', label: 'Play', path: '/play' },
  { id: 'worlds', label: 'Worlds', path: '/worlds' },
  { id: 'events', label: 'Events', path: '/events' },
  { id: 'world-detail', label: 'World detail', path: '/worlds/088528d7-4b18-4a1c-befb-24e251429b46' },
  { id: 'tournament-detail', label: 'Tournament detail', path: '/tournament/80f33dd3-3595-4465-85f4-d0861fe026b1' },
];

const IGNORED_CONSOLE_PATTERNS = [
  /MiniKit is not installed/i,
  /React Router Future Flag Warning/i,
  /was preloaded using link preload but not used within a few seconds/i,
];
const BLOCKED_VISUAL_TEXT_PATTERNS = [
  { pattern: /Deployment Config Missing/i, reason: 'deployment-config shell rendered instead of the product surface' },
  { pattern: /World failed to load/i, reason: 'world detail error fallback rendered instead of the product surface' },
  { pattern: /Tournament failed to load/i, reason: 'tournament detail error fallback rendered instead of the product surface' },
];

function parseArgs(argv) {
  const args = {
    appUrl: '',
    qrUrl: '',
    outDir: '',
    deploymentId: '',
    authCheck: false,
    visualCheck: false,
    visualOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--out') {
      args.outDir = argv[index + 1] || '';
      index += 1;
    } else if (value === '--deployment-id') {
      args.deploymentId = argv[index + 1] || '';
      index += 1;
    } else if (value === '--qr-url') {
      args.qrUrl = argv[index + 1] || '';
      index += 1;
    } else if (value === '--auth-check') {
      args.authCheck = true;
    } else if (value === '--visual-check') {
      args.visualCheck = true;
    } else if (value === '--visual-only') {
      args.visualOnly = true;
      args.visualCheck = true;
    } else if (!value.startsWith('--') && !args.appUrl) {
      args.appUrl = value;
    }
  }

  return args;
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;

  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

function firstEnv(fileEnv, keys) {
  for (const key of keys) {
    const value = (process.env[key] || fileEnv[key] || '').trim();
    if (value) return value;
  }

  return '';
}

function normalizeOrigin(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const url = new URL(trimmed);
  return url.origin;
}

function toAbsoluteUrl(origin, value) {
  return new URL(value, origin).toString();
}

function isLocalOrigin(origin) {
  const host = new URL(origin).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(12000),
  });

  const text = await response.text();
  return { response, text };
}

async function fetchJson(url) {
  const { response, text } = await fetchText(url);
  if (!response.ok) {
    throw new Error(`${url} returned status ${response.status}`);
  }

  return JSON.parse(text);
}

async function fetchJsonWithStatus(url, options = {}) {
  const { response, text } = await fetchText(url, options);
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { response, json };
}

function extractRuntimeEnv(html) {
  const match = html.match(/window\.__HEXLOGY_RUNTIME_ENV__=({.*?});?<\/script>/s);
  if (!match?.[1]) {
    throw new Error('missing_runtime_env_script');
  }

  return JSON.parse(match[1]);
}

function extractAssetUrls(origin, html) {
  const jsUrls = new Set();
  const cssUrls = new Set();
  const assetPattern = /(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g;

  let match = assetPattern.exec(html);
  while (match) {
    const url = toAbsoluteUrl(origin, match[1]);
    if (/\.css(?:\?|$)/i.test(match[1])) {
      cssUrls.add(url);
    } else {
      jsUrls.add(url);
    }
    match = assetPattern.exec(html);
  }

  return {
    js: [...jsUrls],
    css: [...cssUrls],
  };
}

function record(checks, name, status, detail) {
  checks.push({ name, status, detail });
  const marker = status === 'pass' ? 'PASS' : status === 'warn' ? 'WARN' : 'FAIL';
  console.log(`${marker} ${name}: ${detail}`);
}

function resolveBrowseRuntime() {
  const roots = [
    path.join(process.cwd(), '.agents', 'skills', 'gstack', 'browse', 'dist'),
    path.join(process.env.USERPROFILE || '', '.codex', 'skills', 'gstack', 'browse', 'dist'),
  ];

  for (const root of roots) {
    const browse = path.join(root, process.platform === 'win32' ? 'browse.exe' : 'browse');
    const server = path.join(root, 'server-node.mjs');
    if (fs.existsSync(browse) && fs.existsSync(server)) {
      return { browse, server };
    }
  }

  return null;
}

function runBrowse(runtime, args) {
  const result = spawnSync(runtime.browse, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BROWSE_SERVER_SCRIPT: runtime.server,
    },
    encoding: 'utf8',
    timeout: 120000,
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `${args.join(' ')} failed`).trim());
  }

  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

function normalizeConsoleOutput(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('--- BEGIN UNTRUSTED EXTERNAL CONTENT'))
    .filter((line) => !line.startsWith('--- END UNTRUSTED EXTERNAL CONTENT'));

  if (!lines.length || lines.some((line) => /\(no console errors\)/i.test(line))) {
    return { status: 'pass', detail: 'no console errors' };
  }

  const actionable = lines.filter((line) => !IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(line)));
  if (!actionable.length) {
    return { status: 'warn', detail: `ignored console output: ${lines.join(' | ')}` };
  }

  return { status: 'fail', detail: actionable.join(' | ') };
}

function parseNewTabId(raw) {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('empty newtab response');

  const firstJsonLine = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('{') && line.endsWith('}'));

  if (!firstJsonLine) {
    throw new Error(`unable to parse newtab response: ${trimmed}`);
  }

  const parsed = JSON.parse(firstJsonLine);
  const tabId = Number(parsed?.tabId);
  if (!Number.isFinite(tabId)) {
    throw new Error(`newtab response missing tabId: ${firstJsonLine}`);
  }

  return tabId;
}

function waitForBrowseLoad(runtime) {
  try {
    runBrowse(runtime, ['wait', '--load']);
  } catch {
    // Best effort. Some SPA transitions will still settle after goto.
  }

  try {
    runBrowse(runtime, ['wait', '--networkidle']);
  } catch {
    // Best effort. Long-lived connections should not block visual capture.
  }
}

function runVisualChecks(appUrl, outDir, checks) {
  const runtime = resolveBrowseRuntime();
  if (!runtime) {
    record(checks, 'visual_browser_runtime', 'warn', 'gstack browse binary not found; skipped automated iOS/Android screenshots');
    return [];
  }

  const visualArtifacts = [];

  for (const device of VISUAL_DEVICES) {
    runBrowse(runtime, ['viewport', `${device.width}x${device.height}`, '--scale', String(device.scale)]);

    for (const route of VISUAL_ROUTES) {
      const url = toAbsoluteUrl(appUrl, route.path);
      const screenshotPath = path.join(outDir, `${route.id}-${device.id}.png`);
      const tabId = parseNewTabId(runBrowse(runtime, ['newtab', appUrl, '--json']));

      runBrowse(runtime, ['tab', String(tabId)]);
      runBrowse(runtime, ['console', '--clear']);
      runBrowse(runtime, ['goto', url]);
      waitForBrowseLoad(runtime);
      runBrowse(runtime, ['screenshot', screenshotPath]);

      const consoleResult = normalizeConsoleOutput(runBrowse(runtime, ['console', '--errors']));
      const routeText = runBrowse(runtime, ['text']);
      const blockedTextMatch = BLOCKED_VISUAL_TEXT_PATTERNS.find((entry) => entry.pattern.test(routeText));
      const screenshotExists = fs.existsSync(screenshotPath);
      const checkStatus =
        !screenshotExists
          ? 'fail'
          : blockedTextMatch
            ? 'fail'
            : consoleResult.status === 'fail'
              ? 'fail'
              : consoleResult.status === 'warn'
                ? 'warn'
                : 'pass';
      const contentDetail = blockedTextMatch ? `content=${blockedTextMatch.reason}` : 'content=route text loaded';

      record(
        checks,
        `visual_${route.id}_${device.id}`,
        checkStatus,
        `${route.label} on ${device.label}; screenshot=${path.relative(process.cwd(), screenshotPath)}; console=${consoleResult.detail}; ${contentDetail}`,
      );

      visualArtifacts.push({
        route: route.id,
        routeLabel: route.label,
        device: device.id,
        deviceLabel: device.label,
        path: screenshotPath,
        consoleStatus: consoleResult.status,
        consoleDetail: consoleResult.detail,
        contentStatus: blockedTextMatch ? 'fail' : 'pass',
        contentDetail,
      });

      runBrowse(runtime, ['closetab', String(tabId)]);
    }
  }

  return visualArtifacts;
}

async function runAuthenticatedChecks(appUrl, runtimeEnv, checks) {
  const supabaseUrl = String(runtimeEnv?.VITE_SUPABASE_URL || '').trim();
  const supabaseKey = String(runtimeEnv?.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

  if (!supabaseUrl || !supabaseKey) {
    record(checks, 'auth_supabase_runtime_env', 'fail', 'missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
    return;
  }

  let accessToken = '';

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;

    accessToken = data?.session?.access_token ?? '';
    record(
      checks,
      'auth_anonymous_session',
      accessToken ? 'pass' : 'fail',
      accessToken ? 'anonymous Supabase session created' : 'missing anonymous access token',
    );
  } catch (error) {
    record(checks, 'auth_anonymous_session', 'fail', error?.message ?? String(error));
    return;
  }

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const { response, json } = await fetchJsonWithStatus(`${appUrl}/api/world/nonce`, {
      method: 'POST',
      headers: authHeaders,
      body: '{}',
    });
    const hasNoncePayload = Boolean(json?.nonce && json?.requestId && json?.expirationTime);
    record(
      checks,
      'auth_POST_/api/world/nonce',
      response.status === 200 && hasNoncePayload ? 'pass' : 'fail',
      `status=${response.status} payload=${hasNoncePayload ? 'nonce issued' : 'invalid nonce payload'}`,
    );
  } catch (error) {
    record(checks, 'auth_POST_/api/world/nonce', 'fail', error?.message ?? String(error));
  }

  try {
    const { response, json } = await fetchJsonWithStatus(`${appUrl}/api/world/rp-signature`, {
      method: 'POST',
      headers: authHeaders,
      body: '{}',
    });
    const hasSignaturePayload = Boolean(json?.rp_id && json?.action && (json?.sig || json?.signature || json?.payload));
    record(
      checks,
      'auth_POST_/api/world/rp-signature',
      response.status === 200 && hasSignaturePayload ? 'pass' : 'fail',
      `status=${response.status} payload=${hasSignaturePayload ? 'signed' : 'invalid signature payload'}`,
    );
  } catch (error) {
    record(checks, 'auth_POST_/api/world/rp-signature', 'fail', error?.message ?? String(error));
  }

  try {
    const { response, json } = await fetchJsonWithStatus(`${appUrl}/api/world/quickplay/state`, {
      method: 'GET',
      headers: authHeaders,
    });
    const gates = json?.gates ?? {};
    const expectedUnbound =
      gates.walletBound === false && gates.canOpenRoom === false && gates.canEnterRanked === false;
    const competitive = json?.competitive ?? {};
    const competitiveReady =
      competitive?.rankedGate?.status === 'wallet_required' &&
      Array.isArray(competitive?.games) &&
      competitive.games.length >= 5 &&
      Array.isArray(competitive?.leaderboard) &&
      Array.isArray(competitive?.recentResults);
    record(
      checks,
      'auth_GET_/api/world/quickplay/state',
      response.status === 200 && json?.ok === true && expectedUnbound && competitiveReady ? 'pass' : 'fail',
      `status=${response.status} walletBound=${String(gates.walletBound)} canOpenRoom=${String(gates.canOpenRoom)} canEnterRanked=${String(gates.canEnterRanked)} competitiveGate=${competitive?.rankedGate?.status ?? '(none)'}`,
    );
  } catch (error) {
    record(checks, 'auth_GET_/api/world/quickplay/state', 'fail', error?.message ?? String(error));
  }

  try {
    const { response, json } = await fetchJsonWithStatus(`${appUrl}/api/world/quickplay`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        mode: 'ranked',
        gameKey: 'hex',
      }),
    });
    record(
      checks,
      'auth_POST_/api/world/quickplay_ranked_wallet_gate',
      response.status === 409 && json?.errorCode === 'world_wallet_required' ? 'pass' : 'fail',
      `status=${response.status} errorCode=${json?.errorCode ?? '(none)'}`,
    );
  } catch (error) {
    record(checks, 'auth_POST_/api/world/quickplay_ranked_wallet_gate', 'fail', error?.message ?? String(error));
  }

  try {
    const { response, json } = await fetchJsonWithStatus(`${appUrl}/api/world/quickplay`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        mode: 'resume-ranked',
      }),
    });
    record(
      checks,
      'auth_POST_/api/world/quickplay_resume_wallet_gate',
      response.status === 409 && json?.errorCode === 'world_wallet_required' ? 'pass' : 'fail',
      `status=${response.status} errorCode=${json?.errorCode ?? '(none)'}`,
    );
  } catch (error) {
    record(checks, 'auth_POST_/api/world/quickplay_resume_wallet_gate', 'fail', error?.message ?? String(error));
  }

  try {
    const { response, json } = await fetchJsonWithStatus(`${appUrl}/api/world/quickplay`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        mode: 'ranked-rematch',
      }),
    });
    record(
      checks,
      'auth_POST_/api/world/quickplay_rematch_wallet_gate',
      response.status === 409 && json?.errorCode === 'world_wallet_required' ? 'pass' : 'fail',
      `status=${response.status} errorCode=${json?.errorCode ?? '(none)'}`,
    );
  } catch (error) {
    record(checks, 'auth_POST_/api/world/quickplay_rematch_wallet_gate', 'fail', error?.message ?? String(error));
  }
}

async function generateQr(qrUrl, outDir, checks) {
  const qrPath = path.join(outDir, 'world-app-qa-url.svg');

  try {
    const qrModule = await import('qrcode');
    const qrcode = qrModule.default ?? qrModule;
    await qrcode.toFile(qrPath, qrUrl, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#101114',
        light: '#f7f9fc',
      },
    });

    record(checks, 'qr_svg', 'pass', qrPath);
  } catch (error) {
    record(checks, 'qr_svg', 'warn', `QR package unavailable: ${error?.message ?? error}`);
  }

  fs.writeFileSync(path.join(outDir, 'world-app-qa-url.txt'), `${qrUrl}\n`, 'utf8');

  try {
    const terminalModule = await import('qrcode-terminal');
    const terminal = terminalModule.default ?? terminalModule;
    terminal.generate(qrUrl, { small: true });
  } catch {
    // Terminal QR is convenience only. The SVG/text artifacts are the source of truth.
  }
}

function writeChecklist(outDir, appUrl, worldUrl, qrUrl, checks, visualArtifacts = []) {
  const hardFailures = checks.filter((check) => check.status === 'fail');
  const warnings = checks.filter((check) => check.status === 'warn');
  const visualRows = visualArtifacts.length
    ? visualArtifacts
        .map(
          (artifact) =>
            `| ${artifact.routeLabel} | ${artifact.deviceLabel} | ${path.relative(outDir, artifact.path)} | ${artifact.consoleStatus.toUpperCase()} | ${artifact.consoleDetail.replace(/\|/g, '\\|')} |`,
        )
        .join('\n')
    : '| Automated visual capture | n/a | not generated | WARN | Run with `--visual-check` on a machine with gstack browse installed. |';
  const checklist = `# BOARD World App Device QA Run

Generated: ${new Date().toISOString()}

## Target

- App origin: ${appUrl}
- World surface URL: ${worldUrl}
- QR handoff URL: ${qrUrl}

## Automated Preflight

| Check | Result | Detail |
| --- | --- | --- |
${checks.map((check) => `| ${check.name} | ${check.status.toUpperCase()} | ${String(check.detail).replace(/\|/g, '\\|')} |`).join('\n')}

## Automated Visual Matrix

| Route | Device | Screenshot | Console | Detail |
| --- | --- | --- | --- | --- |
${visualRows}

## Manual Device Matrix

Run this with the World App Dev Portal test QR when staging credentials are configured. The generated QR above is useful for direct tunnel inspection, but the release gate is the World App WebView container.

| Device | World App build | Result | Evidence |
| --- | --- | --- | --- |
| iOS physical device | Fill in | Pending | Screenshot/video |
| Android physical device | Fill in | Pending | Screenshot/video |

## Required Manual Cases

- Scan the World App Dev Portal test QR and confirm BOARD opens inside the World App WebView.
- Confirm the first screen shows "World seat", "Enter a human room.", "Quick ranked", and the bottom tabs.
- Tap "Bind World wallet" or ranked entry and confirm wallet auth opens in the World App flow.
- Complete wallet auth with staging credentials and confirm the profile shows wallet bound.
- Complete IDKit verification and confirm ranked status changes to human/verified.
- Attempt ranked entry before verification and confirm it is blocked with "Verify to enter ranked".
- Enter unranked room after wallet binding and confirm lobby navigation.
- Share a room and confirm native share sheet appears inside World App.
- Rotate or background the app, return, and confirm the console does not lose its bottom nav or lock the screen.
- Capture screenshots for Play, Rooms, Events, Profile, and the verification gate.

## Exit Criteria

- No unauthenticated World endpoint accepts a request.
- Runtime env includes Supabase and World public keys.
- iOS and Android both complete wallet binding.
- At least one device completes IDKit verification against staging.
- No raw wallet address is visible in user-facing UI.
- No prize, WLD, token, yield, or paid competitive copy appears in the World App surface.

## Current Gate

${summarizeGate(checks)}
`;

  fs.writeFileSync(path.join(outDir, 'device-qa-checklist.md'), checklist, 'utf8');
}

function summarizeGate(checks) {
  const hardFailures = checks.filter((check) => check.status === 'fail');
  const warnings = checks.filter((check) => check.status === 'warn');
  if (hardFailures.length) {
    return `Blocked by ${hardFailures.length} automated failure(s).`;
  }

  if (!warnings.length) {
    return 'Automated preflight passed. Manual device QA can proceed.';
  }

  const expectedBrowserWarnings = warnings.every((check) =>
    String(check.detail).includes('ignored console output:'),
  );
  if (expectedBrowserWarnings) {
    return `Automated preflight passed. ${warnings.length} warning(s) are expected browser-only MiniKit or preload output outside the World App WebView. Manual device QA can proceed.`;
  }

  return `Automated preflight passed with ${warnings.length} warning(s). Manual device QA can proceed.`;
}

function writePhysicalFreeze(outDir, manifest) {
  const deploymentId = manifest.deploymentId || 'not recorded';
  const jsAssets = manifest.bundleAssets?.js ?? [];
  const cssAssets = manifest.bundleAssets?.css ?? [];
  const markdown = `# BOARD World App Physical QA Freeze

Generated: ${manifest.generatedAt}

## Locked target

- App origin: \`${manifest.appUrl}\`
- World surface: \`${manifest.worldUrl}\`
- Deployment id: \`${deploymentId}\`

## Live asset fingerprints

### JavaScript
${jsAssets.length ? jsAssets.map((asset) => `- \`${asset}\``).join('\n') : '- not recorded'}

### CSS
${cssAssets.length ? cssAssets.map((asset) => `- \`${asset}\``).join('\n') : '- not recorded'}

## Frozen evidence bundle

- \`device-qa-report.html\`
- \`device-qa-checklist.md\`
- \`device-qa-manifest.json\`
- route screenshots for iPhone 15 and Pixel 8

## Manual gate rule

Do not use Expo Go, the normal mobile browser, or \`https://hexology.me\` as authoritative for this pass.
Use the World Developer Portal QR for the Railway origin above.
Do not redeploy during the physical device pass.
`;

  fs.writeFileSync(path.join(outDir, 'physical-qa-freeze.md'), markdown, 'utf8');
}

function writePhysicalResultsTemplate(outDir, manifest) {
  const markdown = `# BOARD World App Physical QA Results

Target deployment: \`${manifest.deploymentId || 'not recorded'}\`
App origin: \`${manifest.appUrl}\`
World surface: \`${manifest.worldUrl}\`

## Device inventory

| Device | Model | OS | World App version | Tester |
| --- | --- | --- | --- | --- |
| iPhone | Fill in | Fill in | Fill in | Fill in |
| Android | Fill in | Fill in | Fill in | Fill in |

## iPhone canonical pass

| Step | Result | Evidence | Notes |
| --- | --- | --- | --- |
| QR opens inside World App WebView | Pending |  |  |
| Play / Rooms / Events / Profile initial screens captured | Pending |  |  |
| Wallet bind succeeds | Pending |  |  |
| Ranked blocked before verification | Pending |  |  |
| IDKit verification succeeds | Pending |  |  |
| Ranked unlocks after verification | Pending |  |  |
| Unranked room opens or joins correctly | Pending |  |  |
| Native share sheet opens | Pending |  |  |
| Background / resume preserves session and bottom nav | Pending |  |  |

## Android compatibility pass

| Step | Result | Evidence | Notes |
| --- | --- | --- | --- |
| QR opens inside World App WebView | Pending |  |  |
| Play / Rooms / Events / Profile initial screens captured | Pending |  |  |
| Wallet bind succeeds | Pending |  |  |
| Ranked remains correctly gated if verification is not repeated | Pending |  |  |
| Unranked room opens or joins correctly | Pending |  |  |
| Native share sheet opens | Pending |  |  |
| Background / resume preserves session and bottom nav | Pending |  |  |

## Required evidence

- \`YYYYMMDD-ios-play.png\`
- \`YYYYMMDD-ios-profile-wallet-bound.png\`
- \`YYYYMMDD-ios-ranked-blocked.png\`
- \`YYYYMMDD-ios-profile-verified.png\`
- \`YYYYMMDD-ios-room-share-sheet.png\`
- \`YYYYMMDD-android-play.png\`
- \`YYYYMMDD-android-profile-wallet-bound.png\`
- \`YYYYMMDD-android-ranked-blocked.png\`
- \`YYYYMMDD-android-room-share-sheet.png\`
- one short iPhone video for wallet bind or IDKit proof

## Release decision

- Final result: Pending
- Blockers found: Fill in
- Follow-up issues created: Fill in
`;

  fs.writeFileSync(path.join(outDir, 'physical-qa-results-template.md'), markdown, 'utf8');
}

function writePhysicalFailureTemplate(outDir, manifest) {
  const markdown = `# BOARD World App Physical QA Failure Report

Target deployment: \`${manifest.deploymentId || 'not recorded'}\`
App origin: \`${manifest.appUrl}\`

## Failure summary

- Failure type:
- Device:
- OS:
- World App version:
- Step number:
- Exact screen:

## Reproduction

1. 
2. 
3. 

## Expected

- 

## Actual

- 

## Evidence

- Screenshot path:
- Video path:
- Whether retry after relaunch changes the result:

## Release impact

- Blocks REF-109: Yes / No
- Suggested follow-up issue:
`;

  fs.writeFileSync(path.join(outDir, 'physical-qa-failure-template.md'), markdown, 'utf8');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function relativeAssetPath(outDir, targetPath) {
  return path.relative(outDir, targetPath).split(path.sep).join('/');
}

function writeHtmlReport(outDir, manifest) {
  const checks = manifest.checks ?? [];
  const visualArtifacts = manifest.visualArtifacts ?? [];
  const hardFailures = checks.filter((check) => check.status === 'fail');
  const warnings = checks.filter((check) => check.status === 'warn');
  const overallStatus = hardFailures.length ? 'Blocked' : warnings.length ? 'Manual device QA ready' : 'Ready';
  const gateSummary = summarizeGate(checks);
  const jsAssets = manifest.bundleAssets?.js ?? [];
  const cssAssets = manifest.bundleAssets?.css ?? [];

  const groupedVisuals = new Map();
  for (const artifact of visualArtifacts) {
    const key = artifact.route;
    const list = groupedVisuals.get(key) ?? [];
    list.push(artifact);
    groupedVisuals.set(key, list);
  }

  const visualSections = visualArtifacts.length
    ? [...groupedVisuals.values()]
        .map((artifacts) => {
          const label = artifacts[0]?.routeLabel ?? artifacts[0]?.route ?? 'Route';
          const cards = artifacts
            .map((artifact) => {
              const relativePath = relativeAssetPath(outDir, artifact.path);
              return `
                <figure class="qa-shot">
                  <img src="${escapeHtml(relativePath)}" alt="${escapeHtml(`${label} on ${artifact.deviceLabel}`)}" loading="lazy" />
                  <figcaption>
                    <strong>${escapeHtml(artifact.deviceLabel)}</strong>
                    <span>${escapeHtml(artifact.consoleStatus.toUpperCase())}</span>
                    <small>${escapeHtml(artifact.consoleDetail)}</small>
                  </figcaption>
                </figure>
              `;
            })
            .join('');

          return `
            <section class="qa-route">
              <header>
                <h3>${escapeHtml(label)}</h3>
              </header>
              <div class="qa-grid">
                ${cards}
              </div>
            </section>
          `;
        })
        .join('')
    : '<section class="qa-route"><p>No automated screenshots were generated for this run.</p></section>';

  const checkRows = checks
    .map(
      (check) => `
        <tr>
          <td>${escapeHtml(check.name)}</td>
          <td><span class="status status-${escapeHtml(check.status)}">${escapeHtml(check.status.toUpperCase())}</span></td>
          <td>${escapeHtml(check.detail)}</td>
        </tr>
      `,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BOARD World App Device QA Report</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f6f2;
        --surface: #ffffff;
        --surface-muted: #f0eee8;
        --ink: #101114;
        --ink-muted: #5c5f66;
        --line: rgba(16, 17, 20, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--ink);
        font: 14px/1.5 "IBM Plex Sans", system-ui, sans-serif;
      }
      main {
        width: min(1160px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 40px 0 56px;
      }
      .hero, .panel, .qa-route {
        background: var(--surface);
        border-radius: 22px;
        padding: 24px;
      }
      .hero {
        display: grid;
        gap: 16px;
        margin-bottom: 20px;
      }
      h1, h2, h3, p {
        margin: 0;
      }
      h1 { font: 600 28px/1.1 "IBM Plex Sans", system-ui, sans-serif; }
      h2 { font: 600 18px/1.2 "IBM Plex Sans", system-ui, sans-serif; }
      h3 { font: 600 16px/1.2 "IBM Plex Sans", system-ui, sans-serif; }
      .hero-meta, .summary-grid, .check-grid {
        display: grid;
        gap: 12px;
      }
      .hero-meta {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .summary-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin-bottom: 20px;
      }
      .summary-card {
        background: var(--surface);
        border-radius: 18px;
        padding: 18px 20px;
      }
      .summary-card strong {
        display: block;
        font: 600 24px/1.1 "IBM Plex Sans", system-ui, sans-serif;
        margin-top: 6px;
      }
      .panel {
        margin-bottom: 20px;
      }
      .panel + .panel {
        margin-top: 20px;
      }
      .status {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 999px;
        font: 600 11px/1 "IBM Plex Sans", system-ui, sans-serif;
        letter-spacing: 0.08em;
      }
      .status-pass, .status-warn {
        background: #101114;
        color: #fff;
      }
      .status-fail {
        background: #fff;
        color: #101114;
        outline: 1px solid rgba(16, 17, 20, 0.22);
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        text-align: left;
        vertical-align: top;
        padding: 12px 0;
        border-bottom: 1px solid var(--line);
      }
      th {
        color: var(--ink-muted);
        font: 600 12px/1.1 "IBM Plex Sans", system-ui, sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .qa-route {
        margin-bottom: 20px;
      }
      .qa-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 14px;
        margin-top: 16px;
      }
      .qa-shot {
        margin: 0;
        display: grid;
        gap: 10px;
      }
      .qa-shot img {
        width: 100%;
        display: block;
        border-radius: 18px;
        background: var(--surface-muted);
      }
      figcaption {
        display: grid;
        gap: 4px;
        color: var(--ink-muted);
      }
      figcaption strong {
        color: var(--ink);
      }
      code {
        font: 500 12px/1.4 "IBM Plex Mono", ui-monospace, monospace;
      }
      ul {
        margin: 14px 0 0;
        padding-left: 18px;
      }
      li + li {
        margin-top: 8px;
      }
      a {
        color: inherit;
      }
      @media (max-width: 720px) {
        main {
          width: min(100vw - 20px, 100%);
          padding-top: 20px;
        }
        .hero, .panel, .qa-route {
          border-radius: 18px;
          padding: 18px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <span class="status ${hardFailures.length ? 'status-fail' : 'status-pass'}">${escapeHtml(overallStatus)}</span>
        <h1>BOARD World App Device QA Report</h1>
        <p>${escapeHtml(gateSummary)}</p>
        <div class="hero-meta">
          <div>
            <h2>App origin</h2>
            <p><a href="${escapeHtml(manifest.appUrl)}">${escapeHtml(manifest.appUrl)}</a></p>
          </div>
          <div>
            <h2>World surface</h2>
            <p><a href="${escapeHtml(manifest.worldUrl)}">${escapeHtml(manifest.worldUrl)}</a></p>
          </div>
          <div>
            <h2>Generated</h2>
            <p>${escapeHtml(manifest.generatedAt)}</p>
          </div>
          <div>
            <h2>Deployment</h2>
            <p><code>${escapeHtml(manifest.deploymentId || 'not recorded')}</code></p>
          </div>
        </div>
      </section>

      <section class="summary-grid">
        <article class="summary-card">
          <span>Automated checks</span>
          <strong>${checks.length}</strong>
        </article>
        <article class="summary-card">
          <span>Hard failures</span>
          <strong>${hardFailures.length}</strong>
        </article>
        <article class="summary-card">
          <span>Warnings</span>
          <strong>${warnings.length}</strong>
        </article>
        <article class="summary-card">
          <span>Screenshots</span>
          <strong>${visualArtifacts.length}</strong>
        </article>
      </section>

      <section class="panel">
        <h2>Manual device gate</h2>
        <ul>
          <li>Use the World Developer Portal QR for the same Railway origin, not the browser QR alone.</li>
          <li>Confirm iOS and Android both open inside the World App WebView.</li>
          <li>Verify wallet bind, IDKit, ranked gate, room share, and background/resume behavior on real devices.</li>
          <li>Attach raw screenshots and screen recordings without cropping out World App chrome.</li>
        </ul>
      </section>

      <section class="panel">
        <h2>Frozen build</h2>
        <table>
          <thead>
            <tr>
              <th>Asset type</th>
              <th>Paths</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>JavaScript</td>
              <td>${jsAssets.length ? jsAssets.map((asset) => `<code>${escapeHtml(asset)}</code>`).join('<br />') : 'not recorded'}</td>
            </tr>
            <tr>
              <td>CSS</td>
              <td>${cssAssets.length ? cssAssets.map((asset) => `<code>${escapeHtml(asset)}</code>`).join('<br />') : 'not recorded'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h2>Automated checks</h2>
        <table>
          <thead>
            <tr>
              <th>Check</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            ${checkRows}
          </tbody>
        </table>
      </section>

      ${visualSections}
    </main>
  </body>
</html>
`;

  fs.writeFileSync(path.join(outDir, 'device-qa-report.html'), html, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fileEnv = parseEnvFile(path.join(process.cwd(), '.env'));
  const appUrl = normalizeOrigin(
    args.appUrl ||
      firstEnv(fileEnv, [
        'WORLD_QA_APP_URL',
        'SMOKE_WORLD_APP_URL',
        'VITE_PUBLIC_APP_URL',
        'PUBLIC_APP_URL',
        'APP_URL',
      ]),
  );

  if (!appUrl) {
    throw new Error('Missing app URL. Pass the URL as the first argument or set WORLD_QA_APP_URL.');
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(args.outDir || path.join('store_assets', 'world', 'qa', runId));
  fs.mkdirSync(outDir, { recursive: true });

  const worldUrl = `${appUrl}/?surface=world`;
  const qrUrl = args.qrUrl || firstEnv(fileEnv, ['WORLD_QA_QR_URL']) || worldUrl;
  const checks = [];

  if (new URL(appUrl).protocol === 'https:' || isLocalOrigin(appUrl)) {
    record(checks, 'public_url_protocol', 'pass', appUrl);
  } else {
    record(checks, 'public_url_protocol', 'warn', 'World App review requires HTTPS for non-local testing.');
  }

  let worldHtml = '';
  let runtimeEnv = null;
  let bundleAssets = { js: [], css: [] };
  if (!args.visualOnly) {
    try {
      const health = await fetchJson(`${appUrl}/api/health`);
      record(checks, 'health', health.ok ? 'pass' : 'fail', JSON.stringify(health));
      record(
        checks,
        'world_server_config',
        health.hasWorldAppConfig ? 'pass' : 'fail',
        `hasWorldAppConfig=${Boolean(health.hasWorldAppConfig)}`,
      );
    } catch (error) {
      record(checks, 'health', 'fail', error?.message ?? String(error));
    }

    try {
      const result = await fetchText(worldUrl);
      worldHtml = result.text;
      record(checks, 'world_surface_html', result.response.ok ? 'pass' : 'fail', `status=${result.response.status}`);
    } catch (error) {
      record(checks, 'world_surface_html', 'fail', error?.message ?? String(error));
    }

    try {
      runtimeEnv = extractRuntimeEnv(worldHtml);
      const missing = REQUIRED_RUNTIME_KEYS.filter((key) => !String(runtimeEnv[key] || '').trim());
      record(
        checks,
        'runtime_env',
        missing.length ? 'fail' : 'pass',
        missing.length ? `missing=${missing.join(', ')}` : REQUIRED_RUNTIME_KEYS.join(', '),
      );
    } catch (error) {
      record(checks, 'runtime_env', 'fail', error?.message ?? String(error));
    }

    if (args.authCheck) {
      await runAuthenticatedChecks(appUrl, runtimeEnv, checks);
    }

    try {
      bundleAssets = extractAssetUrls(appUrl, worldHtml);
      const assetText = (await Promise.all(bundleAssets.js.map((url) => fetchText(url).then((result) => result.text)))).join('\n');
      const missing = WORLD_BUNDLE_LABELS.filter((label) => !assetText.includes(label));
      record(
        checks,
        'world_bundle_labels',
        missing.length ? 'fail' : 'pass',
        missing.length ? `missing=${missing.join(', ')}` : `${WORLD_BUNDLE_LABELS.length} labels found`,
      );
    } catch (error) {
      record(checks, 'world_bundle_labels', 'fail', error?.message ?? String(error));
    }

    for (const endpoint of WORLD_ENDPOINTS) {
      try {
        const { response } = await fetchText(`${appUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'content-type': 'application/json' },
          body: endpoint.method === 'POST' ? '{}' : undefined,
        });
        record(
          checks,
          `${endpoint.method}_${endpoint.path}_rejects_unauthenticated`,
          response.status === 401 ? 'pass' : 'fail',
          `status=${response.status}`,
        );
      } catch (error) {
        record(checks, `${endpoint.method}_${endpoint.path}_rejects_unauthenticated`, 'fail', error?.message ?? String(error));
      }
    }
  } else {
    record(checks, 'visual_only_mode', 'pass', 'Skipped API/runtime endpoint preflight and captured route visuals only.');
  }

  const visualArtifacts = args.visualCheck ? runVisualChecks(appUrl, outDir, checks) : [];

  await generateQr(qrUrl, outDir, checks);

  const manifest = {
    generatedAt: new Date().toISOString(),
    appUrl,
    worldUrl,
    qrUrl,
    deploymentId: args.deploymentId,
    bundleAssets,
    checks,
    visualArtifacts,
  };

  fs.writeFileSync(path.join(outDir, 'device-qa-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeChecklist(outDir, appUrl, worldUrl, qrUrl, checks, visualArtifacts);
  writeHtmlReport(outDir, manifest);
  writePhysicalFreeze(outDir, manifest);
  writePhysicalResultsTemplate(outDir, manifest);
  writePhysicalFailureTemplate(outDir, manifest);

  const failed = checks.filter((check) => check.status === 'fail');
  console.log(`QA artifacts: ${outDir}`);

  if (failed.length) {
    throw new Error(`${failed.length} World App device preflight check(s) failed.`);
  }
}

main().catch((error) => {
  console.error(`WORLD DEVICE QA FAILED: ${error?.message ?? error}`);
  process.exitCode = 1;
});
