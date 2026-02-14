import { expect, test } from '@playwright/test';

test.describe("Suite 8: Don't Forget™ Pillar Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/moving-checklist');
  });

  test('8.1 page load/performance', async ({ page }, testInfo) => {
    const response = await page.goto('/moving-checklist');
    expect(response?.status()).toBe(200);
    const start = Date.now();
    await page.goto('/moving-checklist', { waitUntil: 'domcontentloaded' });
    expect(Date.now() - start).toBeLessThan(5000);

    if (testInfo.project.name === 'desktop-chrome') {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !/cdn|analytics|cors/i.test(msg.text())) errors.push(msg.text());
      });
      await page.reload();
      expect(errors).toEqual([]);
    }

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBeFalsy();
  });

  test('8.2 metadata and structured data', async ({ page }) => {
    await expect(page).toHaveTitle(/Moving Checklist.*AddressGenie/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /128 tasks/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://addressgenie.co/moving-checklist');
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index.*follow/i);

    const ld = await page.$$eval('script[type="application/ld+json"]', (scripts) => scripts.map((s) => s.textContent || ''));
    const raw = ld.join(' ');
    expect(raw).toMatch(/HowTo/);
    expect(raw).toMatch(/FAQPage/);
    expect(raw).toMatch(/P56D/);
  });

  test('8.3 hero section', async ({ page }, testInfo) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Moving.*Checklist/i);
    await expect(page.getByText("Don't Forget™ by AddressGenie")).toBeVisible();
    await expect(page.getByText(/128 tasks/i)).toBeVisible();
    await expect(page.getByText(/8 weeks/i)).toBeVisible();
    await expect(page.getByText(/Saves your progress/i)).toBeVisible();
    await expect(page.getByText(/Free forever/i)).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Checklist/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Already have an account\? Access My Checklist/i })).toHaveAttribute('href', '/signin');

    if (testInfo.project.name === 'desktop-chrome') {
      const desktopBg = page.locator('div.hidden.lg\\:block[style*="background-image"],div.hidden.lg\\:block[style*="backgroundImage"]').first();
      const bg = await desktopBg.evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bg.toLowerCase()).toContain('dont-forget');
      expect(bg.toLowerCase()).toContain('landscape');
    }
    if (testInfo.project.name === 'mobile') {
      const mobileBg = page.locator('div.lg\\:hidden[style*="background-image"],div.lg\\:hidden[style*="backgroundImage"]').first();
      const bg = await mobileBg.evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bg.toLowerCase()).toContain('portrait');
    }
  });

  test('8.4 to 8.10 sections, links, and submission', async ({ page }, testInfo) => {
    await expect(page.getByRole('heading', { name: /Why This Isn't Just Another Moving Checklist/i })).toBeVisible();
    for (const title of ['Access Anywhere', 'Personalized Timeline', 'Two Views', 'Optional Reminders', 'Download PDF', 'Always Free']) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
    await expect(page.getByText(/syncs automatically/i)).toBeVisible();

    await expect(page.getByRole('heading', { name: /128 Moving Tasks.*14 Categories/i })).toBeVisible();
    for (const cat of ['USPS & Mail', 'Utilities & Services', 'Government & Legal', 'Insurance & Financial']) {
      await expect(page.getByText(cat)).toBeVisible();
    }

    await expect(page.getByText(/USPS and 400\+ companies|4,000\+ organizations/i)).toBeVisible();
    const cta = page.getByRole('link', { name: /See How AddressGenie Works/i });
    await expect(cta).toHaveAttribute('href', '/');

    await expect(page.getByRole('link', { name: /Heads Up™/i }).last()).toHaveAttribute('href', '/heads-up');
    await expect(page.getByRole('link', { name: /Don't Forget™/i }).last()).toHaveAttribute('href', '/dont-forget');

    if (testInfo.project.name === 'desktop-chrome') {
      await expect(page.getByRole('link', { name: /Create Free Account/i })).toHaveAttribute('href', '/moving-checklist');
      await expect(page.getByRole('link', { name: /Do It All/i })).toBeVisible();
    }

    await page.route('**/api/checklist/subscribe', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.getByRole('button', { name: /Checklist/i }).first().click();
    await page.waitForURL('**/checklist/check-email**');
  });
});
