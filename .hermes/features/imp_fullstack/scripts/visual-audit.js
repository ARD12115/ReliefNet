#!/usr/bin/env node
/**
 * visual-audit.js — Full visual QA audit via Playwright + Vision
 * Usage: hermes run visual-audit --url=http://localhost:3000 [--config=...]
 */

import { program } from 'commander';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.resolve(__dirname, '../config');

program
  .name('visual-audit')
  .description('Full visual QA audit via Playwright + Vision')
  .option('-u, --url <url>', 'URL to audit', 'http://localhost:3000')
  .option('-c, --config <file>', 'Config file name', 'visual-audit.json')
  .option('-o, --output <dir>', 'Output directory', './visual-audit-results')
  .option('--viewports <list>', 'Comma-separated viewports (WxH)', '1920x1080,1366x768,768x1024,375x667')
  .option('--timeout <ms>', 'Page load timeout', '30000')
  .option('--wait-for <selector>', 'Wait for selector before capture')
  .option('--full-page', 'Capture full page scroll', false)
  .option('--no-vision', 'Skip vision analysis, only screenshots')
  .parse();

const options = program.opts();

async function loadConfig(configName) {
  const configPath = path.join(CONFIG_DIR, configName);
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function runAudit() {
  const config = await loadConfig(options.config);
  const viewports = options.viewports.split(',').map(v => {
    const [w, h] = v.split('x').map(Number);
    return { width: w, height: h, name: v };
  });

  const outputDir = path.resolve(options.output);
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const results = {
    url: options.url,
    timestamp: new Date().toISOString(),
    viewports: [],
    visionAnalysis: [],
    consoleErrors: [],
    networkErrors: [],
    accessibility: null,
  };

  for (const vp of viewports) {
    const page = await context.newPage();
    page.setViewportSize({ width: vp.width, height: vp.height });

    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Capture network errors
    const networkErrors = [];
    page.on('response', resp => {
      if (resp.status() >= 400) networkErrors.push(`${resp.status()} ${resp.url()}`);
    });

    try {
      await page.goto(options.url, {
        waitUntil: 'networkidle',
        timeout: parseInt(options.timeout),
      });

      if (options.waitFor) {
        await page.waitForSelector(options.waitFor, { timeout: 5000 });
      }

      // Wait for fonts/styles
      await page.evaluateHandle('document.fonts.ready');

      const screenshotPath = path.join(outputDir, `screenshot-${vp.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: options.fullPage,
      });

      results.viewports.push({
        viewport: vp.name,
        screenshot: screenshotPath,
        consoleErrors: consoleErrors.slice(),
        networkErrors: networkErrors.slice(),
      });

      results.consoleErrors.push(...consoleErrors);
      results.networkErrors.push(...networkErrors);

      // Vision analysis
      if (!options.noVision) {
        try {
          const visionPrompt = config.visionPrompt || 
            'Analyze this webpage for: layout alignment issues, color contrast problems, overlapping elements, missing alt text, broken images, responsive design issues, visual hierarchy problems, and any UI bugs. Return specific issues with element descriptions and suggested fixes.';
          
          // Note: In actual Hermes, this would call vision_analyze tool
          // For now, we note that vision analysis should happen here
          results.visionAnalysis.push({
            viewport: vp.name,
            screenshot: screenshotPath,
            prompt: visionPrompt,
            status: 'pending_vision_analysis',
          });
        } catch (e) {
          results.visionAnalysis.push({
            viewport: vp.name,
            error: e.message,
          });
        }
      }

    } catch (e) {
      results.viewports.push({
        viewport: vp.name,
        error: e.message,
        consoleErrors,
        networkErrors,
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Save results
  const resultsPath = path.join(outputDir, 'audit-results.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));

  console.log(`\n✅ Visual audit complete`);
  console.log(`📁 Results: ${outputDir}`);
  console.log(`📊 Viewports tested: ${viewports.length}`);
  console.log(`🖼️  Screenshots: ${results.viewports.filter(v => v.screenshot).length}`);
  console.log(`⚠️  Console errors: ${results.consoleErrors.length}`);
  console.log(`🌐 Network errors: ${results.networkErrors.length}`);
  console.log(`\n📝 Full results: ${resultsPath}`);

  if (!options.noVision) {
    console.log(`\n🔍 Vision analysis pending — run with Hermes vision_analyze tool:`);
    console.log(`   vision_analyze(image_url="${results.viewports[0]?.screenshot}", question="...")`);
  }
}

runAudit().catch(e => {
  console.error('❌ Audit failed:', e);
  process.exit(1);
});