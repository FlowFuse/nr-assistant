module.exports = (RED) => {
    const assistant = require('./lib/assistant.js')

    RED.plugins.registerPlugin('flowfuse-nr-assistant', {
        type: 'assistant',
        name: 'Node-RED Assistant Plugin',
        icon: 'font-awesome/fa-magic',
        settings: {
            '*': { exportable: true }
        },
        onadd: function () {
            const assistantSettings = require('./lib/settings.js').getSettings(RED)
            if (!assistant.isInitialized && !assistant.isLoading) {
                assistant.init(RED, assistantSettings).then(() => {
                    // All good, the assistant is initialized.
                    // Any info messages made during initialization are logged in the assistant module
                }).catch((error) => {
                    RED.log.error('Failed to initialize FlowFuse Assistant Plugin:', error)
                })
            }
        }
    })
}
