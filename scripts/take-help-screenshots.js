/**
 * Headless browser screenshot script for RDY help pages.
 * Usage: node scripts/take-help-screenshots.js
 *
 * Requires:  npx puppeteer  (already in node_modules)
 * Writes screenshots to: public/help/
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://rdy.neonnidavellir.com';
const OUT_DIR = path.join(__dirname, '../public/help');

const USERS = {
  admin:   { email: 'testadmin@rdy.local',   password: 'Screenshot1!' },
  mentor:  { email: 'testmentor@rdy.local',  password: 'Screenshot1!' },
  mentee:  { email: 'testmentee@rdy.local',  password: 'Screenshot1!' },
};

// ── Viewport ──────────────────────────────────────────────────────────────────
// 1024px = smallest viewport where sidebar is visible (lg breakpoint)
// This ensures screenshots are legible when displayed in the help page at ~700px max width
const DESKTOP = { width: 1024, height: 768 };
const MOBILE  = { width: 390,  height: 844 };   // iPhone 14 Pro

// ── Pages to capture ──────────────────────────────────────────────────────────
const ADMIN_PAGES = [
  { url: '/admin/dashboard',      file: 'admin-dashboard.png',          viewport: DESKTOP },
  { url: '/admin/exercises',      file: 'admin-exercises.png',          viewport: DESKTOP },
  { url: '/admin/program-builder',file: 'admin-curriculum-builder.png', viewport: DESKTOP },
  { url: '/admin/classes',        file: 'admin-classes.png',            viewport: DESKTOP },
  { url: '/admin/users',          file: 'admin-users.png',              viewport: DESKTOP },
  { url: '/admin/invitations',    file: 'admin-invitations.png',        viewport: DESKTOP },
  { url: '/admin/analytics',      file: 'admin-analytics.png',          viewport: DESKTOP },
  { url: '/admin/ai-settings',    file: 'admin-ai-settings.png',        viewport: DESKTOP },
  { url: '/admin/ai-prompts',     file: 'admin-ai-prompts.png',         viewport: DESKTOP },
];

const MENTOR_PAGES = [
  { url: '/mentor',               file: 'mentor-home.png',              viewport: DESKTOP },
  { url: '/mentor/classes',       file: 'mentor-classes.png',           viewport: DESKTOP },
  { url: '/mentor/group-sessions',file: 'mentor-group-sessions.png',    viewport: DESKTOP },
  { url: '/mentor/calendar',      file: 'mentor-calendar.png',          viewport: DESKTOP },
  { url: '/mentor/availability',  file: 'mentor-availability.png',      viewport: DESKTOP },
  { url: '/mentor/analytics',     file: 'mentor-analytics.png',         viewport: DESKTOP },
  { url: '/mentor/profile',       file: 'mentor-profile.png',           viewport: DESKTOP },
];

const MENTEE_PAGES = [
  { url: '/mentee/calendar',          file: 'mentee-home.png',           viewport: MOBILE },
  { url: '/mentee/calendar/weekly',   file: 'mentee-calendar.png',       viewport: MOBILE },
  { url: '/mentee/calendar/tracking', file: 'mentee-diary.png',          viewport: MOBILE },
  { url: '/mentee/reflection',        file: 'mentee-reflection.png',     viewport: MOBILE },
  { url: '/mentee/booking',           file: 'mentee-booking.png',        viewport: MOBILE },
  { url: '/mentee/weekly-summary',    file: 'mentee-weekly-summary.png', viewport: MOBILE },
  { url: '/mentee/profile',           file: 'mentee-profile.png',        viewport: MOBILE },
  { url: '/mentee/settings',          file: 'mentee-settings.png',       viewport: MOBILE },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function login(page, email, password) {
  console.log(`  → Logging in as ${email}…`);

  // Navigate to the app — NextAuth v5 will redirect to Keycloak
  await page.goto(`${BASE_URL}/api/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // If there's a "Sign in with Keycloak" button, click it
  const currentUrl = page.url();
  if (!currentUrl.includes('auth.neonnidavellir.com')) {
    // Look for the Keycloak signin button on the NextAuth signin page
    try {
      const btn = await page.waitForSelector(
        'button[value="keycloak"], form[action*="keycloak"] button, button:not([type]), a[href*="keycloak"]',
        { timeout: 5000 }
      );
      await btn.click();
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch {
      // Already on Keycloak or redirecting
    }
  }

  // Wait for Keycloak login form
  console.log(`  → Auth page: ${page.url().substring(0, 70)}…`);
  await page.waitForSelector('#username, input[name="username"]', { timeout: 20000 });

  await page.type('#username', email, { delay: 40 });
  await page.type('#password', password, { delay: 40 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    page.click('#kc-login, [type="submit"]'),
  ]);

  console.log(`  → After submit: ${page.url().substring(0, 80)}`);

  // If we're back on the app's signin page, check for errors
  if (page.url().includes(BASE_URL)) {
    const bodyText = await page.$eval('body', el => el.innerText.substring(0, 200)).catch(() => '');
    console.log(`  → Page body: ${bodyText}`);
  }

  // If we're on a Keycloak required-action page, handle it
  if (page.url().includes('login-actions') || page.url().includes('required-action')) {
    console.log(`  → Keycloak required action page, attempting to skip/continue…`);
    const skipBtn = await page.$('[value="SKIP"], button[type="submit"]').catch(() => null);
    if (skipBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        skipBtn.click(),
      ]);
    }
  }

  console.log(`  → Logged in — now at: ${page.url().substring(0, 80)}`);
}

async function screenshot(page, url, file, viewport) {
  const outPath = path.join(OUT_DIR, file);
  try {
    await page.setViewport(viewport);
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle2', timeout: 20000 });

    // Wait a bit for animations to settle
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`  ✓ ${file}`);
  } catch (err) {
    console.error(`  ✗ ${file} — ${err.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });

  try {
    // ── Admin screenshots ──────────────────────────────────────────────────────
    console.log('\n=== ADMIN ===');
    {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await login(page, USERS.admin.email, USERS.admin.password);
      for (const p of ADMIN_PAGES) await screenshot(page, p.url, p.file, p.viewport);
      await ctx.close();
    }

    // ── Mentor screenshots ─────────────────────────────────────────────────────
    console.log('\n=== MENTOR ===');
    {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await login(page, USERS.mentor.email, USERS.mentor.password);
      for (const p of MENTOR_PAGES) await screenshot(page, p.url, p.file, p.viewport);
      await ctx.close();
    }

    // ── Mentee screenshots ─────────────────────────────────────────────────────
    console.log('\n=== MENTEE ===');
    {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await login(page, USERS.mentee.email, USERS.mentee.password);
      for (const p of MENTEE_PAGES) await screenshot(page, p.url, p.file, p.viewport);
      await ctx.close();
    }

    console.log('\nDone! Screenshots saved to public/help/');
  } finally {
    await browser.close();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
