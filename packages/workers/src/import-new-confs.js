/**
 * Import new conferences and their YouTube playlists.
 * Usage: bun run packages/workers/src/import-new-confs.js
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { ContentStore } from './store.js'
import { IngestPipeline } from './pipeline.js'
import { createBuiltinConnectors } from './connectors.js'
import { normalizeBatch } from './normalize.js'

const CONF_PATH = './packages/ingest/data/conferences.json'

const NEW_CONFERENCES = [
  {
    name: 'Navaja Negra',
    slug: 'navaja-negra',
    path: 'Navaja%20Negra/',
    description: 'Spanish security conference held in Albacete, Spain since 2013.',
    image: null,
  },
  {
    name: 'HackIT',
    slug: 'hackit',
    path: 'HackIT/',
    description: 'Ukrainian cybersecurity conference held in Kyiv/Kharkiv.',
    image: null,
  },
  {
    name: 'Camp++',
    slug: 'camp-plus-plus',
    path: 'Camp%2B%2B/',
    description: 'Hungarian hacker camp organized by Budapest Hackerspace.',
    image: null,
  },
  {
    name: 'Cairo Security Camp',
    slug: 'cairo-security-camp',
    path: 'Cairo%20Security%20Camp/',
    description: 'Egyptian information security conference held in Cairo.',
    image: null,
  },
  {
    name: 'SECURE',
    slug: 'secure',
    path: 'SECURE/',
    description: 'Polish security conference organized by CERT Polska.',
    image: null,
  },
  {
    name: 'HaxoGreen',
    slug: 'haxogreen',
    path: 'HaxoGreen/',
    description: 'Luxembourg hacker camp.',
    image: null,
  },
  {
    name: 'DEF CON',
    slug: 'def-con',
    path: 'DEF%20CON/',
    description: 'One of the world\'s largest hacker conventions, held annually in Las Vegas.',
    image: null,
  },
]

const PLAYLISTS = [
  // Navaja Negra
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-JfUYTKk7SYCzJzTnClaOt7', label: 'Navaja Negra 2025' },
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-IJZwrOjAKt8lYLC2sgDbQ-', label: 'Navaja Negra XII' },
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-Jf4xpmqL3YSviNPTIWaOar', label: 'Navaja Negra XI' },
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-LTer9NLQbuVQuJaQQD5lRf', label: 'Navaja Negra X' },
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-JTa4iuN_FKiPI4LYRUef-W', label: 'Navaja Negra IX' },
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-I3rbihBROcvUoSZ95BARPW', label: 'Navaja Negra VIII' },
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-JJUA7uFOYyulh_pm81D4U6', label: 'Navaja Negra IV' },
  { conf: 'navaja-negra', id: 'PLMfGwpRDVl-LvckMoa60ixab3zSreYQmx', label: 'Navaja Negra III' },
  // HackIT
  { conf: 'hackit', id: 'PLxRWg8ULebmyuVFJG-EjNFPnKK_uxSNa6', label: 'HackIT 2018' },
  { conf: 'hackit', id: 'PLxRWg8ULebmwAZzzYyY23SPAV_Y0S_9DV', label: 'HackIT 2017' },
  { conf: 'hackit', id: 'PLxRWg8ULebmzPnxjryZTcf6SS6TIK5vwV', label: 'HackIT 2016' },
  { conf: 'hackit', id: 'PLxRWg8ULebmzT4O36FwxCXr9dilrQD2h0', label: 'HackIT 2015' },
  // Camp++
  { conf: 'camp-plus-plus', id: 'PLoApmOGyM5MXj5CRKZ9mlKlHaMFNLBHLv', label: 'Camp++ 2017' },
  // Cairo Security Camp
  { conf: 'cairo-security-camp', id: 'PLEM-Gz73yUqWTW4mqnCRH-yp1ACiIGxU9', label: 'Cairo Security Camp 2019' },
  { conf: 'cairo-security-camp', id: 'PLEM-Gz73yUqX6u6WMLEpTCUbdfY3DJCTK', label: 'Cairo Security Camp 2018' },
  { conf: 'cairo-security-camp', id: 'PLEM-Gz73yUqXPLYiuRwGfLzs-kw2XZDXD', label: 'Cairo Security Camp 2017' },
  { conf: 'cairo-security-camp', id: 'PLEM-Gz73yUqW8CrQLUCrVTi36nsw4TaXK', label: 'Cairo Security Camp 2016' },
  { conf: 'cairo-security-camp', id: 'PLEM-Gz73yUqWL97CHshZdVChxNXUpruDz', label: 'Cairo Security Camp 2015' },
  // SECURE (CERT.pl)
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
  // HaxoGreen
  { conf: 'haxogreen', id: 'PLuok1vTTOAPSpYwzttmIwlxsfnchxPFSV', label: 'HaxoGreen 2016' },
  { conf: 'haxogreen', id: 'PLuok1vTTOAPRZ1LYAVkxohF1sJBNPLu4F', label: 'HaxoGreen 2018' },
]

async function main() {
  // Step 1: Add conferences to JSON
  console.log('Adding 7 new conferences to conferences.json...')
  const data = JSON.parse(readFileSync(CONF_PATH, 'utf-8'))
  const existing = new Set(data.conferences.map(c => c.slug))
  let added = 0
  for (const conf of NEW_CONFERENCES) {
    if (existing.has(conf.slug)) {
      console.log(`  SKIP ${conf.slug} (already exists)`)
      continue
    }
    data.conferences.push(conf)
    existing.add(conf.slug)
    added++
    console.log(`  + ${conf.name} (${conf.slug})`)
  }
  data.metadata.total = data.conferences.length
  data.metadata.lastUpdate = new Date().toISOString()
  writeFileSync(CONF_PATH, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`Added ${added} conferences. Total: ${data.conferences.length}\n`)

  // Step 2: Ingest all YouTube playlists
  console.log(`Ingesting ${PLAYLISTS.length} YouTube playlists...\n`)
  const store = new ContentStore({ dataDir: process.env.DATA_DIR })
  await store.load()
  
  const pipeline = new IngestPipeline({ store })
  const builtinConnectors = createBuiltinConnectors({
    youtube: { limit: 500 },
  })
  
  for (const [name, connector] of builtinConnectors) {
    pipeline.registerConnector(name, connector)
  }

  let totalAdded = 0
  let totalDupes = 0
  let failed = 0

  for (let i = 0; i < PLAYLISTS.length; i++) {
    const pl = PLAYLISTS[i]
    const label = `[${i + 1}/${PLAYLISTS.length}] ${pl.label}`
    process.stdout.write(`${label}... `)
    try {
      const stats = await pipeline.run('youtube', {
        upsert: true,
        playlistId: pl.id,
      })
      console.log(`+${stats.added} added, ${stats.duplicates} dupes`)
      totalAdded += stats.added
      totalDupes += stats.duplicates
    } catch (e) {
      console.log(`FAILED: ${e.message}`)
      failed++
    }
    // Small delay to avoid rate limiting
    if (i < PLAYLISTS.length - 1) await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n=== Done ===`)
  console.log(`Total added: ${totalAdded}`)
  console.log(`Total dupes: ${totalDupes}`)
  console.log(`Failed:      ${failed}`)
  console.log(`Store total: ${store.size()}`)
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
