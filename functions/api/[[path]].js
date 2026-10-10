// Cloudflare Pages Functions entry: every /api/* request goes to the shared handler
import { handleApi } from '../../server/api.js'

export const onRequest = ({ request, env }) => handleApi(request, env)
