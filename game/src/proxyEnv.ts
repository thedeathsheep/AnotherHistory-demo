export function readProxyEnv(
  name: string,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  return env[name] || env[name.toLowerCase()]
}

export function getProxyUrlForTarget(
  dest: URL,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  if (dest.protocol === 'https:') {
    return (
      readProxyEnv('HTTPS_PROXY', env) ||
      readProxyEnv('ALL_PROXY', env) ||
      readProxyEnv('HTTP_PROXY', env) ||
      null
    )
  }
  if (dest.protocol === 'http:') {
    return readProxyEnv('HTTP_PROXY', env) || readProxyEnv('ALL_PROXY', env) || null
  }
  return null
}
