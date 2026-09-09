/*!
 * Copyright (c) 2026 Interop Alliance. All rights reserved.
 */
import { test, expect } from '@playwright/test'

// Smoke test: the derivation drives `globalThis.crypto.subtle` (digest,
// importKey, sign), so prove it runs in a real browser and matches the
// golden did:key pinned in the Node suite.
test('CapabilityAgent derives the golden did:key in the browser', async ({
  page
}) => {
  await page.goto('/test/index.html')
  const result = await page.evaluate(async () => {
    // This callback runs in the browser; '/src/index.ts' is a URL served by the
    // vite dev server, not a module path tsc can resolve from disk.
    // @ts-expect-error -- dev-server URL, resolved at runtime by vite
    const { CapabilityAgent } = await import('/src/index.ts')
    const agent = await CapabilityAgent.fromSecret({
      secret: 'correct horse battery staple',
      handle: 'urn:example:alice'
    })
    return { id: agent.id, hasSigner: Boolean(agent.getSigner()) }
  })
  expect(result.id).toBe(
    'did:key:z6MkiS4sLV7Z3bWoV8PtgrrwDy41H2PciiWYY6jXwCc7RmHh'
  )
  expect(result.hasSigner).toBe(true)
})
