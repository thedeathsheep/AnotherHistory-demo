import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveOpenAiFetchTarget } from '@/aiSettings'

function setWindowMock(origin: string, protocol: string, isElectron: boolean): void {
  vi.stubGlobal('window', {
    location: { origin, protocol },
    electronAPI: isElectron ? { isElectron: true } : undefined,
  })
}

describe('resolveOpenAiFetchTarget', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses same-origin proxy for browser dev', () => {
    setWindowMock('http://localhost:5173', 'http:', false)
    const target = resolveOpenAiFetchTarget('https://api.openai.com/v1')
    expect(target.urlBase).toBe('http://localhost:5173/__openai_compat_proxy')
    expect(target.headers['X-OpenAI-Compat-Base']).toBe('https://api.openai.com/v1')
  })

  it('also uses same-origin proxy for Electron when page is served over http', () => {
    setWindowMock('http://localhost:5173', 'http:', true)
    const target = resolveOpenAiFetchTarget('https://api.openai.com/v1')
    expect(target.urlBase).toBe('http://localhost:5173/__openai_compat_proxy')
    expect(target.headers['X-OpenAI-Compat-Base']).toBe('https://api.openai.com/v1')
  })

  it('keeps direct upstream URL for file-protocol packaged Electron', () => {
    setWindowMock('file://app', 'file:', true)
    const target = resolveOpenAiFetchTarget('https://api.openai.com/v1')
    expect(target.urlBase).toBe('https://api.openai.com/v1')
    expect(target.headers).toEqual({})
  })
})
