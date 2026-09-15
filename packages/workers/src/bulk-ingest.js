import { ContentStore } from './store.js'
import { IngestPipeline } from './pipeline.js'
import { createBuiltinConnectors } from './connectors.js'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const STATUS_FILE = join(import.meta.dir, '..', 'data', 'ingest-status.json')
const DATA_DIR = process.env.DATA_DIR

async function main() {
  const store = new ContentStore({ dataDir: DATA_DIR })
  await store.load()
  console.log(`\nContent: ${store.size()} items\n`)

  const pipeline = new IngestPipeline({ store })
  const builtinConnectors = createBuiltinConnectors({ youtube: { limit: 500 } })
  for (const [name, connector] of builtinConnectors) pipeline.registerConnector(name, connector)

  // All channels from the user
  const channels = [
    ['OneRSAC', ['PLeUGLKUYzh_gVdsnw6tRhS-gbhn2BE3TU','PLeUGLKUYzh_gNyxARzYLf1kw3YQoJ-zI_','PLeUGLKUYzh_hfsCaN8JADnYdnBbcaly7h','PLeUGLKUYzh_jkQWxy7pnM5mTX0bVkdkcv','PLeUGLKUYzh_hwrPP70qIY-NzRRx1JghWq','PLeUGLKUYzh_jvrIo3-V4emZRj1jHesTKG','PLeUGLKUYzh_juORbP5nIeekT8rU5mCZHd','PLeUGLKUYzh_h-v6CcGSn7xbjXOz2qK_4_','PLeUGLKUYzh_i5u1dGjDuCnnK4uda2cOSo','PLeUGLKUYzh_isd7gTQZ50zsFcmf78cIx2','PLeUGLKUYzh_jpyt_GNBgdOl59F7asEvOK']],
    ['DEF CON', ['PL9fPq3eQfaaBt0rnb2jKk8nZ0mCEYThD5','PLUKFdhkmtGBg','PLDWTIMqT0FMU','PLHNz-wMcmx0g']],
    ['BlackHat', ['PLH15HpR5qRsV2HXnhRJWcAmWoVW2dupVC','PLH15HpR5qRsXtV3t9TlkRZBmIfcIC6THE','PLH15HpR5qRsUiLYPNSylDvlskvS_RSzee','PLH15HpR5qRsWalnnt-9eYELxbEcYBPB6I','PLH15HpR5qRsVKcKwvIl-AzGfRqKyx--zq','PLH15HpR5qRsUM_MtDv3BKjCViY3L0zGDX','PLH15HpR5qRsXE_4kOSy_SXwFkFQre4AV_','PLH15HpR5qRsWoBx8EMeECDfVYWrsEdy7E','PLH15HpR5qRsWXApxW0vAsRduq9xa3ifCG','PLH15HpR5qRsWJ70J405J7z1GUYPeCBpXy','PLH15HpR5qRsVYkxRzpOFrQTjNGXuYVpis','PLH15HpR5qRsW2vrD-6pHklASq8T_CPZBv','PLH15HpR5qRsWwc5RANR9knvWpotKVXPWm','PLH15HpR5qRsXx69nei1C1BMC5MdvZm12I','PLH15HpR5qRsWPWBB9geQyXPXzbPu8cQ0p','PLH15HpR5qRsVY4gZPQrkdVBeR_BwNujGe','PLH15HpR5qRsW62N-GLRb1q56Zr7sm10rF','PLH15HpR5qRsUoH6UyxRWGry4ZYUABtc2Y']],
    ['SecurityFest', ['PL0Jph6SmWIuMUu5O_5r9K-xX3MNK2o9ts','PL0Jph6SmWIuOWy5yXAU4Ndg95VdGtPJXe','PL0Jph6SmWIuNB5m-1jjmSUo5YeFpkg1mu','PL0Jph6SmWIuMmZpl5NVjPQ_uDXHYw5Jii','PL0Jph6SmWIuOHPAuHLP6UD3nENl695bua','PL0Jph6SmWIuM5tGiYCVpL6SoXIuyMm8uS','PL0Jph6SmWIuOVTh9FNDrMi_U3ce5H-oUC','PL0Jph6SmWIuOkgnkgNcsQi3y_1XA3X0TS','PL0Jph6SmWIuMUpeiKHHFWUuWiK3qiAjpZ']],
    ['GambiConf', ['PL5Vh5eXgFvesEYBZ4MMf1SE4G2VnmL-IV','PL5Vh5eXgFveu9VwVjTL-8ZHC7WTcqbjen','PL5Vh5eXgFvesu0Y9izrwaxCYxH_J0iY77','PL5Vh5eXgFvetvlqkc6mzw8PfOezNi65zQ','PL5Vh5eXgFvevzPOLj69uO_etMCHVHvvRf','PL5Vh5eXgFvesnLgUOXq2SJ24qEOaf5Luc']],
    ['SEC-T', ['PLv84MTo7Io21kB6a1-AGFqHxpXdYIwPLJ','PLv84MTo7Io20NL8jnkJYJX2CKr_lUfJRs','PLv84MTo7Io20Vdg0ExpfmiHnR-TZtybTR','PLv84MTo7Io21cJeKjMpzcMXWmUV1tCHRQ','PLv84MTo7Io23Kx8nP_gSjioliRvLerLwG','PLv84MTo7Io21CM2ukljptEbXSlnCHFMHX','PLv84MTo7Io22ie-YTCTG69HAvNZflFZ9M','PLv84MTo7Io20dgapHt6NFizz1t7Oe4wfN','PLv84MTo7Io22uFItZG8gZ5w48878L1aWT','PLv84MTo7Io22MLPuDJ-YIxskBc4V0bAeu','PLv84MTo7Io21NF0qJgDEHYYXC5GpVefba','PLv84MTo7Io20Vdp6rtoTzwfT6xFMm-FSD','PLv84MTo7Io224pPcASGlEXETugdYBOtLC','PLv84MTo7Io20qPshsN-Smn3IFTAEqOSQV','PLv84MTo7Io20dN0AYh-YVF56tAEWBM050']],
    ['Ekoparty', ['PLaIv9WEAzYZM3roGB4fOJw9nYHuydmpFq','PLaIv9WEAzYZNHzGuB4F8i-dfYhQmwLB4e']],
    ['BSidesAthens', ['PL7WzoM1ttDZj6febhQk4MN6FmHFCEEZvt','PL7WzoM1ttDZj7OY5rY_Gr5AeyGQhiTS9y','PL7WzoM1ttDZhJTJpU-A5-MeAk8d44iqiL','PL7WzoM1ttDZialSdr0WnsuTtRbIKiVpJN','PL7WzoM1ttDZi9TThoAbcbE3jxEIhbqXLh','PL7WzoM1ttDZgjQN4F3fwO0sMYF7sK_tYN','PL7WzoM1ttDZhp3c-oLu2X9tpPXC0TnqF4','PL7WzoM1ttDZhVSsKhXmEFJoEb54j18rx0','PL7WzoM1ttDZimt4rkUICVx9PsVn-zQdmo','PL7WzoM1ttDZj60AV0H_apqcbSOJCz2HQ7']],
    ['ICS Village', ['PLJC7nqg8UUJuGJ3AF3SYQrMXrtsPwYPLI','PLJC7nqg8UUJtf6Svvqbj9Wy4xLSIsab76','PLJC7nqg8UUJt4o1aia40rxWnb4ml6LR5h','PLJC7nqg8UUJuhrmbCqthvNZNGTVg0fb_y']],
    ['MITRE', ['PLLGRmm150VfCZpPAH9NQciJtgAv47Glig','PLLGRmm150VfA8ahybY6XdDGtbCkoBNyyn']],
    ['EMF', ['PL1Hr6VkuONaHvvLPgjFn3uUEl4xH6xUhQ','PL1Hr6VkuONaECQTb0-TxGPVrQomXTWhbm','PL1Hr6VkuONaE4XM52ThiV-s3vXAUT0JCR','PL1Hr6VkuONaHIKlU5hqVU28jGyK6qAfjX','PL1Hr6VkuONaHy8EZtLIXIMZQ858315pmt']],
  ]

  let grandTotal = 0, grandDupes = 0, done = 0
  const total = channels.reduce((s, c) => s + c[1].length, 0)
  console.log(`${total} playlists across ${channels.length} channels\n`)

  function saveStatus() {
    writeFileSync(STATUS_FILE, JSON.stringify({ done, total, grandTotal, grandDupes, storeSize: store.size(), updated: new Date().toISOString() }))
  }

  for (const [name, playlists] of channels) {
    for (const pid of playlists) {
      done++
      process.stdout.write(`[${done}/${total}] ${name}... `)
      try {
        const s = await pipeline.run('youtube', { upsert: true, playlistId: pid })
        console.log(`+${s.added} (${s.duplicates} dupes)`)
        grandTotal += s.added; grandDupes += s.duplicates
      } catch (e) {
        console.log(`ERR: ${e.message}`)
      }
      saveStatus()
    }
  }

  // Copy to ingest dir
  const { execSync } = await import('node:child_process')
  execSync(`cp -n ${DATA_DIR || 'packages/workers/data'}/conferences/youtube/*.json packages/ingest/data/conferences/youtube/ 2>/dev/null || true`)

  console.log(`\n=== DONE ===`)
  console.log(`Added: ${grandTotal}  Dupes: ${grandDupes}  Store: ${store.size()}`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
