# Contributing to Hexology

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A [Supabase](https://supabase.com/) project (for backend features)

### Getting Started

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/quiet-hex-logic-2.git
cd quiet-hex-logic-2

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app runs at `http://localhost:8080`.

### Running Tests

```bash
npm test           # Run all tests
npm run test:watch # Run in watch mode
```

### Linting

```bash
npm run lint
```

## Branch Conventions

- `main` — stable branch, always deployable
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `refactor/<name>` — code improvements without behavior changes

## How to Add a New Game

Hexology uses a game registry pattern. To add a new game:

1. **Create the engine** — `src/lib/<game>/engine.ts` implementing core game logic
2. **Create an adapter** — `src/lib/engine/adapters/<game>Adapter.ts` wrapping your engine behind the `GameEngine` interface
3. **Create the board component** — `src/components/<game>/<Game>Board.tsx`
4. **Register the game** — Add a `registerGame()` call in `src/lib/engine/registry.ts`

See the existing games (hex, chess, checkers, ttt) for examples.

## Pull Request Expectations

- Keep PRs focused — one feature or fix per PR
- Include tests for new game engine logic
- Run `npm run lint` and `npm test` before submitting
- Fill out the PR template
- Link related issues

## Code Style

- TypeScript with path alias `@/*` → `./src/*`
- Tailwind CSS for styling
- shadcn/ui for UI components
- React Query for server state

## Reporting Bugs

Use the [bug report template](https://github.com/YOUR_USERNAME/quiet-hex-logic-2/issues/new?template=bug_report.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
