/** @deprecated Prefer importing from @/aiSettings */
export {
  getApiKey,
  rememberUserApiKey,
  rememberAiSettings,
  clearStoredApiKeyOnly,
  clearUserApiKeyFromStorage,
  getOpenAiBaseUrlSync,
  getGateFormDefaults,
  normalizeOpenAiBaseUrl,
  hydrateAiSettingsFromElectron,
  DEFAULT_OPENAI_BASE,
  DEFAULT_MODEL_SUGGESTION,
} from './aiSettings'
