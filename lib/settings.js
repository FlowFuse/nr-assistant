module.exports = {
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
            enabled: false,
            modelUrl: '',
            vocabularyUrl: ''
        }
        return assistantSettings
    }
}
