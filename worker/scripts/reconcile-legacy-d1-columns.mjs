#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const DEFAULT_TOTAL_STORAGE = 10 * 1024 * 1024 * 1024

const legacyColumns = [
  {
    table: 'files',
    column: 'multipart_upload_id',
    sql: 'ALTER TABLE files ADD COLUMN multipart_upload_id TEXT',
  },
  {
    table: 'r2_configs',
    column: 'quota_bytes',
    sql: `ALTER TABLE r2_configs ADD COLUMN quota_bytes INTEGER NOT NULL DEFAULT ${DEFAULT_TOTAL_STORAGE}`,
  },
]

function printUsage() {
  console.error(
    'Usage: node ./scripts/reconcile-legacy-d1-columns.mjs --database <binding-or-name> (--local | --remote) [--config <path>]'
  )
}

function parseArgs(argv) {
  const options = {
    config: null,
    database: null,
    local: false,
    remote: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--config') {
      options.config = argv[index + 1] || null
      index += 1
      continue
    }
    if (arg === '--database') {
      options.database = argv[index + 1] || null
      index += 1
      continue
    }
    if (arg === '--local') {
      options.local = true
      continue
    }
    if (arg === '--remote') {
      options.remote = true
      continue
    }

    throw new Error(`unknown_argument:${arg}`)
  }

  if (!options.database || options.local === options.remote) {
    printUsage()
    process.exit(1)
  }

  return options
}

function buildWranglerArgs(options, extraArgs) {
  const args = ['wrangler']
  if (options.config) {
    args.push('--config', options.config)
  }

  args.push('d1', 'execute', options.database)
  args.push(...extraArgs)
  args.push(options.local ? '--local' : '--remote')

  if (options.remote) {
    args.push('--yes')
  }

  return args
}

function executeWrangler(options, extraArgs, { captureOutput = false } = {}) {
  const args = buildWranglerArgs(options, extraArgs)
  return execFileSync('npx', args, {
    encoding: 'utf8',
    stdio: captureOutput ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })
}

function readTableColumns(options, table) {
  const output = executeWrangler(
    options,
    ['--json', '--command', `PRAGMA table_info(${table})`],
    { captureOutput: true }
  )
  const payload = JSON.parse(output)
  const results = Array.isArray(payload) ? payload[0]?.results : []
  return Array.isArray(results)
    ? results.map((row) => String(row?.name || '')).filter(Boolean)
    : []
}

function reconcileColumn(options, definition) {
  const columns = readTableColumns(options, definition.table)
  if (columns.length === 0) {
    console.log(`[reconcile] skip ${definition.table}.${definition.column}: table not found yet`)
    return
  }

  if (columns.includes(definition.column)) {
    console.log(`[reconcile] keep ${definition.table}.${definition.column}: already present`)
    return
  }

  console.log(`[reconcile] add ${definition.table}.${definition.column}`)
  executeWrangler(options, ['--command', definition.sql])
}

const options = parseArgs(process.argv.slice(2))

for (const definition of legacyColumns) {
  reconcileColumn(options, definition)
}
