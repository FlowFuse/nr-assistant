module.exports = (RED) => {
    const { default: got } = require('got')
    const { z } = require('zod')

    /** @type {import('@modelcontextprotocol/sdk/client/index.js').Client} */
    let mcpClient = null
    /** @type {import('@modelcontextprotocol/sdk/server/index.js').Server} */
    // eslint-disable-next-line no-unused-vars
    let mcpServer = null

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

            if (clientSettings.enabled) {
                mcp().then(({ client, server }) => {
                    RED.log.info('FlowFuse Assistant MCP Client / Server initialized')
                    mcpClient = client
                    mcpServer = server
                    // tell frontend that the MCP client is ready so it can add the action(s) to the Action List
                    RED.comms.publish('nr-assistant/mcp/ready', clientSettings, true /* retain */)
                }).catch((error) => {
                    mcpClient = null
                    mcpServer = null
                    const nodeVersion = process.versions.node
                    // ESM Support in Node 20 is much better than versions v18-, so lets include a node version
                    // warning as a hint/prompt (Node 18 is EOL as of writing this)
                    if (parseInt(nodeVersion.split('.')[0], 10) < 20) {
                        RED.log.error('Failed to initialize FlowFuse Assistant MCP Client / Server. This may be due to using Node.js version < 20.', error)
                    } else {
                        RED.log.error('Failed to initialize FlowFuse Assistant MCP Client / Server.', error)
                    }
                })
            }

            RED.log.info('FlowFuse Assistant Plugin loaded')

            RED.httpAdmin.post('/nr-assistant/:method', RED.auth.needsPermission('write'), function (req, res) {
                const method = req.params.method
                // limit method to prevent path traversal
                if (!method || typeof method !== 'string' || /[^a-z0-9-_]/.test(method)) {
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
                    let body = error.response?.body
                    if (typeof body === 'string') {
                        try {
                            body = JSON.parse(body)
                        } catch (e) {
                            // ignore
                        }
                    }
                    let message = 'FlowFuse Assistant request was unsuccessful'
                    const errorData = { status: 'error', message, body }
                    const errorCode = error.response?.statusCode || 500
                    res.status(errorCode).json(errorData)
                    RED.log.trace('nr-assistant error:', error)
                    if (body && typeof body === 'object' && body.error) {
                        message = `${message}: ${body.error}`
                    }
                    RED.log.warn(message)
                })
            })

            RED.httpAdmin.get('/nr-assistant/mcp/prompts', RED.auth.needsPermission('write'), async function (req, res) {
                if (!mcpClient) {
                    res.status(500).json({ status: 'error', message: 'MCP Client is not initialized' })
                    return
                }
                try {
                    const prompts = await mcpClient.getPrompts()
                    res.json({ status: 'ok', data: prompts })
                } catch (error) {
                    RED.log.error('Failed to retrieve MCP prompts:', error)
                    res.status(500).json({ status: 'error', message: 'Failed to retrieve MCP prompts' })
                }
            })

            RED.httpAdmin.post('/nr-assistant/mcp/prompts/:promptId', RED.auth.needsPermission('write'), async function (req, res) {
                if (!mcpClient) {
                    res.status(500).json({ status: 'error', message: 'MCP Client is not initialized' })
                    return
                }
                const promptId = req.params.promptId
                if (!promptId || typeof promptId !== 'string') {
                    res.status(400).json({ status: 'error', message: 'Invalid prompt ID' })
                    return
                }
                const input = req.body
                if (!input || !input.nodes || typeof input.nodes !== 'string') {
                    res.status(400).json({ status: 'error', message: 'nodes selection is required' })
                    return
                }
                try {
                    const response = await mcpClient.getPrompt({
                        name: promptId,
                        arguments: {
                            nodes: input.nodes,
                            flowName: input.flowName ?? undefined,
                            userContext: input.userContext ?? undefined
                        }
                    })

                    const body = {
                        prompt: promptId, // this is the prompt to the AI
                        transactionId: input.transactionId, // used to correlate the request with the response
                        context: {
                            type: 'prompt',
                            promptId,
                            prompt: response
                        }
                    }

                    // join url & method (taking care of trailing slashes)
                    const url = `${assistantSettings.url.replace(/\/$/, '')}/mcp`
                    const responseFromAI = await got.post(url, {
                        headers: {
                            Accept: '*/*',
                            'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,es;q=0.7',
                            Authorization: `Bearer ${assistantSettings.token}`,
                            'Content-Type': 'application/json'
                        },
                        json: body
                    })
                    const responseBody = JSON.parse(responseFromAI.body)
                    // Assuming the response from the AI is in the expected format
                    if (!responseBody || responseFromAI.statusCode !== 200) {
                        res.status(responseFromAI.statusCode || 500).json({ status: 'error', message: 'AI response was not successful', data: responseBody })
                        return
                    }
                    // If the response is successful, return the data
                    res.json({
                        status: 'ok',
                        data: responseBody.data || responseBody // Use data if available, otherwise return the whole response
                    })
                } catch (error) {
                    RED.log.error('Failed to execute MCP prompt:', error)
                    res.status(500).json({ status: 'error', message: 'Failed to execute MCP prompt' })
                }
            })
        }
    })

    async function mcp () {
        const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
        const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js')
        const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')
        // Create in-process server
        const server = new McpServer({
            name: 'NR MCP Server',
            version: '1.0.0'
        })

        server.prompt('explain_flow', 'Explain what the selected node-red flow of nodes do', {
            nodes: z
                .string()
                .startsWith('[')
                .endsWith(']')
                .min(23) // Minimum length for a valid JSON array
                .max(100000) // on average, an exported node is ~400-1000 characters long, 100000 characters _should_ realistically be enough for a flow of 100 nodes
                .describe('JSON string that represents a flow of Node-RED nodes'),
            flowName: z.string().optional().describe('Optional name of the flow to explain'),
            userContext: z.string().optional().describe('Optional user context to aid explanation')
        }, async ({ nodes, flowName, userContext }) => {
            const promptBuilder = []
            // promptBuilder.push('Generate a JSON response containing 2 string properties: "summary" and "details". Summary should be a brief overview of what the following Node-RED flow JSON does, Details should provide a little more detail of the flow but should be concise and to the point. Use bullet lists or number lists if it gets too wordy.') // FUTURE: ask for a summary and details in JSON format
            promptBuilder.push('Generate a "### Summary" section, followed by a "### Details" section only. They should explain the following Node-RED flow json. "Summary" should be a brief TLDR, Details should provide a little more information but should be concise and to the point. Use bullet lists or number lists if it gets too wordy.')
            if (flowName) {
                promptBuilder.push(`The parent flow is named "${flowName}".`)
                promptBuilder.push('')
            }
            if (userContext) {
                promptBuilder.push(`User Context: "${userContext}".`)
                promptBuilder.push('')
            }
            promptBuilder.push('Here are the nodes in the flow:')
            promptBuilder.push('```json')
            promptBuilder.push(nodes)
            promptBuilder.push('```')
            return {
                messages: [{
                    role: 'user',
                    content: {
                        type: 'text',
                        text: promptBuilder.join('\n')
                    }
                }]
            }
        })

        // Create in-process client
        const client = new Client({
            name: 'NR MCP Client',
            version: '1.0.0'
        })

        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
        await Promise.all([
            server.connect(serverTransport),
            client.connect(clientTransport)
        ])

        return {
            client,
            server
        }
    }
}
