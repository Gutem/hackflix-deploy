/**
 * Phase 2: Continue ingesting remaining playlists.
 */
import { ContentStore } from './store.js'
import { IngestPipeline } from './pipeline.js'
import { createBuiltinConnectors } from './connectors.js'

const REMAINING = [
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-IJZwrOjAKt8lYLC2sgDbQ-', label: 'Navaja Negra XII (retry)' },
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-Jf4xpmqL3YSviNPTIWaOar', label: 'Navaja Negra XI (retry)' },
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-I3rbihBROcvUoSZ95BARPW', label: 'Navaja Negra VIII (retry)' },
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-LvckMoa60ixab3zSreYQmx', label: 'Navaja Negra III (retry)' },
  { conf: 'hackit', id: 'PLxRWg8ULebmyuVFJG-EjNFPnKK_uxSNa6', label: 'HackIT 2018' },
  { conf: 'hackit', id: 'PLxRWg8ULebmwAZzzYyY23SPAV_Y0S_9DV', label: 'HackIT 2017' },
  { conf: 'hackit', id: 'PLxRWg8ULebmzPnxjryZTcf6SS6TIK5vwV', label: 'HackIT 2016' },
  { conf: 'hackit', id: 'PLxRWg8ULebmzT4O36FwxCXr9dilrQD2h0', label: 'HackIT 2015' },
  { conf: 'camp-plus-plus', id: 'PLoApmOGyM5MXj5CRKZ9mlKlHaMFNLBHLv', label: 'Camp++ 2017' },
  { conf: 'cairo-security-camp', id: 'PLEM-Gz73yUqWTW4mqnCRH-yp1ACiIGxU9', label: 'Cairo Security Camp 2019' },
  { conf: 'cairo-security-camp', id: 'PLEM-Gz73yUqX6u6WMLEpTCUbdfY3DJCTK', label: 'Cairo Security Camp 2018' },
  { conf: 'cairo-security-camp', id: 'PLEM-Gz73yUqXPLYiuRwGfLzs-kw2XZDXD', label: 'Cairo Security Camp 2017' },
  { conf: 'cairo-security-camp', id: 'PLEM-Gz73yUqW8CrQLUCrVTi36nsw4TaXK', label: 'Cairo Security Camp 2016' },
  { conf: 'cairo-security-camp', id: 'PLEM-Gz73yUqWL97CHshZdVChxNXUpruDz', label: 'Cairo Security Camp 2015' },
  { conf: 'secure', id: 'PLghf5UNZbzG1Zv8106zI-B0gQilMsLAdj', label: 'SECURE Early Bird 2022' },
  { conf: 'secure', id: 'PLghf5UNZbzG3aZInltjF9Eu33iPaNpMxu', label: 'SECURE 2021' },
  { conf: 'secure', id: 'PLghf5UNZbzG0qaxuPeJltFqnjj8QxMgrG', label: 'SECURE Early Bird 2021' },
  { conf: 'secure', id: 'PLghf5UNZbzG0SaHAxxHq_lKMb5JUY424t', label: 'SECURE 2020' },
  { conf: 'secure', id: 'PLghf5UNZbzG2i6fHL0l2yduCoN9K2sti-', label: 'SECURE 2019' },
  { conf: 'secure', id: 'PLghf5UNZbzG1aVr36wA2v7FKhkBqbDftl', label: 'SECURE 2018' },
  { conf: 'secure', id: 'PLghf5UNZbzG25kd7P46gAw3mzdYapre8V', label: 'SECURE 2016' },
  { conf: 'secure', id: 'PLghf5UNZbzG0zLarfwpw4PxPTS0IWo8vB', label: 'SECURE 2015' },
  { conf: 'secure', id: 'PLghf5UNZbzG1Yg2eAcD7-MLnZh6pR0jrI', label: 'SECURE 2014' },
  { conf: 'secure', id: 'PLghf5UNZbzG23ESCR-a9TJYx7eh6YOHWK', label: 'SECURE 2013' },
  { conf: 'haxogreen', id: 'PLuok1vTTOAPSpYwzttmIwlxsfnchxPFSV', label: 'HaxoGreen 2016' },
  { conf: 'haxogreen', id: 'PLuok1vTTOAPRZ1LYAVkxohF1sJBNPLu4F', label: 'HaxoGreen 2018' },
]

async function main() {
  console.log(`Ingesting ${REMAINING.length} remaining YouTube playlists...\n`)
  const store = new ContentStore({ dataDir: process.env.DATA_DIR })
  await store.load()
  console.log(`Store has ${store.size()} items before starting\n`)

  const pipeline = new IngestPipeline({ store })
  const builtinConnectors = createBuiltinConnectors({
    youtube: { limit: 500 },
  })
  for (const [name, connector] of builtinConnectors) {
    pipeline.registerConnector(name, connector)
  }

  let totalAdded = 0
  let totalDupes = 0

  for (let i = 0; i < REMAINING.length; i++) {
    const pl = REMAINING[i]
    const label = `[${i + 1}/${REMAINING.length}] ${pl.label}`
    process.stdout.write(`${label}... `)
    try {
      const stats = await pipeline.run('youtube', { upsert: true, playlistId: pl.id })
      console.log(`+${stats.added} added, ${stats.duplicates} dupes`)
      totalAdded += stats.added
      totalDupes += stats.duplicates
    } catch (e) {
      console.log(`FAILED: ${e.message}`)
    }
    if (i < REMAINING.length - 1) await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n=== Done ===`)
  console.log(`Total added: ${totalAdded}`)
  console.log(`Store total: ${store.size()}`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
