#!/usr/bin/env node
/**
 * a11y-audit.js — Accessibility audit via axe-core
 * Usage: hermes run a11y-audit --url=http://localhost:3000
 */

import { program } from 'commander';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.resolve(__dirname, '../config');

program
  .name('a11y-audit')
  .description('Accessibility audit via axe-core')
  .option('-u, --url <url>', 'URL to audit', 'http://localhost:3000')
  .option('-c, --config <file>', 'Config file', 'a11y-audit.json')
  .option('-o, --output <dir>', 'Output directory', './a11y-audit-results')
  .option('--viewports <list>', 'Viewports (WxH)', '1920x1080,375x667')
  .option('--wait-for <selector>', 'Wait for selector')
  .option('--tags <tags>', 'axe-core tags (wcag2a,wcag2aa,wcag21a,wcag21aa,best-practice)', 'wcag2aa')
  .option('--exclude <selectors>', 'Comma-separated selectors to exclude');

program.parse();

const options = program.opts();

async function runAudit() {
  const config = { tags: options.tags.split(','), exclude: options.exclude?.split(',') || [] };
  const viewports = options.viewports.split(',').map(v => {
    const [w, h] = v.split('x').map(Number);
    return { width: w, height: h, name: v };
  });

  const outputDir = path.resolve(options.output);
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = {
    url: options.url,
    timestamp: new Date().toISOString(),
    viewports: [],
    summary: { violations: 0, passes: 0, incomplete: 0, inapplicable: 0 },
  };

  for (const vp of viewports) {
    const page = await browser.newPage();
    page.setViewportSize({ width: vp.width, height: vp.height });

    try {
      await page.goto(options.url, { waitUntil: 'networkidle', timeout: 30000 });
      if (options.waitFor) await page.waitForSelector(options.waitFor, { timeout: 5000 });

      // Inject axe-core
      await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js' });

      // Run axe
      const axeResults = await page.evaluate(async (config) => {
        return await axe.run(document, {
          runOnly: { type: 'tag', values: config.tags },
          exclude: config.exclude,
        });
      }, config);

      // Count results
      const vpSummary = {
        violations: axeResults.violations.length,
        passes: axeResults.passes.length,
        incomplete: axeResults.incomplete.length,
        inapplicable: axeResults.inapplicable.length,
      };

      results.summary.violations += vpSummary.violations;
      results.summary.passes += vpSummary.passes;
      results.summary.incomplete += vpSummary.incomplete;
      results.summary.inapplicable += vpSummary.inapplicable;

      // Save detailed results
      const detailPath = path.join(outputDir, `a11y-${vp.name}.json`);
      await fs.writeFile(detailPath, JSON.stringify(axeResults, null, 2));

      // Screenshot for context
      const screenshotPath = path.join(outputDir, `a11y-screenshot-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.viewports.push({
        viewport: vp.name,
        summary: vpSummary,
        details: detailPath,
        screenshot: screenshotPath,
      });

      console.log(`✅ ${vp.name}: ${vpSummary.violations} violations, ${vpSummary.passes} passes`);
    } catch (e) {
      console.error(`❌ ${vp.name}:`, e.message);
      results.viewports.push({ viewport: vp.name, error: e.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Save summary
  const summaryPath = path.join(outputDir, 'a11y-summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(results, null, 2));

  console.log(`\n✅ Accessibility audit complete`);
  console.log(`📁 Results: ${outputDir}`);
  console.log(`📊 Total violations: ${results.summary.violations}`);
  console.log(`✅ Total passes: ${results.summary.passes}`);
  console.log(`⚠️  Incomplete: ${results.summary.incomplete}`);
  console.log(`\n📝 Summary: ${summaryPath}`);

  if (results.summary.violations > 0) {
    console.log(`\n⚠️  Found ${results.summary.violations} accessibility violations`);
    process.exit(1);
  }
}

runAudit().catch(e => {
  console.error('❌ Audit failed:', e);
  process.exit(1);
});