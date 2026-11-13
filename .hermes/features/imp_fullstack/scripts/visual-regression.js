#!/usr/bin/env node
/**
 * visual-regression.js — Visual regression testing with baseline comparison
 * Usage: node visual-regression.js --mode=baseline|compare --url=http://localhost:3000 ...
 */

import { program } from 'commander';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

program
  .name('visual-regression')
  .description('Visual regression testing with baseline comparison')
  .option('-u, --url <url>', 'URL to test', 'http://localhost:3000')
  .option('-m, --mode <mode>', 'Mode: baseline or compare', 'baseline')
  .option('-c, --config <file>', 'Config file', 'visual-regression.json')
  .option('-b, --baseline-dir <dir>', 'Baseline directory', './visual-baseline')
  .option('-o, --output-dir <dir>', 'Diff output directory', './visual-diff')
  .option('--viewports <list>', 'Viewports (WxH)', '1920x1080,1366x768,768x1024,375x667')
  .option('--threshold <num>', 'Diff threshold (0-1)', '0.01')
  .option('--wait-for <selector>', 'Wait for selector')
  .option('--full-page', 'Full page scroll', false);

program.parse();

const options = program.opts();
const CONFIG_DIR = path.resolve(__dirname, '../config');

async function loadConfig(configName) {
  const configPath = path.join(CONFIG_DIR, configName || 'visual-regression.json');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

const config = await loadConfig(options.config);

async function captureScreenshots(url, outputDir, viewports, waitFor, fullPage) {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of viewports) {
    const page = await browser.newPage();
    page.setViewportSize({ width: vp.width, height: vp.height });

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      if (options.waitFor) await page.waitForSelector(options.waitFor, { timeout: 5000 });
      await page.evaluateHandle('document.fonts.ready');

      const filename = `${options.mode}-${vp.name}.png`;
      const filepath = path.join(outputDir, filename);
      await page.screenshot({ path: filepath, fullPage: options.fullPage });
      results.push({ viewport: vp.name, path: filepath, mode: options.mode });
      console.log(`✅ ${options.mode} captured: ${vp.name}`);
    } catch (e) {
      console.error(`❌ Failed ${vp.name}:`, e.message);
      results.push({ viewport: vp.name, error: e.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();
  return results;
}

function compareImages(baselinePath, testPath, diffPath, threshold) {
  return new Promise((resolve, reject) => {
    const baseline = fs.createReadStream(baselinePath).pipe(new PNG());
    const test = fs.createReadStream(testPath).pipe(new PNG());

    baseline.on('parsed', () => {
      test.on('parsed', () => {
        if (baseline.width !== test.width || baseline.height !== test.height) {
          resolve({ diff: -1, error: 'Dimension mismatch' });
          return;
        }

        const diff = new PNG({ width: baseline.width, height: baseline.height });
        const diffPixels = pixelmatch(
          baseline.data, test.data, diff.data,
          baseline.width, baseline.height,
          { threshold, includeAA: true }
        );

        const diffRatio = diffPixels / (baseline.width * baseline.height);
        const hasDiff = diffRatio > threshold;

        if (hasDiff) {
          fs.writeFileSync(diffPath, PNG.sync.write(diff));
        }

        resolve({ diff: diffRatio, pixels: diffPixels, hasDiff, diffPath: hasDiff ? diffPath : null });
      });
    });
  });
}

async function runBaseline() {
  const viewports = options.viewports.split(',').map(v => {
    const [w, h] = v.split('x').map(Number);
    return { width: w, height: h, name: v };
  });

  await fs.mkdir(options.baselineDir, { recursive: true });
  const results = await captureScreenshots(options.url, options.baselineDir, viewports, options.waitFor, options.fullPage);

  console.log(`\n✅ Baseline captured: ${results.filter(r => !r.error).length}/${viewports.length} viewports`);
  console.log(`📁 Baseline dir: ${options.baselineDir}`);
}

async function runCompare() {
  const viewports = options.viewports.split(',').map(v => {
    const [w, h] = v.split('x').map(Number);
    return { width: w, height: h, name: v };
  });

  await fs.mkdir(options.outputDir, { recursive: true });
  await fs.mkdir(options.baselineDir, { recursive: true });

  // Capture test screenshots
  const testResults = await captureScreenshots(options.url, options.outputDir, viewports, options.waitFor, options.fullPage);

  // Compare each
  let passed = 0, failed = 0;
  for (const test of testResults) {
    if (test.error) continue;

    const baselinePath = path.join(options.baselineDir, `baseline-${test.viewport}.png`);
    if (!await fs.stat(baselinePath).catch(() => false)) {
      console.log(`⚠️  No baseline for ${test.viewport}, skipping`);
      continue;
    }

    const diffPath = path.join(options.outputDir, `diff-${test.viewport}.png`);
    const result = await compareImages(
      baselinePath, 
      test.path, 
      diffPath, 
      parseFloat(options.threshold)
    );

    if (result.error) {
      console.log(`❌ ${test.viewport}: ${result.error}`);
      failed++;
    } else if (result.hasDiff) {
      console.log(`❌ ${test.viewport}: ${(result.diff * 100).toFixed(2)}% diff (threshold: ${options.threshold})`);
      console.log(`   Diff: ${diffPath}`);
      failed++;
    } else {
      console.log(`✅ ${test.viewport}: ${(result.diff * 100).toFixed(4)}% diff`);
      passed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

async function run() {
  const mode = options.mode || 'baseline';
  if (mode === 'baseline') {
    await runBaseline();
  } else if (mode === 'compare') {
    await runCompare();
  } else {
    console.error('Usage: visual-regression --mode=baseline|compare [options]');
    process.exit(1);
  }
}

run().catch(e => {
  console.error('❌ Failed:', e);
  process.exit(1);
});
