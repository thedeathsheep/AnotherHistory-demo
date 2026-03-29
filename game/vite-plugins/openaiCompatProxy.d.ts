/**
 * Browser CORS bypass for any OpenAI-compatible /v1/* API.
 * Client sends requests to same-origin /__openai_compat_proxy/... with header
 * X-OpenAI-Compat-Base: https://gateway.example.com/v1
 * Only active under Vite dev / vite preview (not static file / Electron).
 */
import type { Plugin } from 'vite';
export declare function openAiCompatProxyPlugin(): Plugin;
