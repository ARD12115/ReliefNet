import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:4000';

test.describe('ReliefNet Live Visual & Functional Audit', () => {

  // ── Auth Issues ──────────────────────────────────────────────────────────

  test('should redirect unauthenticated users to login', async ({ page }) => {
    const responses = [];
    page.on('response', r => responses.push({ url: r.url(), status: r.status() }));

    await page.goto('/coordinator');
    await page.waitForURL('**/login');

    // Should land on login page
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h1, h2, h3, [role="heading"]')).toBeVisible();

    // Console should not have 401s from protected route fetching before redirect
    const auth401s = responses.filter(r => r.status === 401);
    console.log('[AUTH] 401 responses before login redirect:', auth401s.length);
  });

  test('should show validation errors on empty login submit', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling anything
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // Should show some validation / error message, not crash
      const hasError = await page.locator('[role="alert"], .text-red-*, .error, [aria-invalid="true"]').count() > 0;
      console.log('[AUTH] Empty submit shows validation:', hasError);
    }
  });

  test('should not expose admin registration to public', async ({ page }) => {
    await page.goto('/login');

    const pageText = await page.locator('body').textContent();
    const hasAdminRoleOption = pageText.includes('admin') && 
      (pageText.includes('role') || pageText.includes('Role'));
    console.log('[AUTH] Admin role visible on public login page:', hasAdminRoleOption);
  });

  // ── UI / UX Issues ──────────────────────────────────────────────────────

  test('should load login page without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    console.log('[UI] Login page console errors:', errors.length);
    errors.forEach(e => console.log('  -', e.slice(0, 150)));

    // Check for critical UI elements
    const hasHeading = await page.locator('h1, h2').count() > 0;
    const hasForm = await page.locator('form').count() > 0;
    console.log('[UI] Login page has heading:', hasHeading, '| has form:', hasForm);

    expect(errors.filter(e => !e.includes('favicon') && !e.includes('404'))).toHaveLength(0);
  });

  test('should handle navigation to protected routes gracefully', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Try accessing dashboard without auth
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    const url = page.url();
    console.log('[UX] Redirect from /admin without auth:', url);
    console.log('[UX] Console errors on protected route access:', consoleErrors.length);
  });

  test('should render dashboard with proper layout structure', async ({ page }) => {
    // We can't authenticate easily without a test user, so test the layout shell
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check for empty states, loading spinners, etc.
    const hasSpinner = await page.locator('.animate-spin, [class*="spinner"], [role="status"]').count() > 0;
    console.log('[UX] Loading spinner present:', hasSpinner);

    // Check for Tailwind classes / CSS loaded
    const bodyClasses = await page.locator('body').getAttribute('class');
    console.log('[UX] Body classes:', bodyClasses || 'none');
  });

  // ── SEO Issues ──────────────────────────────────────────────────────────

  test('should have proper document title and meta tags', async ({ page }) => {
    await page.goto('/login');

    const title = await page.title();
    console.log('[SEO] Page title:', title);

    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
    console.log('[SEO] Meta description:', metaDesc || 'MISSING');

    const h1Count = await page.locator('h1').count();
    console.log('[SEO] H1 count:', h1Count);

    const lang = await page.locator('html').getAttribute('lang');
    console.log('[SEO] HTML lang attribute:', lang || 'MISSING');
  });

  test('should have semantic heading structure', async ({ page }) => {
    await page.goto('/login');

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = [];
    for (const h of headings) {
      const tag = await h.evaluate(el => el.tagName.toLowerCase());
      const text = (await h.textContent() || '').trim().slice(0, 60);
      headingLevels.push(`${tag}: ${text}`);
    }
    console.log('[SEO] Heading structure:');
    headingLevels.forEach(h => console.log('  ', h));
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/login');

    const images = await page.locator('img').all();
    console.log('[SEO] Image count:', images.length);
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      console.log(`  <img src="${src}" alt="${alt || 'MISSING'}">`);
    }
  });

  // ── DevOps / Connectivity Issues ──────────────────────────────────────

  test('should detect API connectivity from frontend', async ({ page }) => {
    const failedRequests = [];
    page.on('requestfailed', req => {
      failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Try a direct health check via API
    const healthRes = await page.request.get(`${API_URL}/health`).catch(e => ({ error: e.message }));
    console.log('[DEVOPS] Backend /health status:', healthRes.status || healthRes.error);

    console.log('[DEVOPS] Failed frontend requests:', failedRequests.length);
    failedRequests.forEach(r => console.log('  -', r.url, r.failure));
  });

  test('should check CORS headers on API', async ({ page }) => {
    const res = await page.request.options(`${API_URL}/health`, {
      headers: { Origin: 'http://localhost:5173' }
    }).catch(() => null);

    if (res) {
      const cors = res.headers()['access-control-allow-origin'];
      console.log('[DEVOPS] CORS allow-origin:', cors || 'NOT SET');
      const creds = res.headers()['access-control-allow-credentials'];
      console.log('[DEVOPS] CORS allow-credentials:', creds || 'NOT SET');
    } else {
      console.log('[DEVOPS] OPTIONS preflight failed');
    }
  });

  // ── Errors & Warnings ──────────────────────────────────────────────────

  test('should capture all console errors and warnings across key pages', async ({ page }) => {
    const errors = [];
    const warnings = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') errors.push(text);
      if (msg.type() === 'warning') warnings.push(text);
    });

    const pages = ['/login'];
    for (const p of pages) {
      await page.goto(p);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    console.log('[ERRORS] Total console errors:', errors.length);
    errors.forEach(e => console.log('  ERROR:', e.slice(0, 200)));
    console.log('[WARNINGS] Total console warnings:', warnings.length);
    warnings.forEach(w => console.log('  WARN:', w.slice(0, 200)));

    // Filter out expected noise (favicon, etc.)
    const realErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('404') && !e.includes('favicon.ico')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('should verify network requests do not fail on login page', async ({ page }) => {
    const failed = [];
    page.on('requestfailed', req => failed.push(req.url()));

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('[NETWORK] Failed requests:', failed.length);
    failed.forEach(u => console.log('  -', u));
  });

  // ── Visual / Layout Issues ─────────────────────────────────────────────

  test('should check for horizontal overflow and broken layout', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check for horizontal scroll / overflow
    const overflow = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return {
        bodyWidth: body.scrollWidth,
        windowWidth: window.innerWidth,
        htmlWidth: html.scrollWidth,
        overflows: body.scrollWidth > window.innerWidth || html.scrollWidth > window.innerWidth
      };
    });
    console.log('[VISUAL] Overflow check:', overflow);
    expect(overflow.overflows).toBe(false);
  });

  test('should verify touch targets meet minimum size (44px)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const smallButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"], input[type="submit"]'));
      return buttons.filter(b => {
        const r = b.getBoundingClientRect();
        return r.width < 44 || r.height < 44;
      }).map(b => ({ text: b.textContent?.trim().slice(0, 30), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) }));
    });
    console.log('[ACCESSIBILITY] Buttons smaller than 44px:', smallButtons.length);
    smallButtons.forEach(b => console.log('  -', b.text, `${b.w}x${b.h}`));
  });

  // ── Auth Flow (if we can register/login) ───────────────────────────────

  test('should attempt registration flow and capture errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Look for register link/button
    const registerLink = page.locator('a:has-text("Register"), a:has-text("Sign up"), button:has-text("Register"), button:has-text("Sign up")');
    if (await registerLink.count() > 0) {
      await registerLink.first().click();
      await page.waitForTimeout(1000);
      console.log('[AUTH] Navigated to registration:', page.url());
    } else {
      console.log('[AUTH] No register link found on login page');
    }

    console.log('[AUTH] Console errors during reg flow:', consoleErrors.length);
  });

});
