import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { env } from 'node:process'
import { chromium } from 'playwright'
import { preview } from 'vite'

let server
let browser
let baseURL

before(async () => {
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  baseURL = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ executablePath: env.CHROMIUM_EXECUTABLE_PATH || undefined })
})

after(async () => {
  await browser?.close()
  if (server) await new Promise((resolve, reject) => {
    server.httpServer.close((error) => error ? reject(error) : resolve())
    server.httpServer.closeAllConnections()
  })
})

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`production app renders without JavaScript errors at ${viewport.width}px`, async () => {
    const context = await browser.newContext({ viewport })
    try {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))

      for (const route of ['/', '/login']) {
        await page.goto(`${baseURL}${route}`)
        // Report module initialization failures directly instead of a locator timeout.
        assert.deepEqual(errors, [], 'Uncaught browser errors')
        await page.getByRole('heading', { name: 'Iniciar sesión', exact: true }).waitFor({ timeout: 5000 })
        assert.equal(await page.getByLabel('Correo institucional').isVisible(), true)
        assert.equal(await page.getByRole('button', { name: 'Entrar', exact: true }).isVisible(), true)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
        assert.deepEqual(errors, [], 'Uncaught browser errors')
      }
    } finally {
      await context.close()
    }
  })
}
