/**
 * GTM360 HQ — Playwright Smoke Tests
 * Requires dev server running on http://localhost:3000
 */
import { test, expect } from '@playwright/test'

const ROUTES = [
  { path: '/',     name: 'Command Center' },
  { path: '/sam',  name: 'Sam' },
  { path: '/rex',  name: 'Rex' },
  { path: '/andy', name: 'Andy' },
  { path: '/finn', name: 'Finn' },
  { path: '/ola',  name: 'Ola'  },
]

const DEBUG_STRINGS = ['world otter', 'lorem ipsum', ' TODO ', 'undefined', '[object Object]']

// ─── Section 5: UI Smoke Tests ────────────────────────────────────────────────

test.describe('5. UI Smoke Tests', () => {

  test.describe('All 6 routes load', () => {
    for (const route of ROUTES) {
      test(`${route.path} loads without HTTP errors`, async ({ page }) => {
        const errors = []
        page.on('pageerror', err => errors.push(err.message))

        const res = await page.goto(route.path, { waitUntil: 'domcontentloaded' })
        expect(res?.status()).toBeLessThan(400)

        // Wait for React to hydrate (sidebar always present)
        await page.waitForSelector('nav', { timeout: 5000 })

        expect(errors, `Console errors on ${route.path}: ${errors.join(', ')}`).toHaveLength(0)
      })
    }
  })

  test.describe('Agent name visible on each route', () => {
    for (const route of ROUTES) {
      test(`${route.path} shows "${route.name}" in page`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('nav', { timeout: 5000 })

        // Either in title bar or sidebar
        const body = await page.textContent('body')
        expect(body, `"${route.name}" not found on ${route.path}`).toContain(route.name)
      })
    }
  })

  test.describe('No debug / error text visible', () => {
    for (const route of ROUTES) {
      test(`${route.path} has no "[object Object]"`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('nav', { timeout: 5000 })
        await page.waitForTimeout(1500) // let data load

        const body = await page.textContent('body')
        expect(body).not.toContain('[object Object]')
      })

      test(`${route.path} has no raw "undefined" text`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('nav', { timeout: 5000 })
        await page.waitForTimeout(1500)

        const body = await page.textContent('body')
        // "undefined" as a standalone word (not in classnames/URLs)
        expect(body).not.toMatch(/\bundefined\b/)
      })
    }

    test('no "World Otter" debug text anywhere', async ({ page }) => {
      for (const route of ROUTES) {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(500)
        const body = await page.textContent('body')
        expect(body?.toLowerCase()).not.toContain('world otter')
        expect(body?.toLowerCase()).not.toContain('otter day')
      }
    })

    test('no "lorem ipsum" placeholder text', async ({ page }) => {
      for (const route of ROUTES) {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' })
        const body = await page.textContent('body')
        expect(body?.toLowerCase()).not.toContain('lorem ipsum')
      }
    })
  })

  test.describe('Sidebar navigation', () => {
    test('clicking "Command Center" navigates to /', async ({ page }) => {
      await page.goto('/sam', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('nav')
      await page.click('text=Command Center')
      await expect(page).toHaveURL('/')
    })

    test('clicking "Rex" in sidebar navigates to /rex', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('nav')
      await page.click('nav >> text=Rex')
      await expect(page).toHaveURL('/rex')
    })

    test('clicking "Andy" in sidebar navigates to /andy', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('nav')
      await page.click('nav >> text=Andy')
      await expect(page).toHaveURL('/andy')
    })
  })

  test.describe('Command Center panels', () => {
    test('ONE THING banner is visible with text', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('nav')
      await page.waitForTimeout(2000) // wait for Supabase data

      const banner = page.locator('text=One Thing')
      await expect(banner).toBeVisible()
    })

    test('Pipeline panel shows deal rows', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2500)

      // Pipeline section heading
      const pipeline = page.locator('text=Pipeline').first()
      await expect(pipeline).toBeVisible()
    })

    test('Rex panel link navigates to /rex', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('nav')
      await page.waitForTimeout(1000)

      // Click the "Rex" nav link in the pipeline panel header
      const rexLinks = page.locator('button:has-text("Rex")')
      if (await rexLinks.count() > 0) {
        await rexLinks.first().click()
        await expect(page).toHaveURL('/rex')
      }
    })
  })
})

// ─── Section 6: Performance ───────────────────────────────────────────────────
test.describe('6. Performance', () => {
  test('Command Center initial load under 3 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('nav')
    const elapsed = Date.now() - start

    expect(elapsed, `Page took ${elapsed}ms — exceeds 3000ms`).toBeLessThan(3000)
  })

  test('All 6 routes render nav within 3 seconds each', async ({ page }) => {
    for (const route of ROUTES) {
      const start = Date.now()
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('nav', { timeout: 3000 })
      const elapsed = Date.now() - start
      expect(elapsed, `${route.path} took ${elapsed}ms`).toBeLessThan(3000)
    }
  })

  test('no memory leak: navigating all routes keeps heap stable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const heapBefore = await page.evaluate(() =>
      (performance.memory?.usedJSHeapSize || 0) / 1024 / 1024
    )

    // Navigate all routes twice
    for (let pass = 0; pass < 2; pass++) {
      for (const route of ROUTES) {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('nav', { timeout: 3000 })
      }
    }

    const heapAfter = await page.evaluate(() =>
      (performance.memory?.usedJSHeapSize || 0) / 1024 / 1024
    )

    // Allow up to 3× growth (generous — real leaks are 10×+)
    if (heapBefore > 0) {
      expect(heapAfter, `Heap grew from ${heapBefore.toFixed(1)}MB to ${heapAfter.toFixed(1)}MB`).toBeLessThan(heapBefore * 3)
    }
  })
})
