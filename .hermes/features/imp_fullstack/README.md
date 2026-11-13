# imp_fullstack — Full-Stack CI/CD & Visual QA Feature Pack

**One-command install:** `hermes feature install imp_fullstack`

## What's Included

| Feature | Category | Description |
|---------|----------|-------------|
| `visual-audit` | Visual QA | Browser automation + vision analysis on demand |
| `visual-regression` | Visual QA | Percy/Chromatic-style baseline comparison |
| `console-capture` | CI/CD | Auto-screenshot + console errors on test failure |
| `a11y-audit` | CI/CD | axe-core accessibility audit in CI |
| `watch-test` | CI/CD | Auto-run tests on file save (Jest/Vitest) |
| `watch-lint` | CI/CD | ESLint + typecheck on file save |
| `ci-pipeline` | CI/CD | GitHub Actions workflow with all above |
| `docker-health` | CI/CD | Docker Compose health checks + readiness probes |

---

## Quick Start

```bash
# Install feature (adds scripts, config, GitHub Actions)
hermes feature install imp_fullstack

# Run visual audit on localhost:3000
hermes run visual-audit --url=http://localhost:3000

# Start dev with auto-test + lint
hermes run dev:watch

# Run full CI locally (uses act or docker)
hermes run ci:local
```

---

## Commands

| Command | Description |
|---------|-------------|
| `hermes run visual-audit --url=<url>` | Full visual audit (layout, contrast, a11y) |
| `hermes run visual-regression --baseline` | Capture baseline screenshots |
| `hermes run visual-regression --compare` | Compare against baseline |
| `hermes run a11y-audit --url=<url>` | Accessibility audit only |
| `hermes run watch-test` | Auto-run tests on file change |
| `hermes run watch-lint` | Auto-lint + typecheck on file change |
| `hermes run dev:watch` | Combined watch mode (test + lint) |
| `hermes run ci:local` | Run full CI pipeline locally via `act` |

---

## Configuration

All config in `.hermes/features/imp_fullstack/config/`:

| File | Purpose |
|------|---------|
| `visual-audit.json` | Viewports, thresholds, selectors to check |
| `visual-regression.json` | Baseline dir, diff threshold, ignore regions |
| `a11y-audit.json` | axe-core rules, tags, excluded selectors |
| `watch.json` | File patterns, debounce, commands |
| `ci.yml` | GitHub Actions workflow (auto-generated) |

---

## GitHub Actions Integration

Auto-generates `.github/workflows/ci.yml` with:

```yaml
jobs:
  lint:        # ESLint + typecheck
  test:        # Jest/Vitest + coverage
  visual:      # Visual regression + audit
  a11y:        # Accessibility audit
  docker:      # Build + health check
  deploy:      # On main branch
```

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Playwright | 1.40+ (auto-installed) |
| `act` | For local CI (optional) |
| Percy/Chromatic | For visual regression (optional) |

---

## Extending

Add custom visual checks in `scripts/visual-audit/custom/`:
```js
// custom/my-check.js
export default async ({ page, vision }) => {
  const issues = await vision.analyze(screenshot, "Check my custom rule");
  return issues;
};
```

Then reference in `visual-audit.json`:
```json
{ "customChecks": ["my-check"] }
```