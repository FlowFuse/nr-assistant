const auth = require('./auth/index.js')

/**
 * @typedef {Object} AssistantSettings
 * @property {boolean} enabled - Whether the Assistant is enabled
 * @property {number} requestTimeout - The timeout for requests to the Assistant backend in milliseconds
 * @property {string} url - The URL of the Assistant server
 * @property {string} token - The authentication token for the Assistant server
 * @property {Object} [got] - The got instance to use for HTTP requests
 * @property {Object} completions - Settings for completions
 * @property {string} completions.modelUrl - The URL to the ML model
 * @property {string} completions.vocabularyUrl - The URL to the completions vocabulary lookup data
 * @property {Object} tables - Settings for tables
 * @property {Boolean} tables.enabled - Whether the tables feature is enabled
 * @property {Object} inlineCompletions - Settings for inline completions
 * @property {Boolean} inlineCompletions.enabled - Whether the inline completions feature is enabled
 */

module.exports = {
    /**
     * Get the Assistant settings from the RED instance.
     * @param {Object} RED - The RED instance
     * @returns {AssistantSettings} - The Assistant settings
     */
    getSettings: async (RED) => {
        if (RED.settings.flowforge?.assistant === undefined) {
            // No settings provided via settings.js; enable standalone mode
            const token = auth.getUserToken()
            if (token) {
                // There is a locally stored token, so enable the assistant with default settings
                const baseURL = RED.settings.flowfuse?.assistant?.url || 'https://app.flowfuse.com'
                return {
                    url: baseURL + '/api/v1/assistant/',
                    enabled: true,
                    standalone: true,
                    mcp: { enabled: true },
                    completions: {
                        enabled: true,
                        // TODO: what should these be?
                        modelUrl: null,
                        vocabularyUrl: null,
                        inlineEnabled: true
                    },
                    // Tables is not available outside of FF
                    tables: { enabled: false },
                    inlineCompletions: { enabled: true }
                }
            } else {
                // Not token, disable the assistant but in standalone mode
                return {
                    enabled: false,
                    standalone: true
                }
            }
        } else {
            const assistantSettings = RED.settings.flowforge?.assistant || {}
            if (assistantSettings.enabled !== true) {
                assistantSettings.enabled = false
                assistantSettings.completions = null // if the assistant is not enabled, completions should not be enabled
            }
            assistantSettings.mcp = assistantSettings.mcp || {
                enabled: true // default to enabled
            }
            assistantSettings.completions = assistantSettings.completions || {
                enabled: true, // default to enabled
                modelUrl: null,
                vocabularyUrl: null
            }
            assistantSettings.tables = {
                enabled: !!(RED.settings.flowforge?.tables?.token) // for MVP, use the presence of a token is an indicator that tables are enabled
            }
            assistantSettings.inlineCompletions = {
                enabled: !!assistantSettings.completions.inlineEnabled
            }

            if (assistantSettings.token) {
                auth.setStaticToken(assistantSettings.token)
            }
            return assistantSettings
        }
    }
}
