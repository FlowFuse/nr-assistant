// a singleton instance of the Assistant class with an init method for accepting the RED instance
'use strict'

const { z } = require('zod')
const { getLongestUpstreamPath } = require('./flowGraph')
const { hasProperty } = require('./utils')
const semver = require('semver')

const PREDICTION_SEQUENCE_LENGTH = 5 // The length of the input sequence for the TensorFlow model

/**
 * @typedef {Object} AssistantSettings
 * @property {boolean} enabled - Whether the Assistant is enabled
 * @property {number} requestTimeout - The timeout for requests to the Assistant backend in milliseconds
 * @property {string} url - The URL of the Assistant server
 * @property {string} token - The authentication token for the Assistant server
 * @property {Object} [got] - The got instance to use for HTTP requests
 * @property {Object} completions - Settings for completions
 * @property {string} completions.modelUrl - The URL to the TensorFlow model
 * @property {string} completions.vocabularyUrl - The URL to the completions vocabulary lookup data
 */

class Assistant {
    constructor () {
        // Main properties
        /** @type {import('node-red').NodeRedInstance} */
        this.RED = null
        /** @type {import('got').Got} */
        this.got = null
        /** @type {AssistantSettings} */
        this.options = null
        this._loading = false // Flag to indicate if the Assistant is currently loading
        this._enabled = false // Flag to indicate if the Assistant is enabled

        // MCP Client and Server and associated properties
        /** @type {import('@modelcontextprotocol/sdk/client/index.js').Client} */
        this._mcpClient = null
        /** @type {import('@modelcontextprotocol/sdk/server/index.js').Server} */
        // eslint-disable-next-line no-unused-vars
        this._mcpServer = null
        this.mcpReady = false // Flag to indicate if MCP is ready

        // TensorFlow.js and associated properties (primarily for completions)
        /** @type {import('@tensorflow/tfjs')} */
        this._tf = null
        /** @type {import('@tensorflow/tfjs').LayersModel} */
        this._completionsModel = null
        /** @type {{ labelToId: Record<string, number>, idToLabel: Record<number, string> }} - A bi-directional mapping for the completions model */
        this._completionsVocabulary = null
        this.completionsReady = false // Flag to indicate if the completions model is ready

        // NOTES: Since this plugin may be loaded via device agent and device agent might be the 2.x stream, we
        // should try to avoid (or handle) instances where Node14 is used, as it does not support ESM imports or
        // private class fields (so for now, we stick to the _old style private properties_ with an underscore prefix).
    }

    /**
     * Initialize the Assistant instance with the provided RED instance and options.
     * This method sets up the necessary components for the Assistant, including the Model Context Protocol (MCP) and TensorFlow.js.
     * @param {*} RED - The Node-RED RED API
     * @param {AssistantSettings} options - The options for initializing the Assistant
     */
    async init (RED, options = {}) {
        if (this._loading) {
            RED.log.debug('FlowFuse Assistant is busy loading')
            return
        }
        try {
            this._loading = true // Set loading to true when initializing
            await this.dispose() // Dispose of any existing instance before initializing a new one
            this.RED = RED
            this.options = options || {}
            this.got = this.options.got || require('got') // got can me passed in for testing purposes

            if (!this.options.enabled) {
                RED.log.info('FlowFuse Assistant Plugin is not enabled')
                return
            }
            if (!this.options.url || !this.options.token) {
                RED.log.warn('FlowFuse Assistant Plugin configuration is missing required options')
                throw new Error('Plugin configuration is missing required options')
            }

            const nrVersion = this.RED.version()
            const nrMajorVersion = semver.major(nrVersion)
            const nrMinorVersion = semver.minor(nrVersion)
            const nodeMajorVersion = semver.major(process.versions.node)

            const clientSettings = {
                enabled: this.options.enabled !== false && !!this.options.url,
                requestTimeout: this.options.requestTimeout || 60000
            }
            RED.comms.publish('nr-assistant/initialise', clientSettings, true /* retain */)

            // ### Initialise Model Context Protocol (MCP)
            // TODO: If "feature" is disabled, skip loading MCP. See issue #57
            const mcpSettings = this.options.mcp || { enabled: true }
            const mcpFeatureEnabled = mcpSettings.enabled && true // FUTURE: Feature Flag - See issue #57
            const mcpEnabled = mcpFeatureEnabled && this.isInitialized && this.isEnabled
            if (mcpEnabled) {
                try {
                    const { client, server } = await this.loadMCP()
                    this._mcpClient = client
                    this._mcpServer = server
                    this.mcpReady = true
                    // tell frontend that the MCP client is ready so it can add the action(s) to the Action List
                    RED.comms.publish('nr-assistant/mcp/ready', clientSettings, true /* retain */)
                    RED.log.info('FlowFuse Assistant Model Context Protocol (MCP) loaded')
                } catch (error) {
                    this.mcpReady = false
                    // ESM Support in Node 20 is much better than versions v18-, so lets include a node version
                    // Write a warning to log as a hint/prompt
                    // NOTE: Node 18 is EOL as of writing this
                    RED.log.warn('FlowFuse Assistant MCP could not be loaded. Assistant features that require MCP will not be available')
                    if (nodeMajorVersion < 20) {
                        RED.log.debug(`Node.js version ${nodeMajorVersion} may not be supported by MCP Client / Server.`)
                    }
                }
            } else if (!mcpFeatureEnabled) {
                RED.log.info('FlowFuse Assistant MCP is disabled')
            }

            // ### Initialise completions / tensorflow.js (depends on MCP so checks the mcpReady flag)
            // TODO: If "feature" is disabled, skip loading tensorflow and completions. See issue #57
            const completionsSettings = this.options.completions || {}
            const completionsFeatureEnabled = completionsSettings.enabled && true // FUTURE: Feature Flag - See issue #57
            const completionsSupported = (nrMajorVersion > 4 || (nrMajorVersion === 4 && nrMinorVersion >= 1))
            const completionsEnabled = completionsFeatureEnabled && this.isInitialized && this.isEnabled
            if (this.mcpReady && completionsEnabled && completionsSupported) {
                try {
                    await this.loadCompletions()
                    RED.comms.publish('nr-assistant/completions/ready', { enabled: true }, true /* retain */)
                    RED.log.info('FlowFuse Assistant Completions Loaded')
                    this.completionsReady = true
                } catch (error) {
                    this.completionsReady = false
                    RED.log.warn('FlowFuse Assistant Completions could not be loaded and will not be available')
                    RED.log.debug(`Completions loading error. error code: ${error.code || 'unknown'}, error name: ${error.name}`)
                }
            } else if (!completionsSupported) {
                RED.log.warn('FlowFuse Assistant Completions require Node-RED 4.1 or greater')
            } else if (!completionsFeatureEnabled) {
                RED.log.info('FlowFuse Assistant Completions are disabled')
            }

            this.initAdminEndpoints(RED) // Initialize the admin endpoints for the Assistant
            const degraded = (mcpEnabled && !this.mcpReady) || (completionsEnabled && !this.completionsReady)
            RED.log.info('FlowFuse Assistant Plugin loaded' + (degraded ? ' (reduced functionality)' : ''))
        } finally {
            this._loading = false // Set loading to false when initialization is complete
        }
    }

    async dispose () {
        if (this._tf) {
            this._tf.disposeVariables()
            this._tf.dispose()
        }
        if (this._completionsModel) {
            this._completionsModel.dispose()
        }
        this._completionsVocabulary = null
        this._completionsModel = null
        this._tf = null

        try {
            if (this._mcpClient) {
                await this._mcpClient.close()
            }
            if (this._mcpServer) {
                await this._mcpServer.close()
            }
        } finally {
            this._mcpClient = null
            this._mcpServer = null
        }

        this.RED = null
        this.got = null
    }

    get isInitialized () {
        return this.RED !== null && this.got !== null
    }

    get isLoading () {
        return this._loading
    }

    get isEnabled () {
        if (!this.options) {
            return false
        }
        return !!(this.options.enabled && this.options.url && this.options.token)
    }

    async loadCompletions () {
        if (!this.isInitialized) {
            throw new Error('Assistant is not initialized')
        }
        if (!this.options || !this.options.completions) {
            throw new Error('Assistant completions options are not set')
        }
        await this._loadTensorFlowVocabulary()
        await this._loadTensorFlow()
        await this._loadTensorFlowModel()
    }

    async _loadTensorFlowVocabulary (url = this.options.completions.vocabularyUrl) {
        const response = await this.got(url, { responseType: 'json' })
        if (!response.body || typeof response.body !== 'object') {
            throw new Error('Invalid vocabulary format')
        }
        this._completionsVocabulary = response.body
        if (!this._completionsVocabulary.labelToId || !this._completionsVocabulary.idToLabel) {
            throw new Error('Vocabulary mappings are not properly defined')
        }
    }

    async _loadTensorFlow () {
        this._tf = await import('@tensorflow/tfjs')
        if (!this._tf) {
            throw new Error('Failed to load TensorFlow.js')
        }
        this._tf.enableProdMode() // suppress warning about using tfjs-node instead (which was deprecated in 2022)
    }

    async _loadTensorFlowModel (url = this.options.completions.modelUrl) {
        this._completionsModel = await this._tf.loadLayersModel(url)
        if (!this._completionsModel) {
            throw new Error('Failed to load TensorFlow.js model')
        }
        // FOR VERIFICATION: Uncomment the code below to inspect the model weights
        // During dev, I found that converting the autocomplete.keras to tfjs model was not right (model weights were not the same)
        // By saving in the older h5 format then exporting to tfjs, the weights are correct.
        // The python code used to get the weights is:
        /* ```python
            model = keras.models.load_model("autocomplete.h5")
            print("Reloading saved Model autocomplete.h5.")
            h5weights = model.layers[0].get_weights()[0]
            print("Reloaded weight for index 14:", h5weights[14][:5])
            print("Reloaded weight for index 33:", h5weights[33][:5])
        ``` */

        // Below is the code to inspect the weights in TensorFlow.js
        // console.log('--- Inspecting JS Weights ---')
        // // In TF.js, the explicit InputLayer is often layer 0, making the embedding layer 1.
        // // Let's find it by name to be safe.
        // const embeddingLayer = tfCompletionModel.getLayer('embedding_3')
        // const weights = embeddingLayer.getWeights()[0]

        // // Get the weight vector for index 14
        // const weight14 = tf.slice(weights, [14, 0], [1, 5])
        // console.log("JS weight for index 14:")
        // weight14.print()

        // // Get the weight vector for index 33
        // const weight33 = tf.slice(weights, [33, 0], [1, 5])
        // console.log("JS weight for index 33:")
        // weight33.print()
        // console.log('----------------------------------')
    }

    async loadMCP () {
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

        server.tool('predict_next', 'Predict the next node or nodes to follow the provided nodes in a Node-RED flow', {
            flow: z.array(
                z.object({
                    id: z.string()
                }).passthrough()
            ).optional().describe('A Node-RED flow related to the prediction.'),
            sourceNode: z.object({
                id: z.string(),
                // allow any other properties in the test object
                [z.string()]: z.any()
            }).passthrough().describe('The node in the flow from which to the prediction will be made'),
            sourcePort: z.number().optional().describe('Optional source port to connect the predicted node to')
        },
        /** @type {import('@modelcontextprotocol/sdk/server/mcp.js').ToolCallback} */
        async ({ flow, sourceNode, sourcePort }) => {
            sourceNode = sourceNode || {}
            /** @type {Array<{type: string}>} */
            let suggestedNodes = []
            /** @type {Array<{type: string}>} */
            const upstreamNodes = []
            if (flow && flow.length && sourceNode.id) {
                upstreamNodes.push(...getLongestUpstreamPath(flow, sourceNode.id))
            }
            if (this.completionsReady) {
                const allNodes = [...upstreamNodes, sourceNode].slice(-PREDICTION_SEQUENCE_LENGTH) // Include the last node in the input
                const typeNames = allNodes.map(node => node.type) // Extract the type names from the nodes
                const vectorizedText = typeNames.map(word => this._completionsVocabulary.labelToId[word.toLowerCase()] || 0) // Use 0 for unknown/padding
                if (vectorizedText.length < PREDICTION_SEQUENCE_LENGTH) {
                    // pad with zeros if necessary
                    vectorizedText.unshift(...Array(PREDICTION_SEQUENCE_LENGTH - vectorizedText.length).fill(0))
                }

                const inputTensor = this._tf.tensor([vectorizedText], [1, PREDICTION_SEQUENCE_LENGTH], 'int32')
                const prediction = this._completionsModel.predict(inputTensor)
                const { values, indices } = this._tf.topk(prediction, 3, true)
                const predictedIndices = indices.dataSync()
                const predictedWords = Array.from(predictedIndices).map(index => this._completionsVocabulary.idToLabel[index]).filter(word => !!word)
                inputTensor.dispose()
                prediction.dispose()
                values.dispose()
                indices.dispose()
                suggestedNodes = predictedWords.map(word => ({ type: word })) // Create new nodes with the predicted types
            }

            // typical patterns like "link in" > "something" > "link out" or "http in" > "something" > "http response"
            // can be recognized and suggested if the model does not predict them...
            if (flow && flow.length > 1) {
                // if the flow has a "split" but not a "join", we can suggest a "join" node
                const hasSplit = flow.some(node => node.type === 'split')
                const hasJoin = flow.some(n => n.type === 'join')
                const joinSuggested = suggestedNodes.some(n => n.type === 'join')
                if (hasSplit && !hasJoin && !joinSuggested && sourceNode.type !== 'split') {
                    suggestedNodes.unshift({ type: 'join', x: 0, y: 0 })
                }
                // if the flow contains a "link in" but no "link out" nodes, we can suggest a "link out" node
                const hasLinkIn = flow.some(n => n.type === 'link in')
                const hasLinkOut = flow.some(n => n.type === 'link out')
                const linkOutSuggested = suggestedNodes.some(n => n.type === 'link out')
                if (hasLinkIn && !hasLinkOut && !linkOutSuggested && sourceNode.type !== 'link in') {
                    suggestedNodes.unshift({ type: 'link out', x: 0, y: 0 })
                }
                // if the flow has a "http in" but not a "http response", we can suggest an "http response" node
                const hasHTTP = flow.some(n => n.type === 'http in')
                const hasHTTPResponse = flow.some(n => n.type === 'http response')
                const httpResponseSuggested = suggestedNodes.some(n => n.type === 'http response')
                if (hasHTTP && !hasHTTPResponse && !httpResponseSuggested && sourceNode.type !== 'http in') {
                    suggestedNodes.unshift({ type: 'http response', x: 0, y: 0 })
                }
            }
            // if the first suggestion is exactly the same as the source node, move it to the end of the list
            if (suggestedNodes.length > 0 && suggestedNodes[0].type === sourceNode.type) {
                suggestedNodes.push(suggestedNodes.shift())
            }
            const suggestions = suggestedNodes.map(node => [node])
            return {
                structuredContent: {
                    sourceId: sourceNode.id,
                    sourcePort: sourcePort || 0, // TODO: have the tool accept a sourcePort parameter
                    suggestions // use the suggestions array
                }
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

    // #region Admin Endpoints & HTTP Handlers

    initAdminEndpoints (RED) {
        RED.httpAdmin.post('/nr-assistant/:method', RED.auth.needsPermission('write'), function (req, res) {
            return assistant.handlePostMethodRequest(req, res)
        })

        RED.httpAdmin.get('/nr-assistant/mcp/prompts', RED.auth.needsPermission('write'), async function (req, res) {
            return assistant.handlePostPromptsRequest(req, res)
        })

        RED.httpAdmin.post('/nr-assistant/mcp/prompts/:promptId', RED.auth.needsPermission('write'), async function (req, res) {
            return assistant.handlePostPromptRequest(req, res)
        })

        RED.httpAdmin.post('/nr-assistant/mcp/tools/:toolId', RED.auth.needsPermission('write'), async function (req, res) {
            return assistant.handlePostToolRequest(req, res)
        })
    }

    /**
     * Handles POST requests to the /nr-assistant/:method endpoint.
     * This is for handling custom methods that the Assistant can perform.
     * @param {import('express').Request} req - The request object
     * @param {import('express').Response} res - The response object
     */
    async handlePostMethodRequest (req, res) {
        if (!this.isInitialized || this.isLoading) {
            return res.status(503).send('Assistant is not ready')
        }

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
        const url = `${this.options.url.replace(/\/$/, '')}/${method.replace(/^\//, '')}`
        this.got.post(url, {
            headers: {
                Accept: '*/*',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,es;q=0.7',
                Authorization: `Bearer ${this.options.token}`,
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
            let body = error.response && error.response.body
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body)
                } catch (e) {
                    // ignore
                }
            }
            let message = 'FlowFuse Assistant request was unsuccessful'
            const errorData = { status: 'error', message, body }
            const errorCode = (error.response && error.response.statusCode) || 500
            res.status(errorCode).json(errorData)
            this.RED.log.trace('nr-assistant error:', error)
            if (body && typeof body === 'object' && body.error) {
                message = `${message}: ${body.error}`
            }
            this.RED.log.warn(message)
        })
    }

    /**
     * Handles POST requests to the /nr-assistant/mcp/prompts endpoint.
     * Returns a list of available prompts from the Model Context Protocol (MCP).
     * @param {import('express').Request} req - The request object
     * @param {import('express').Response} res - The response object
     */
    async handlePostPromptsRequest (req, res) {
        if (!this.isInitialized || this.isLoading) {
            return res.status(503).send('Assistant is not ready')
        }
        if (!this.mcpReady) {
            return res.status(503).send('Model Context Protocol (MCP) is not ready')
        }

        try {
            const prompts = await this._mcpClient.getPrompts()
            res.json({ status: 'ok', data: prompts })
        } catch (error) {
            this.RED.log.error('Failed to retrieve MCP prompts:', error)
            res.status(500).json({ status: 'error', message: 'Failed to retrieve MCP prompts' })
        }
    }

    /**
     * Handles POST requests to the /nr-assistant/mcp/prompts/:promptId endpoint.
     * Executes a prompt from the Model Context Protocol (MCP) with the provided prompt ID.
     * @param {import('express').Request} req - The request object
     * @param {import('express').Response} res - The response object
     */
    async handlePostPromptRequest (req, res) {
        if (!this.isInitialized || this.isLoading) {
            return res.status(503).send('Assistant is not ready')
        }
        if (!this.mcpReady) {
            return res.status(503).send('Model Context Protocol (MCP) is not ready')
        }

        const promptId = req.params.promptId
        if (!promptId || typeof promptId !== 'string') {
            return res.status(400).json({ status: 'error', message: 'Invalid prompt ID' })
        }

        const input = req.body
        if (!input || !input.nodes || typeof input.nodes !== 'string') {
            res.status(400).json({ status: 'error', message: 'nodes selection is required' })
            return
        }
        try {
            // Only include flowName and userContext if they are defined
            const promptArgs = { nodes: input.nodes }
            if (input.flowName !== undefined) promptArgs.flowName = input.flowName
            if (input.userContext !== undefined) promptArgs.userContext = input.userContext

            const response = await this._mcpClient.getPrompt({
                name: promptId,
                arguments: promptArgs
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
            const url = `${this.options.url.replace(/\/$/, '')}/mcp`
            const responseFromAI = await this.got.post(url, {
                headers: {
                    Accept: '*/*',
                    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,es;q=0.7',
                    Authorization: `Bearer ${this.options.token}`,
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
            this.RED.log.error('Failed to execute MCP prompt:', error)
            res.status(500).json({ status: 'error', message: 'Failed to execute MCP prompt' })
        }
    }

    /**
     * Handles POST requests to the /nr-assistant/mcp/tools/:toolId endpoint.
     * Executes a tool from the Model Context Protocol (MCP) with the provided tool ID
     * and input.
     * @param {import('express').Request} req - The request object
     * @param {import('express').Response} res - The response object
     */
    async handlePostToolRequest (req, res) {
        if (!this.isInitialized || this.isLoading) {
            return res.status(503).send('Assistant is not ready')
        }
        if (!this.mcpReady) {
            return res.status(503).send('Model Context Protocol (MCP) is not ready')
        }

        let sourcePort = 0 // default source port
        const input = req.body || {}
        const sourceNode = input.sourceNode
        const toolId = req.params.toolId

        // Validate input
        if (!sourceNode || typeof sourceNode !== 'object') {
            res.status(400).json({ status: 'error', message: 'Invalid input' })
            return
        }
        if (toolId !== 'predict_next') { // only predict_next is currently supported
            res.status(400).json({ status: 'error', message: 'Invalid tool ID' })
            return
        }

        if (hasProperty(input, 'sourcePort') && !isNaN(+input.sourcePort) && +sourcePort < 0) {
            sourcePort = parseInt(input.sourcePort, 10)
        }

        // code for predict_next
        try {
            const response = await this._mcpClient.callTool({
                name: toolId,
                arguments: {
                    flow: input.flow || undefined, // optional flow nodes
                    sourceNode,
                    sourcePort
                }
            })
            const body = {
                tool: toolId,
                transactionId: input.transactionId, // used to correlate the request with the response
                result: response
            }

            // If the response is successful, return the data
            res.json({
                status: 'ok',
                data: body
            })
        } catch (error) {
            this.RED.log.error('Failed to execute MCP tool:', error)
            res.status(500).json({ status: 'error', message: 'Failed to execute MCP tool' })
        }
    }

    // #endregion
}

const assistant = new Assistant() // singleton instance of the Assistant class

module.exports = assistant
