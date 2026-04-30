import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_METADATA_PATH = 'store_assets/APP_STORE_METADATA.md';
const DEFAULT_REVIEW_NOTES_PATH = 'store_assets/world/REVIEW_NOTES.md';
const DEFAULT_SCREENSHOTS_DIR = 'store_assets/world/screenshots';
const DEFAULT_QA_ROOT = 'store_assets/world/qa';
const DEFAULT_OUTPUT_DIR = 'store_assets/world/submission';
const REQUIRED_SCREENSHOT_SUFFIXES = [
  'ios-play.png',
  'ios-profile-wallet-bound.png',
  'ios-ranked-blocked.png',
  'ios-profile-verified.png',
  'ios-room-share-sheet.png',
  'android-play.png',
  'android-profile-wallet-bound.png',
  'android-ranked-blocked.png',
  'android-room-share-sheet.png',
];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm'];
const BANNED_TERMS = [
  /\bofficial\b/i,
  /\bseamless\b/i,
  /\bempower\b/i,
  /\brevolutionary\b/i,
  /\bearn\b/i,
  /\byield\b/i,
  /\breward/i,
  /\bprize\b/i,
  /\bWLD\b/i,
  /\btoken\b/i,
  /\bpresale\b/i,
];

function sanitizePolicyCopy(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line)
    .filter((line) => {
      if (/^\s*(-\s*)?(no|avoid|do not use|board does not include)\b/i.test(line)) return false;
      if (/\b(do not use|does not include)\b/i.test(line)) return false;
      if (/^avoid:\s*$/i.test(line)) return false;
      if (/^\*\*App Name\*\*:/i.test(line)) return true;
      if (/^\*\*Category\*\*:/i.test(line)) return true;
      if (/^\*\*Positioning\*\*:/i.test(line)) return true;
      return true;
    })
    .join('\n');
}

function parseArgs(argv) {
  const args = {
    qaDir: '',
    outputDir: DEFAULT_OUTPUT_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--qa-dir') {
      args.qaDir = argv[index + 1] || '';
      index += 1;
    } else if (value === '--out') {
      args.outputDir = argv[index + 1] || args.outputDir;
      index += 1;
    }
  }

  return args;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function findLatestQaDir(rootDir) {
  const absoluteRoot = path.resolve(rootDir);
  if (!fs.existsSync(absoluteRoot)) {
    throw new Error(`QA root missing: ${rootDir}`);
  }

  const entries = fs
    .readdirSync(absoluteRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('railway-production-mobile-visual-auth-'))
    .map((entry) => entry.name)
    .sort();

  if (!entries.length) {
    throw new Error(`No QA bundle found under ${rootDir}`);
  }

  return path.join(rootDir, entries[entries.length - 1]);
}

function extractBoldValue(content, label) {
  const match = content.match(new RegExp(`\\*\\*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*:\\s*(.+)`));
  return match?.[1]?.trim() || '';
}

function extractSection(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`##\\s+${escaped}\\s*\\n\\n([\\s\\S]*?)(?=\\n##\\s+|$)`));
  return match?.[1]?.trim() || '';
}

function extractBullets(section) {
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function extractOrdered(section) {
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, '').trim());
}

function parseMetadata(filePath) {
  const content = readText(filePath);
  return {
    filePath,
    content,
    appName: extractBoldValue(content, 'App Name'),
    category: extractBoldValue(content, 'Category'),
    positioning: extractBoldValue(content, 'Positioning'),
    supportUrl: extractBoldValue(content, 'Support URL'),
    privacyUrl: extractBoldValue(content, 'Privacy Policy URL'),
    termsUrl: extractBoldValue(content, 'Terms URL'),
    shortDescription: extractSection(content, 'Short Description'),
    fullDescription: extractSection(content, 'Full Description'),
    reviewNotes: extractSection(content, 'Review Notes'),
    screenshotOrder: extractOrdered(extractSection(content, 'Screenshot Order')),
    copyRulesUse: extractBullets(extractSection(content, 'Copy Rules').split('Avoid:')[0] || ''),
    copyRulesAvoid: extractBullets(content.match(/Avoid:\s*\n([\s\S]*)$/)?.[1] || ''),
  };
}

function parseReviewNotes(filePath) {
  const content = readText(filePath);
  return {
    filePath,
    content,
    appPosition: extractSection(content, 'App Position'),
    v1Scope: extractBullets(extractSection(content, 'V1 Scope')),
    explicitNonScope: extractBullets(extractSection(content, 'Explicit Non-Scope')),
    reviewCopy: extractSection(content, 'Review Copy'),
    qaEvidence: extractBullets(extractSection(content, 'QA Evidence To Attach')),
  };
}

function parseResults(resultsPath) {
  const content = readText(resultsPath);
  const pendingCount = (content.match(/\bPending\b/g) || []).length;
  const fillInCount = (content.match(/\bFill in\b/g) || []).length;
  const finalResultMatch = content.match(/- Final result:\s*(.+)/);
  const blockersMatch = content.match(/- Blockers found:\s*(.+)/);
  const followUpsMatch = content.match(/- Follow-up issues created:\s*(.+)/);
  const resultValue = finalResultMatch?.[1]?.trim() || '';

  return {
    filePath: resultsPath,
    content,
    pendingCount,
    fillInCount,
    finalResult: resultValue,
    blockers: blockersMatch?.[1]?.trim() || '',
    followUps: followUpsMatch?.[1]?.trim() || '',
    isCompleted:
      pendingCount === 0 &&
      fillInCount === 0 &&
      /^pass(ed)?$/i.test(resultValue) &&
      !/^fill in$/i.test(blockersMatch?.[1]?.trim() || '') &&
      !/^fill in$/i.test(followUpsMatch?.[1]?.trim() || ''),
  };
}

function collectScreenshotEvidence(dirPath) {
  const absoluteDir = path.resolve(dirPath);
  const files = fs.existsSync(absoluteDir)
    ? fs.readdirSync(absoluteDir).filter((entry) => fs.statSync(path.join(absoluteDir, entry)).isFile())
    : [];

  const screenshots = REQUIRED_SCREENSHOT_SUFFIXES.map((suffix) => {
    const match = files.find((file) => file.endsWith(suffix));
    return {
      suffix,
      found: Boolean(match),
      fileName: match || '',
      relativePath: match ? normalizePath(path.join(dirPath, match)) : '',
    };
  });

  const videos = files.filter((file) => {
    const lower = file.toLowerCase();
    return lower.includes('ios') && VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
  });

  return {
    screenshots,
    videos: videos.map((fileName) => ({
      fileName,
      relativePath: normalizePath(path.join(dirPath, fileName)),
    })),
  };
}

function validateSubmission(metadata, reviewNotes, results, evidence, qaManifest) {
  const blockers = [];

  if (metadata.appName !== 'BOARD') {
    blockers.push(`submission name must be BOARD; found "${metadata.appName || '(missing)'}"`);
  }

  const reviewContent = sanitizePolicyCopy(
    [
      metadata.appName,
      metadata.category,
      metadata.positioning,
      metadata.shortDescription,
      metadata.fullDescription,
      reviewNotes.appPosition,
      reviewNotes.reviewCopy,
    ].join('\n'),
  );
  const bannedMatches = BANNED_TERMS.filter((pattern) => pattern.test(reviewContent)).map((pattern) => pattern.source);
  if (bannedMatches.length) {
    blockers.push(`submission copy contains banned terms: ${bannedMatches.join(', ')}`);
  }

  if (!metadata.shortDescription || !metadata.fullDescription) {
    blockers.push('submission metadata is missing short or full description');
  }

  if (!metadata.supportUrl || !metadata.privacyUrl || !metadata.termsUrl) {
    blockers.push('support, privacy, and terms URLs must all be present');
  }

  if (!results.isCompleted) {
    blockers.push('physical QA results template is not complete');
  }

  for (const screenshot of evidence.screenshots) {
    if (!screenshot.found) {
      blockers.push(`missing required screenshot matching *${screenshot.suffix}`);
    }
  }

  if (!evidence.videos.length) {
    blockers.push('missing required iPhone wallet-bind or IDKit proof video');
  }

  if (!qaManifest?.deploymentId) {
    blockers.push('QA manifest is missing locked deployment id');
  }

  return blockers;
}

function writeJson(outputDir, payload) {
  const target = path.join(outputDir, 'world-app-submission-packet.json');
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return target;
}

function writeMarkdown(outputDir, payload) {
  const target = path.join(outputDir, 'world-app-submission-packet.md');
  const screenshotLines = payload.evidence.screenshots
    .map((entry) => `- ${entry.found ? '`' + entry.relativePath + '`' : `missing (*${entry.suffix})`}`)
    .join('\n');
  const videoLines = payload.evidence.videos.length
    ? payload.evidence.videos.map((entry) => `- \`${entry.relativePath}\``).join('\n')
    : '- missing';
  const blockerLines = payload.blockers.length ? payload.blockers.map((item) => `- ${item}`).join('\n') : '- none';

  const markdown = `# BOARD World App Submission Packet

Status: ${payload.ready ? 'READY' : 'BLOCKED'}

## Locked target

- App origin: \`${payload.qa.appUrl}\`
- World surface: \`${payload.qa.worldUrl}\`
- Deployment id: \`${payload.qa.deploymentId || 'not recorded'}\`
- QA bundle: \`${payload.qa.qaDir}\`

## Submission fields

- App name: \`${payload.metadata.appName}\`
- Category: \`${payload.metadata.category}\`
- Positioning: ${payload.metadata.positioning}
- Support URL: ${payload.metadata.supportUrl}
- Privacy Policy URL: ${payload.metadata.privacyUrl}
- Terms URL: ${payload.metadata.termsUrl}

### Short description

${payload.metadata.shortDescription}

### Full description

${payload.metadata.fullDescription}

## Review notes

${payload.reviewNotes.appPosition}

### V1 scope
${payload.reviewNotes.v1Scope.map((item) => `- ${item}`).join('\n')}

### Explicit non-scope
${payload.reviewNotes.explicitNonScope.map((item) => `- ${item}`).join('\n')}

## Physical QA

- Results file: \`${payload.results.filePath}\`
- Final result: ${payload.results.finalResult || 'missing'}
- Pending markers remaining: ${payload.results.pendingCount}
- Fill-in markers remaining: ${payload.results.fillInCount}

## Evidence inventory

### Screenshots
${screenshotLines}

### Videos
${videoLines}

## Screenshot order for portal
${payload.metadata.screenshotOrder.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Blockers
${blockerLines}
`;

  fs.writeFileSync(target, markdown, 'utf8');
  return target;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const qaDir = args.qaDir || findLatestQaDir(DEFAULT_QA_ROOT);
  const outputDir = path.resolve(args.outputDir);
  ensureDir(outputDir);

  const metadata = parseMetadata(DEFAULT_METADATA_PATH);
  const reviewNotes = parseReviewNotes(DEFAULT_REVIEW_NOTES_PATH);
  const resultsPath = path.join(qaDir, 'physical-qa-results-template.md');
  const manifestPath = path.join(qaDir, 'device-qa-manifest.json');
  const results = parseResults(resultsPath);
  const evidence = collectScreenshotEvidence(DEFAULT_SCREENSHOTS_DIR);
  const qaManifest = JSON.parse(readText(manifestPath));
  const blockers = validateSubmission(metadata, reviewNotes, results, evidence, {
    ...qaManifest,
    qaDir: normalizePath(qaDir),
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    ready: blockers.length === 0,
    blockers,
    metadata: {
      ...metadata,
      filePath: normalizePath(metadata.filePath),
    },
    reviewNotes: {
      ...reviewNotes,
      filePath: normalizePath(reviewNotes.filePath),
    },
    results: {
      ...results,
      filePath: normalizePath(results.filePath),
    },
    evidence,
    qa: {
      qaDir: normalizePath(qaDir),
      appUrl: qaManifest.appUrl,
      worldUrl: qaManifest.worldUrl,
      deploymentId: qaManifest.deploymentId || '',
      bundleAssets: qaManifest.bundleAssets || { js: [], css: [] },
      reportPath: normalizePath(path.join(qaDir, 'device-qa-report.html')),
      freezePath: normalizePath(path.join(qaDir, 'physical-qa-freeze.md')),
      failureTemplatePath: normalizePath(path.join(qaDir, 'physical-qa-failure-template.md')),
    },
  };

  const jsonPath = writeJson(outputDir, payload);
  const markdownPath = writeMarkdown(outputDir, payload);

  console.log(`${payload.ready ? 'READY' : 'BLOCKED'} world submission packet`);
  console.log(`JSON: ${normalizePath(path.relative(process.cwd(), jsonPath))}`);
  console.log(`Markdown: ${normalizePath(path.relative(process.cwd(), markdownPath))}`);

  if (blockers.length) {
    for (const blocker of blockers) {
      console.log(`- ${blocker}`);
    }
    process.exitCode = 1;
  }
}

main();
