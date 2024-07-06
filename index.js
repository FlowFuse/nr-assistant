module.exports = (RED) => {
    const { default: got } = require('got')
    RED.plugins.registerPlugin('flowfuse-nr-assistant', {
        type: 'assistant',
        name: 'Node-RED Assistant Plugin',
        icon: 'font-awesome/fa-magic',
        settings: {
            '*': { exportable: true }
        },
        onadd: function () {
            const assistantSettings = RED.settings.flowforge?.assistant || { enabled: false }
            const clientSettings = {
                enabled: assistantSettings.enabled !== false && !!assistantSettings.url,
                requestTimeout: assistantSettings.requestTimeout || 60000
            }
            RED.comms.publish('nr-assistant/initialise', clientSettings, true /* retain */)

            if (!assistantSettings || !assistantSettings.enabled) {
                RED.log.info('FlowFuse Assistant Plugin is disabled')
                return
            }
            if (!assistantSettings.url) {
                RED.log.info('FlowFuse Assistant Plugin is missing url')
                return
            }

            RED.log.info('FlowFuse Assistant Plugin loaded')

            RED.httpAdmin.post('/nr-assistant/:method', RED.auth.needsPermission('write'), function (req, res) {
                const method = req.params.method
                // limit method to prevent path traversal
                if (!method || typeof method !== 'string' || /[^a-zA-Z0-9-_]/.test(method)) {
                    res.status(400)
                    res.json({ status: 'error', message: 'Invalid method' })
                    return
                }
                const input = req.body
                if (!input || !input.prompt || typeof input.prompt !== 'string') {
                    res.status(400)
                    res.json({ status: 'error', message: 'prompt is required' })
                    return
                }
                const body = {
                    prompt: input.prompt, // this is the prompt to the AI
                    promptHint: input.promptHint, // this is used to let the AI know what we are generating (`function node? Node JavaScript? flow?)
                    context: input.context, // this is used to provide additional context to the AI (e.g. the selected text of the function node)
                    transactionId: input.transactionId // used to correlate the request with the response
                }
                // join url & method (taking care of trailing slashes)
                const url = `${assistantSettings.url.replace(/\/$/, '')}/${method.replace(/^\//, '')}`
                got.post(url, {
                    headers: {
                        Accept: '*/*',
                        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,es;q=0.7',
                        Authorization: `Bearer ${assistantSettings.token}`,
                        'Content-Type': 'application/json'
                    },
                    json: body
                }).then(response => {
                    const data = JSON.parse(response.body)
                    res.json({
                        status: 'ok',
                        data
                    })
                }).catch((error) => {
                    const errorData = { status: 'error', message: 'Request to FlowFuse Assistant was unsuccessful', body: error.response?.body }
                    const errorCode = error.response?.statusCode || 500
                    res.status(errorCode).json({ status: 'error', message: errorData })
                    console.warn('nr-assistant error:', error)
                    RED.log.warn('FlowFuse Assistant request was unsuccessful')
                })
            })
        }
    })
}
