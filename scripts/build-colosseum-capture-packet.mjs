import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function required(args, key) {
  const value = args[key];
  if (!value) {
    throw new Error(`Missing required argument --${key}`);
  }
  return value;
}

function buildRoutes(origin, tournamentId) {
  return [
    `${origin}/?surface=world`,
    `${origin}/tournament/${tournamentId}`,
    `${origin}/?surface=world&tab=profile`,
  ];
}

function buildFiles() {
  return [
    "01-world-home-event-card.png",
    "02-wallet-linked.png",
    "03-event-pass-activated.png",
    "04-event-pass-blocked-state.png",
    "05-event-joined.png",
    "06-event-bracket-open.png",
    "07-profile-event-receipt.png",
    "08-ranked-fallback.png",
  ];
}

async function writeFile(target, contents) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents, "utf8");
}

function buildManifest({
  origin,
  tournamentId,
  eventName,
  gameKey,
  accountLabel,
  createdAt,
}) {
  return {
    createdAt,
    origin,
    tournamentId,
    eventName,
    gameKey,
    accountLabel,
    routes: buildRoutes(origin, tournamentId),
    files: buildFiles(),
    acceptance: [
      "World human verification is visible or preserved in state",
      "Solana wallet is linked before event pass activation",
      "Tournament access is blocked before pass activation",
      "Tournament join succeeds after pass activation",
      "Competitive profile shows an event-linked receipt",
      "No token, prize, or speculative economy language appears",
    ],
  };
}

function buildChecklist(manifest) {
  const routeList = manifest.routes.map((route) => `- ${route}`).join("\n");
  const fileList = manifest.files.map((file) => `- [ ] ${file}`).join("\n");
  return `# Colosseum Capture Checklist

Created: ${manifest.createdAt}

## Event

- Tournament id: \`${manifest.tournamentId}\`
- Event name: ${manifest.eventName}
- Game: \`${manifest.gameKey}\`
- Account: ${manifest.accountLabel}

## Routes

${routeList}

## Screenshots

${fileList}

## Manual checks

- [ ] World wallet is bound
- [ ] Human verification is present
- [ ] Solana wallet is linked
- [ ] Event pass can be activated
- [ ] Tournament join is blocked before the pass
- [ ] Tournament join succeeds after the pass
- [ ] Bracket or event-open state is visible
- [ ] Profile shows event-linked receipt
- [ ] No token, prize, or yield language appears
`;
}

function buildResultsTemplate(manifest) {
  return `# Colosseum Capture Results

Created: ${manifest.createdAt}

## Summary

- Tournament id: \`${manifest.tournamentId}\`
- Event name: ${manifest.eventName}
- Game: \`${manifest.gameKey}\`
- Account: ${manifest.accountLabel}
- Origin: ${manifest.origin}

## Results

| Step | Status | Notes |
| --- | --- | --- |
| World home event card | PENDING |  |
| Wallet linked | PENDING |  |
| Event pass activated | PENDING |  |
| Pass-blocked event state | PENDING |  |
| Event joined | PENDING |  |
| Bracket open | PENDING |  |
| Profile event receipt | PENDING |  |

## Fallback

- Ranked fallback used: NO
- Reason:

## Reviewer Notes

- 
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tournamentId = required(args, "tournament-id");
  const eventName = required(args, "event-name");
  const gameKey = required(args, "game");
  const origin = args.origin ?? "https://botbot-production-38b3.up.railway.app";
  const accountLabel = args.account ?? "qa+player@board.test";
  const createdAt = new Date().toISOString();
  const outDir =
    args.out ??
    path.join(
      process.cwd(),
      "store_assets",
      "colosseum",
      "capture",
      tournamentId,
    );

  const manifest = buildManifest({
    origin,
    tournamentId,
    eventName,
    gameKey,
    accountLabel,
    createdAt,
  });

  await fs.mkdir(outDir, { recursive: true });

  await writeFile(
    path.join(outDir, "capture-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeFile(
    path.join(outDir, "capture-checklist.md"),
    `${buildChecklist(manifest)}\n`,
  );
  await writeFile(
    path.join(outDir, "capture-results-template.md"),
    `${buildResultsTemplate(manifest)}\n`,
  );

  process.stdout.write(`Generated Colosseum capture packet in ${outDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
