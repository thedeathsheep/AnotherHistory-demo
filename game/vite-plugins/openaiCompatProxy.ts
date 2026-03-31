/**
 * Browser CORS bypass for any OpenAI-compatible /v1/* API.
 * Client sends requests to same-origin /__openai_compat_proxy/... with header
 * X-OpenAI-Compat-Base: https://gateway.example.com/v1
 * Only active under Vite dev / vite preview (not static file / Electron).
 */

import type { Connect, Plugin } from 'vite'
import httpProxy from 'http-proxy'
import { HttpProxyAgent } from 'http-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { OPENAI_COMPAT_PROXY_PREFIX } from '../src/openaiProxyConstants'
import { getProxyUrlForTarget } from '../src/proxyEnv'

const HEADER = 'x-openai-compat-base'

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  secure: true,
})

function getProxyAgentForTarget(dest: URL) {
  const proxyUrl = getProxyUrlForTarget(dest)
  if (!proxyUrl) return undefined
  return dest.protocol === 'https:'
    ? new HttpsProxyAgent(proxyUrl)
    : new HttpProxyAgent(proxyUrl)
}

proxy.on('error', (err, _req, res) => {
  const r = res as { headersSent?: boolean; writeHead?: (c: number) => void; end?: (m?: string) => void }
  if (r?.headersSent || typeof r?.writeHead !== 'function') return
  try {
    r.writeHead(502)
    r.end?.(err?.message ?? 'Proxy error')
  } catch {
    /* ignore */
  }
})

function middleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const rawUrl = req.url ?? ''
    if (!rawUrl.startsWith(OPENAI_COMPAT_PROXY_PREFIX)) return next()

    const rawBase = req.headers[HEADER] as string | undefined
    if (!rawBase?.trim()) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('Missing X-OpenAI-Compat-Base header')
      return
    }

    delete req.headers[HEADER]
    delete req.headers['X-OpenAI-Compat-Base']

    const normalized = rawBase.trim().replace(/\/+$/, '')
    let pathUrl: URL
    try {
      pathUrl = new URL(rawUrl, 'http://vite.internal')
    } catch {
      res.statusCode = 400
      res.end('Invalid proxy path')
      return
    }

    const afterPrefix = pathUrl.pathname.slice(OPENAI_COMPAT_PROXY_PREFIX.length).replace(/^\//, '')
    const rel = (afterPrefix || 'models') + (pathUrl.search || '')

    let dest: URL
    try {
      const baseForJoin = normalized.endsWith('/') ? normalized : `${normalized}/`
      dest = new URL(rel, baseForJoin)
    } catch {
      res.statusCode = 400
      res.end('Invalid OpenAI-compat base URL')
      return
    }

    if (dest.protocol !== 'http:' && dest.protocol !== 'https:') {
      res.statusCode = 400
      res.end('Only http/https upstream allowed')
      return
    }

    req.url = dest.pathname + (dest.search || '')

    proxy.web(
      req,
      res,
      {
        target: `${dest.protocol}//${dest.host}`,
        agent: getProxyAgentForTarget(dest),
        secure: dest.protocol === 'https:',
      },
      (err) => {
      if (err && !res.headersSent) {
        res.statusCode = 502
        res.end(err.message)
      } else if (err) {
        next(err)
      }
      }
    )
  }
}

export function openAiCompatProxyPlugin(): Plugin {
  return {
    name: 'openai-compat-cors-proxy',
    configureServer(server) {
      server.middlewares.use(middleware())
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware())
    },
  }
}
