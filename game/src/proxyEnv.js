export function readProxyEnv(name, env) {
    if (env === void 0) { env = process.env; }
    return env[name] || env[name.toLowerCase()];
}
export function getProxyUrlForTarget(dest, env) {
    if (env === void 0) { env = process.env; }
    if (dest.protocol === 'https:') {
        return (readProxyEnv('HTTPS_PROXY', env) ||
            readProxyEnv('ALL_PROXY', env) ||
            readProxyEnv('HTTP_PROXY', env) ||
            null);
    }
    if (dest.protocol === 'http:') {
        return readProxyEnv('HTTP_PROXY', env) || readProxyEnv('ALL_PROXY', env) || null;
    }
    return null;
}
