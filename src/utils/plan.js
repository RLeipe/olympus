// Loads the plan files bundled with the app: plan/<user name lowercase>/YYYY-MM.yaml
import { parsePlanFile, mergePlans } from './planCore'

const files = import.meta.glob('../../plan/*/*.yaml', { query: '?raw', import: 'default', eager: true })

const plansByUser = {}
for (const [path, text] of Object.entries(files)) {
  const [, user, fileName] = path.match(/plan\/([^/]+)\/([^/]+)$/)
  plansByUser[user] = plansByUser[user] || []
  plansByUser[user].push(parsePlanFile(text, `${user}/${fileName}`))
}

const EMPTY = { sessions: [], errors: [], warnings: [] }

export function getPlan(userName) {
  const parsed = plansByUser[userName?.toLowerCase()]
  return parsed ? mergePlans(parsed) : EMPTY
}
