import { expect, test } from '@playwright/test';


const faqTitle = 'Does the USPS change of address service notify my personal contacts?';

test.describe('Suite 7: Heads Up™ Pillar Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/heads-up');
  });

  test('7.1.1 page returns HTTP 200', async ({ page }) => {
    const response = await page.goto('/heads-up');
    expect(response?.status()).toBe(200);
  });

  test('7.1.2 dom content loads under 5 seconds', async ({ page }) => {
    const started = Date.now();
    await page.goto('/heads-up', { waitUntil: 'domcontentloaded' });
    expect(Date.now() - started).toBeLessThan(5000);
  });

  test('7.1.3 no console errors (desktop only)', async ({ page, browserName }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome' || browserName !== 'chromium');
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!/cdn|analytics|cors|googletagmanager|facebook/i.test(text)) errors.push(text);
      }
    });
    await page.reload();
    expect(errors).toEqual([]);
  });

  test('7.1.4 no horizontal scroll', async ({ page }) => {
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBeFalsy();
  });

  test('7.2 SEO metadata and JSON-LD', async ({ page }) => {
    await expect(page).toHaveTitle(/Heads Up.*AddressGenie/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /USPS only forwards mail/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://addressgenie.co/heads-up');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Heads Up/i);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://addressgenie.co/heads-up');
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index.*follow/i);

    const jsonLdScripts = await page.$$eval('script[type="application/ld+json"]', (scripts) =>
      scripts.map((s) => {
        try {
          return JSON.parse(s.textContent || '{}');
        } catch {
          return {};
        }
      }),
    );
    const graph = (jsonLdScripts.find((s) => s['@graph'])?.['@graph'] as Array<Record<string, unknown>>) || [];
    const types = graph.map((g) => g['@type']);
    expect(types).toContain('WebPage');
    const howTo = graph.find((g) => g['@type'] === 'HowTo') as { step?: unknown[]; description?: string } | undefined;
    expect(howTo?.step?.length).toBe(4);
    expect(howTo?.description || '').toContain('USPS');
    expect(graph.find((g) => g['@type'] === 'Service' && g['price'] === '0')).toBeTruthy();
    const faq = graph.find((g) => g['@type'] === 'FAQPage') as { mainEntity?: unknown[] } | undefined;
    expect(faq?.mainEntity?.length).toBe(8);
  });

  test('7.3 hero content and CTA', async ({ page }, testInfo) => {
    const hero = page.locator('section').first();
    await expect(hero.getByRole('heading', { level: 1 })).toContainText('Tell Everyone You’re Moving');
    await expect(page.getByText('Heads Up™ by AddressGenie')).toBeVisible();
    await expect(page.getByText(/Gmail or Outlook/i)).toBeVisible();
    await expect(page.getByText(/5 minutes/i)).toBeVisible();
    for (const benefit of ['Import contacts', 'photo of your new home', 'Free forever']) {
      await expect(page.getByText(benefit, { exact: false }).first()).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Create Your Free Account' })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    const submit = page.getByRole('button', { name: /Start Notifying My Contacts/i }).first();
    await expect(submit).toBeVisible();
    const bgColor = await submit.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgColor).toMatch(/85,\s*196,\s*104|55c468/i);
    await expect(page.getByRole('link', { name: /Privacy Policy/i }).first()).toHaveAttribute('href', '/privacy/policy');
    await expect(page.getByRole('link', { name: /^Terms$/i }).first()).toHaveAttribute('href', '/terms');
    await expect(page.getByRole('link', { name: /Already have an account\? Sign In/i })).toHaveAttribute('href', '/signin');

    if (testInfo.project.name === 'desktop-chrome') {
      const bgImage = await hero.evaluate((el) => {
        const div = el.querySelector('div[style*="background-image"],div[style*="backgroundImage"]');
        return div ? getComputedStyle(div).backgroundImage : '';
      });
      expect(bgImage).toContain('ag-heads-up-diametric-hero');
    }
    if (testInfo.project.name === 'mobile') {
      const mobileHero = page.locator('div.lg\\:hidden[style*="background-image"], div.lg\\:hidden[style*="backgroundImage"]').first();
      await expect(mobileHero).toBeVisible();
      const bg = await mobileHero.evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bg.toLowerCase()).toContain('portrait');
    }
  });

  test('7.4 signed-in banner behavior', async ({ page }) => {
    await expect(page.getByText('Already signed in')).toHaveCount(0);
    await page.addInitScript(() => {
      localStorage.setItem('checklist_session', JSON.stringify({ email: 'test@example.com', firstName: 'Test', authenticated: true }));
    });
    await page.goto('/heads-up');
    await expect(page.getByText('Already signed in')).toBeVisible();
    await expect(page.getByRole('link', { name: /Portal → Heads Up/i })).toHaveAttribute('href', '/portal');
  });

  test('7.5/7.6 feature and how-it-works sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Why This Isn't Just Another 'We Moved' Card/i })).toBeVisible();
    for (const title of ['One-Click Import', '5 Designed Themes', 'Personal Touch', 'Real-Time Tracking', 'Your Data Stays Yours', 'Always Free']) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
    await expect(page.getByText(/CCPA/i)).toBeVisible();

    await expect(page.getByRole('heading', { name: /How Heads Up™ Works/i })).toBeVisible();
    for (const step of ['Import Contacts', 'Select Recipients', 'Pick a Design', 'Send & Track']) {
      await expect(page.getByText(step).first()).toBeVisible();
    }
  });

  test('7.7 e-card carousel interaction', async ({ page }, testInfo) => {
    await expect(page.getByRole('heading', { name: /What Your Contacts Will See/i })).toBeVisible();
    for (const theme of ['Classic Elegance', 'New Nest', 'Fresh Start', 'Cozy Home', 'Modern Minimal']) {
      await expect(page.getByRole('button', { name: theme })).toBeVisible();
    }
    const ecardImg = page.locator('img[alt*="e-card design"], img[src*="/images/e_card_image/"]').first();
    const initialSrc = await ecardImg.getAttribute('src');
    await page.getByRole('button', { name: 'Fresh Start' }).click();
    const newSrc = await ecardImg.getAttribute('src');
    expect(newSrc).not.toEqual(initialSrc);
    await expect(page.getByText('The Johnson Family')).toBeVisible();
    await expect(page.getByText(/Hi Sarah/i)).toBeVisible();
    await expect(page.getByText(/Boulder, CO 80301/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Save Our New Address/i })).toBeVisible();
    await expect(page.getByText(/Heads Up™ by AddressGenie/i).last()).toBeVisible();
    await expect(page.getByText('Optional')).toBeVisible();
    if (testInfo.project.name !== 'mobile') {
      await expect(page.getByText('Included').first()).toBeVisible();
    }
  });

  test('7.8 to 7.11 content sections and FAQ legibility', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /50–200 People Need Your New Address/i })).toBeVisible();
    await expect(page.getByText(/no government service/i)).toBeVisible();

    await expect(page.getByRole('heading', { name: /People Are Only Half the Equation/i })).toBeVisible();
    await expect(page.getByText("Notifies your people")).toBeVisible();
    await expect(page.getByText('Tracks every task')).toBeVisible();
    await expect(page.getByText('Updates every company')).toBeVisible();
    await expect(page.getByRole('link', { name: /Start My Free Checklist/i })).toHaveAttribute('href', '/moving-checklist');
    await expect(page.getByRole('link', { name: /See How AddressGenie Works/i }).first()).toHaveAttribute('href', '/');

    const dfCard = page.getByText("Don't Forget").first().locator('..');
    const border = await dfCard.evaluate((el) => getComputedStyle(el).borderColor);
    expect(border).toMatch(/220.*75.*115|dc4b73/i);

    await expect(page.getByRole('heading', { name: /Frequently Asked Questions About Moving Announcements/i })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(faqTitle, 'i') })).toBeVisible();
    await page.getByRole('button', { name: /USPS change of address/i }).click();
    const answerEl = page.getByRole('button', { name: /USPS change of address/i }).locator('..').locator('p').first();
    const styles = await answerEl.evaluate((el) => ({
      color: getComputedStyle(el).color,
      fontSize: parseFloat(getComputedStyle(el).fontSize),
    }));
    const rgb = styles.color.match(/\d+/g)?.map(Number) || [];
    expect(rgb[0]).toBeLessThan(150);
    expect(styles.fontSize).toBeGreaterThanOrEqual(14);

    await expect(page.getByRole('heading', { name: /Your People Deserve a Heads Up/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Email us/i })).toHaveAttribute('href', /mailto:support@addressgenie\.co/i);
  });

  test('7.12 form submission and redirect', async ({ page }) => {
    await page.route('**/api/checklist/subscribe', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      expect(body.email).toBe('test@example.com');
      expect(body.firstName).toBe('Jane');
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="firstName"]', 'Jane');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.getByRole('button', { name: /Start Notifying My Contacts/i }).first().click();
    await page.waitForURL('**/checklist/check-email**');
    expect(page.url()).toContain('email=test%40example.com');
  });
});

test.describe('Cross-page tests', () => {
  test('Cross-links and brand color consistency', async ({ page }) => {
    await page.goto('/heads-up');
    await expect(page.getByRole('link', { name: /Start My Free Checklist/i })).toHaveAttribute('href', '/moving-checklist');
    await expect(page.getByRole('link', { name: /See How AddressGenie Works/i }).first()).toHaveAttribute('href', '/');
    const headsUpCtaColor = await page.getByRole('button', { name: /Start Notifying My Contacts/i }).first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(headsUpCtaColor).toMatch(/85,\s*196,\s*104|55c468/i);

    await page.goto('/moving-checklist');
    await expect(page.getByRole('link', { name: /See How AddressGenie Works/i })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: /Heads Up™/i }).last()).toHaveAttribute('href', '/heads-up');

    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: /Privacy Policy/i })).toBeVisible();
  });

  test('LLM-ingestion FAQ and schema consistency', async ({ page }) => {
    await page.goto('/heads-up');
    const faqButtons = page.locator('button:has(svg.lucide-chevron-down)');
    const count = await faqButtons.count();
    expect(count).toBe(8);
    for (let i = 0; i < count; i++) await faqButtons.nth(i).click();
    const answers = page.locator('button:has(svg.lucide-chevron-down) + div p');
    for (let i = 0; i < await answers.count(); i++) {
      const text = await answers.nth(i).textContent();
      expect((text || '').split(/\s+/).length).toBeGreaterThan(50);
    }

    await page.goto('/moving-checklist');
    const jsonLdScripts = await page.$$eval('script[type="application/ld+json"]', (scripts) => scripts.map((s) => s.textContent || ''));
    expect(jsonLdScripts.join(' ')).toMatch(/HowTo/i);
    expect(jsonLdScripts.join(' ')).toMatch(/USPS|moving|address/i);
  });
});
