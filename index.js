module.exports = (RED) => {
    const { default: got } = require('got')
    RED.log.info('Registering FlowFuse Node-RED Assistant Plugin...')
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
                enabled: assistantSettings.enabled !== false && !!assistantSettings.baseUrl,
                requestTimeout: assistantSettings.requestTimeout || 60000
            }
            RED.comms.publish('nr-assistant/initialise', clientSettings, true /* retain */)

            if (!assistantSettings || !assistantSettings.enabled) {
                RED.log.info('FlowFuse Node-RED Assistant Plugin is disabled')
                return
            }
            if (!assistantSettings.baseUrl) {
                RED.log.info('FlowFuse Node-RED Assistant Plugin is missing baseUrl')
                return
            }

            RED.log.info('FlowFuse Node-RED Assistant Plugin loaded')

            RED.httpAdmin.post('/nr-assistant/:method', RED.auth.needsPermission('write'), function (req, res) {
                const method = req.params.method || 'fn'
                // limit method to prevent path traversal
                if (/[^a-zA-Z0-9-_]/.test(method)) {
                    res.status(400)
                    res.json({ status: 'error', message: 'Invalid method' })
                    return
                }
                const input = req.body
                const prompt = input.prompt
                if (!input.prompt) {
                    res.status(400)
                    res.json({ status: 'error', message: 'prompt is required' })
                    return
                }
                const body = {
                    prompt, // this is the prompt to the AI
                    promptHint: input.promptHint, // this is used to let the AI know what we are generating (`function node? Node JavaScript? flow?)
                    context: input.context, // this is used to provide additional context to the AI (e.g. the selected text of the function node)
                    transactionId: input.transactionId // used to correlate the request with the response
                }
                // join url baseUrl & method (taking care of trailing slashes)
                const url = `${assistantSettings.baseUrl.replace(/\/$/, '')}/${method.replace(/^\//, '')}`
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
                    console.warn('nr-assistant error:', error)
                    RED.log.warn('Request to was FlowFuse assistant unsuccessful')
                })
            })
        }
    })
}
