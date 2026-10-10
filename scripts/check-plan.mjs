// Validates all plan files: npm run check-plan
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parsePlanFile } from '../src/utils/planCore.js'

const planDir = new URL('../plan/', import.meta.url).pathname
let errors = 0
let warnings = 0
let sessions = 0

for (const user of readdirSync(planDir)) {
  const userDir = join(planDir, user)
  if (!statSync(userDir).isDirectory()) continue

  for (const file of readdirSync(userDir).filter(f => f.endsWith('.yaml')).sort()) {
    if (!/^\d{4}-\d{2}\.yaml$/.test(file)) {
      console.log(`warning: ${user}/${file}: file names should be YYYY-MM.yaml`)
      warnings++
    }
    const result = parsePlanFile(readFileSync(join(userDir, file), 'utf8'), `${user}/${file}`)
    for (const e of result.errors) console.log(`error: ${e}`)
    for (const w of result.warnings) console.log(`warning: ${w}`)
    errors += result.errors.length
    warnings += result.warnings.length
    sessions += result.sessions.length

    const month = file.slice(0, 7)
    for (const s of result.sessions) {
      if (!s.date.startsWith(month)) {
        console.log(`warning: ${user}/${file}: ${s.date} is not in ${month}`)
        warnings++
      }
    }
  }
}

console.log(`${sessions} sessions, ${errors} errors, ${warnings} warnings`)
process.exit(errors ? 1 : 0)
