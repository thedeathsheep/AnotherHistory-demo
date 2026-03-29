/**
 * Browser CORS bypass for any OpenAI-compatible /v1/* API.
 * Client sends requests to same-origin /__openai_compat_proxy/... with header
 * X-OpenAI-Compat-Base: https://gateway.example.com/v1
 * Only active under Vite dev / vite preview (not static file / Electron).
 */
import httpProxy from 'http-proxy';
import { OPENAI_COMPAT_PROXY_PREFIX } from '../src/openaiProxyConstants';
var HEADER = 'x-openai-compat-base';
var proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    secure: true,
});
proxy.on('error', function (err, _req, res) {
    var _a, _b;
    var r = res;
    if ((r === null || r === void 0 ? void 0 : r.headersSent) || typeof (r === null || r === void 0 ? void 0 : r.writeHead) !== 'function')
        return;
    try {
        r.writeHead(502);
        (_a = r.end) === null || _a === void 0 ? void 0 : _a.call(r, (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : 'Proxy error');
    }
    catch (_c) {
        /* ignore */
    }
});
function middleware() {
    return function (req, res, next) {
        var _a;
        var rawUrl = (_a = req.url) !== null && _a !== void 0 ? _a : '';
        if (!rawUrl.startsWith(OPENAI_COMPAT_PROXY_PREFIX))
            return next();
        var rawBase = req.headers[HEADER];
        if (!(rawBase === null || rawBase === void 0 ? void 0 : rawBase.trim())) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Missing X-OpenAI-Compat-Base header');
            return;
        }
        delete req.headers[HEADER];
        delete req.headers['X-OpenAI-Compat-Base'];
        var normalized = rawBase.trim().replace(/\/+$/, '');
        var pathUrl;
        try {
            pathUrl = new URL(rawUrl, 'http://vite.internal');
        }
        catch (_b) {
            res.statusCode = 400;
            res.end('Invalid proxy path');
            return;
        }
        var afterPrefix = pathUrl.pathname.slice(OPENAI_COMPAT_PROXY_PREFIX.length).replace(/^\//, '');
        var rel = (afterPrefix || 'models') + (pathUrl.search || '');
        var dest;
        try {
            var baseForJoin = normalized.endsWith('/') ? normalized : "".concat(normalized, "/");
            dest = new URL(rel, baseForJoin);
        }
        catch (_c) {
            res.statusCode = 400;
            res.end('Invalid OpenAI-compat base URL');
            return;
        }
        if (dest.protocol !== 'http:' && dest.protocol !== 'https:') {
            res.statusCode = 400;
            res.end('Only http/https upstream allowed');
            return;
        }
        req.url = dest.pathname + (dest.search || '');
        proxy.web(req, res, { target: "".concat(dest.protocol, "//").concat(dest.host) }, function (err) {
            if (err && !res.headersSent) {
                res.statusCode = 502;
                res.end(err.message);
            }
            else if (err) {
                next(err);
            }
        });
    };
}
export function openAiCompatProxyPlugin() {
    return {
        name: 'openai-compat-cors-proxy',
        configureServer: function (server) {
            server.middlewares.use(middleware());
        },
        configurePreviewServer: function (server) {
            server.middlewares.use(middleware());
        },
    };
}
