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
 */

module.exports = {
    /**
     * Get the Assistant settings from the RED instance.
     * @param {Object} RED - The RED instance
     * @returns {AssistantSettings} - The Assistant settings
     */
    getSettings: (RED) => {
        const assistantSettings = (RED.settings.flowforge && RED.settings.flowforge.assistant) || {}
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
        return assistantSettings
    }
}
