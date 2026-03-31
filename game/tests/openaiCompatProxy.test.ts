import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProxyUrlForTarget } from '@/proxyEnv'

describe('openAiCompatProxy proxy env selection', () => {
  const original = { ...process.env }

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...original }
  })

  it('prefers HTTPS_PROXY for https upstreams', () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:10808'
    process.env.HTTP_PROXY = 'http://127.0.0.1:9999'
    expect(getProxyUrlForTarget(new URL('https://api.openai.com/v1/models'))).toBe(
      'http://127.0.0.1:10808'
    )
  })

  it('uses HTTP_PROXY for http upstreams', () => {
    process.env.HTTP_PROXY = 'http://127.0.0.1:10808'
    expect(getProxyUrlForTarget(new URL('http://example.test/v1/models'))).toBe(
      'http://127.0.0.1:10808'
    )
  })

  it('returns null when no proxy env is configured', () => {
    delete process.env.HTTP_PROXY
    delete process.env.HTTPS_PROXY
    delete process.env.ALL_PROXY
    expect(getProxyUrlForTarget(new URL('https://api.openai.com/v1/models'))).toBeNull()
  })
})
