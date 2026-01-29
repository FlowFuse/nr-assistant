/**
* FFAssistant Utils
* Expert Communication functions for the FlowFuse Assistant
* To import this in js backend code (although you shouldn't), use:
* const FFExpertComms = require('flowfuse-nr-assistant/resources/expertComms.js')
* To import this in frontend code, use:
* <script src="/resources/@flowfuse/nr-assistant/expertComms.js"></script>
* To use this in the browser, you can access it via:
* FFExpertComms.cleanFlow(nodeArray)
*/

'use strict';

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js / CommonJS
        module.exports = factory()
    } else {
        // Browser
        root.FFExpertComms = factory()
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict'

    class ExpertComms {
        /** @type {import('node-red').NodeRedInstance} */
        RED = null
        assistantOptions = {}

        MESSAGE_SOURCE = 'nr-assistant'
        MESSAGE_TARGET = 'flowfuse-expert'
        MESSAGE_SCOPE = 'flowfuse-expert'

        /**
         * targetOrigin is set to '*' by default, which allows messages to be sent and received from any origin.
         * This is fine for the initial handshake with the FF Expert (will change to the origin of the expert page once it is loaded)
         *
         * @type {string}
         */
        targetOrigin = '*'

        /**
         * Define supported actions and their parameter schemas
         */
        supportedActions = {
            'core:manage-palette': {
                params: {
                    type: 'object',
                    properties: {
                        view: {
                            type: 'string',
                            enum: ['nodes', 'install'],
                            default: 'install'
                        },
                        filter: {
                            description: 'Optional filter string. e.g. `"node-red-contrib-s7","node-red-contrib-other"` to pre-filter the palette view',
                            type: 'string'
                        }
                    },
                    required: ['filter']
                }
            },
            'custom:import-flow': {
                params: {
                    type: 'object',
                    properties: {
                        flow: {
                            type: 'string',
                            description: 'The flow JSON to import'
                        },
                        addFlow: {
                            type: 'boolean',
                            description: 'Whether to add the flow to the current workspace tab (false) or create a new tab (true). Default: false'
                        }
                    },
                    required: ['flow']
                }
            },
            'custom:close-search': { params: null },
            'custom:close-typeSearch': { params: null },
            'custom:close-actionList': { params: null }
        }

        /**
         * A mapping of Node-RED core events to their respective handler logic.
         *
         * This map acts as a router for the assistant's event listeners:
         * - Functions: Executed immediately when the event fires (e.g., notifying the parent of UI state).
         * - Strings: Represent the name of a method within this class to be invoked (e.g., refreshing the palette).
         *            The method name being referenced must be appended with 'notify'
         *
         * @type {Object.<string, Function|string>}
         */
        nodeRedEventsMap = {
            // palette changes
            'registry:node-set-added': 'notifyPaletteChange',
            'registry:node-set-removed': 'notifyPaletteChange',
            'registry:node-set-disabled': 'notifyPaletteChange',
            'registry:node-set-enabled': 'notifyPaletteChange',
            // selection changes
            'view:selection-changed': 'notifySelectionChanged'
        }

        /**
         * A mapping of FlowFuse Expert events to their respective handler logic.
         *
         * This map acts as a router for the expert's event listeners:
         * - Functions: Executed immediately when the event fires (e.g., notifying the parent of UI state).
         * - Strings: Represent the name of a method within this class to be invoked (e.g., refreshing the palette).
         *            The method name being referenced must be appended with 'handle'
         *
         * @type {Object.<string, Function|string>}
         */
        commandMap = {
            'get-assistant-version': ({ event, type, action, params } = {}) => {
                // handle version request
                this.postReply({ type, version: this.assistantOptions.assistantVersion, success: true }, event)
            },
            'get-assistant-features': ({ event, type, action, params } = {}) => {
                // handle features request
                this.postReply({ type, features: this.features, success: true }, event)
            },
            'get-supported-actions': ({ event, type, action, params } = {}) => {
                // handle supported actions request
                this.postReply({ type, supportedActions: this.supportedActions, success: true }, event)
            },
            'get-palette': async ({ event, type, action, params } = {}) => {
                // handle palette request
                this.postReply({ type: 'set-palette', palette: await this.getPalette(), success: true }, event)
            },
            'invoke-action': 'handleActionInvocation',
            'get-selection': 'handleGetSelection',
            'register-event-listeners': 'handleRegisterEvents'
        }

        /**
         * A set of flags and features supported by this plugin version.
         * These should be used by the FlowFuse Expert to determine what functionality can be leveraged.
         */
        features = {
            commands: Object.fromEntries(Object.entries(this.commandMap).map(([name, value]) => [name, { enabled: true }])),
            actions: Object.fromEntries(Object.entries(this.supportedActions).map(([name, value]) => [name, { enabled: true }])),
            registeredEvents: Object.fromEntries(Object.entries(this.nodeRedEventsMap).map(([name, value]) => [name, { enabled: true }])), // list of Node-RED events registered to be echoed to the expert
            dynamicEventRegistration: { enabled: true }, // supports dynamic registration of Node-RED events to be listened to
            flowSelection: { enabled: true }, // supports passing the flow selection
            flowImport: { enabled: true }, // supports importing flows
            paletteManagement: { enabled: true } // supports palette management actions
        }

        init (RED, assistantOptions) {
            /** @type {import('node-red').NodeRedInstance} */
            this.RED = RED
            this.assistantOptions = assistantOptions

            if (!window.parent?.postMessage || window.self === window.top) {
                console.warn('Parent window not detected - certain interactions with the FlowFuse Expert will not be available')
                return
            }

            this.setNodeRedEventListeners()

            this.setupMessageListeners()

            // Notify the parent window that the assistant is ready
            this.postParent({
                type: 'assistant-ready',
                version: this.assistantOptions.assistantVersion,
                enabled: this.assistantOptions.enabled,
                standalone: this.assistantOptions.standalone,
                nodeRedVersion: this.RED.settings.version,
                features: this.features
            })
        }

        setupMessageListeners () {
            // Listen for postMessages from the parent window
            window.addEventListener('message', async (event) => {
                // prevent own messages being processed
                if (event.source === window.self) {
                    return
                }

                const { type, action, params, target, source, scope } = event.data || {}

                // Ensure scope and source match expected values
                if (target !== this.MESSAGE_SOURCE || source !== this.MESSAGE_TARGET || scope !== this.MESSAGE_SCOPE) {
                    return
                }

                // Setting target origin for future calls
                if (this.targetOrigin === '*') {
                    this.targetOrigin = event.origin
                }

                this.debug('Received postMessage:', event.data)

                const payload = {
                    event,
                    type,
                    action,
                    params
                }

                for (const eventName in this.commandMap) {
                    if (type === eventName && typeof this.commandMap[eventName] === 'function') {
                        return this.commandMap[eventName](payload)
                    }

                    if (
                        type === eventName &&
                        typeof this.commandMap[eventName] === 'string' &&
                        this.commandMap[eventName] in this
                    ) {
                        return this[this.commandMap[eventName]](payload)
                    }
                }

                // handles unknown message type
                this.postReply({ type: 'error', error: 'unknown-type', data: event.data }, event)
            }, false)
        }

        /**
         * Register Node-RED events to be listened to and echoed to the FlowFuse Expert
         * @param {Record<string,string>} events - Key is Node-RED event to register, Value is event to emit back
         */
        handleRegisterEvents ({ event, params }) {
            if (!params || typeof params !== 'object') {
                return
            }

            for (const key in params) {
                const eventMapping = params[key] // FF Expert will send  { eventName: {nodeRedEvent: 'editor:open', future: xxx} }
                const callBackName = key // the key is the FF event name to call back on
                const nodeRedEvent = eventMapping.nodeRedEvent // the NR event to subscribe to
                if (callBackName && nodeRedEvent) {
                    if (Object.prototype.hasOwnProperty.call(this.nodeRedEventsMap, nodeRedEvent)) {
                        continue // nodeRedEvent already registered
                    }
                    this.nodeRedEventsMap[nodeRedEvent] = callBackName
                    this.RED.events.on(key, (eventData) => {
                        this.postReply({ type: callBackName, eventMapping, eventData }, event)
                    })
                }
            }
        }

        setNodeRedEventListeners () {
            Object.keys(this.nodeRedEventsMap).forEach(eventName => {
                if (typeof this.nodeRedEventsMap[eventName] === 'function') {
                    this.RED.events.on(eventName, this.nodeRedEventsMap[eventName].bind(this))
                }
                if (typeof this.nodeRedEventsMap[eventName] === 'string' && this.nodeRedEventsMap[eventName] in this) {
                    this.RED.events.on(eventName, this[this.nodeRedEventsMap[eventName]].bind(this))
                }
            })
        }

        /**
         * FlowFuse Expert Node-RED event notifiers
         */
        async notifyPaletteChange () {
            this.postParent({
                type: 'set-palette',
                palette: await this.getPalette()
            })
        }

        notifySelectionChanged ({ nodes }) {
            if (nodes && Array.isArray(nodes)) {
                this.postParent({
                    type: 'set-selection',
                    selection: this.formatSelectedNodes(nodes)
                })
            } else {
                this.postParent({
                    type: 'set-selection',
                    selection: []
                })
            }
        }

        /**
         * FlowFuse Expert message handlers
         */
        handleActionInvocation ({ event, type, action, params } = {}) {
            // handle action invocation requests (must be registered actions in supportedActions)
            if (typeof action !== 'string') {
                return
            }

            if (!this.supportedActions[action]) {
                console.warn(`Action "${action}" is not permitted to be invoked via postMessage`)
                this.postReply({ type, action, error: 'unknown-action' }, event)
                return
            }

            // Validate params against permitted schema (native/naive parsing for now - may introduce a library later if more complex schemas are needed)
            const actionSchema = this.supportedActions[action].params
            if (actionSchema) {
                const validation = this.validateSchema(params, actionSchema)
                if (!validation || !validation.valid) {
                    console.warn(`Params for action "${action}" did not validate against the expected schema`, params, actionSchema, validation)
                    this.postReply({ type, action, error: validation.error || 'invalid-parameters' }, event)
                    return
                }
            }

            switch (action) {
            case 'custom:close-search':
                this.RED.search.hide()
                this.postReply({ type, action, acknowledged: true }, event)
                return
            case 'custom:close-typeSearch':
                this.RED.typeSearch.hide()
                this.postReply({ type, action, acknowledged: true }, event)
                return
            case 'custom:close-actionList':
                this.RED.actionList.hide()
                this.postReply({ type, action, acknowledged: true }, event)
                return
            case 'custom:import-flow':
                // import-flow is a custom action - handle it here directly
                try {
                    this.importNodes(params.flow, params.addFlow === true)
                    this.postReply({ type, success: true }, event)
                } catch (err) {
                    this.postReply({ type, error: err?.message }, event)
                }
                return
            default:
                // Handle (supported) native Node-RED actions
                try {
                    this.RED.actions.invoke(action, params)
                    this.postReply({ type, action, success: true }, event)
                } catch (err) {
                    this.postReply({ type, action, error: err?.message }, event)
                }
            }
        }

        handleGetSelection ({ event }) {
            let selection = []
            const selectedNodes = this.RED.view.selection()

            if (selectedNodes && Array.isArray(selectedNodes)) {
                selection = this.formatSelectedNodes(this.RED.view.selection())
            }

            this.postReply({ type: 'set-selection', selection }, event)
        }

        async getPalette () {
            const palette = {}
            const plugins = await $.ajax({
                url: 'plugins',
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                }
            })
            const nodes = await $.ajax({
                url: 'nodes',
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                }
            })

            plugins.forEach(plugin => {
                if (Object.prototype.hasOwnProperty.call(palette, plugin.module)) {
                    palette[plugin.module].plugins.push(plugin)
                } else {
                    palette[plugin.module] = {
                        version: plugin.version,
                        enabled: plugin.enabled,
                        module: plugin.module,
                        plugins: [
                            plugin
                        ],
                        nodes: []
                    }
                }
            })

            nodes.forEach(node => {
                if (Object.prototype.hasOwnProperty.call(palette, node.module)) {
                    palette[node.module].nodes.push(node)
                } else {
                    palette[node.module] = {
                        version: node.version,
                        enabled: node.enabled,
                        module: node.module,
                        plugins: [],
                        nodes: [
                            node
                        ]
                    }
                }
            })

            return palette
        }

        formatSelectedNodes (nodes) {
            return this.RED.nodes.createExportableNodeSet(nodes, { includeModuleConfig: true })
        }

        validateSchema (data, schema) {
            if (schema.type === 'object') {
                if (typeof data !== 'object') {
                    return {
                        valid: false,
                        error: 'Data is not of type object'
                    }
                }
                if (Array.isArray(data)) {
                    return {
                        valid: false,
                        error: 'Data is an array but an object was expected'
                    }
                }
                // check required properties
                if (Array.isArray(schema.required)) {
                    for (const reqProp of schema.required) {
                        if (!(reqProp in data)) {
                            return {
                                valid: false,
                                error: `Data is missing required parameter "${reqProp}"`
                            }
                        }
                    }
                }
                // check properties & apply defaults
                if (schema.properties) {
                    for (const [propName, propSchema] of Object.entries(schema.properties)) {
                        const propExists = propName in data
                        // check type
                        if (propSchema.type && propExists) {
                            const expectedType = propSchema.type
                            const actualType = Array.isArray(data[propName]) ? 'array' : typeof data[propName]
                            if (actualType !== expectedType) {
                                return {
                                    valid: false,
                                    error: `Data parameter "${propName}" is of type "${actualType}" but expected type is "${expectedType}"`
                                }
                            }
                        }
                        // check enum
                        if (propSchema.enum && propExists) {
                            if (!propSchema.enum.includes(data[propName])) {
                                return {
                                    valid: false,
                                    error: `Data parameter "${propName}" has invalid value "${data[propName]}". Should be one of: ${propSchema.enum.join(', ')}`
                                }
                            }
                        }
                        // apply defaults
                        if (propSchema.default !== undefined && !propExists) {
                            data[propName] = propSchema.default
                        }
                    }
                }
            }
            return { valid: true }
        }

        /// Function extracted from Node-RED source `editor-client/src/js/ui/clipboard.js`
        /**
         * Performs the import of nodes, handling any conflicts that may arise
         * @param {string} nodesStr the nodes to import as a string
         * @param {boolean} addFlow whether to add the nodes to a new flow or to the current flow
         */
        importNodes (nodesStr, addFlow) {
            let newNodes = nodesStr
            if (typeof nodesStr === 'string') {
                try {
                    nodesStr = nodesStr.trim()
                    if (nodesStr.length === 0) {
                        return
                    }
                    newNodes = this.validateFlowString(nodesStr)
                } catch (err) {
                    const e = new Error(this.RED._('clipboard.invalidFlow', { message: 'test' }))
                    e.code = 'NODE_RED'
                    throw e
                }
            }
            const importOptions = { generateIds: true, addFlow }
            try {
                this.RED.view.importNodes(newNodes, importOptions)
            } catch (error) {
                // Thrown for import_conflict
                this.RED.notify('Import failed:' + error.message, 'error')
                throw error
            }
        }

        /// Function extracted from Node-RED source `editor-client/src/js/ui/clipboard.js`
        /**
         * Validates if the provided string looks like valid flow json
         * @param {string} flowString the string to validate
         * @returns If valid, returns the node array
         */
        validateFlowString (flowString) {
            const res = JSON.parse(flowString)
            if (!Array.isArray(res)) {
                throw new Error(this.RED._('clipboard.import.errors.notArray'))
            }
            for (let i = 0; i < res.length; i++) {
                if (typeof res[i] !== 'object') {
                    throw new Error(this.RED._('clipboard.import.errors.itemNotObject', { index: i }))
                }
                if (!Object.hasOwn(res[i], 'id')) {
                    throw new Error(this.RED._('clipboard.import.errors.missingId', { index: i }))
                }
                if (!Object.hasOwn(res[i], 'type')) {
                    throw new Error(this.RED._('clipboard.import.errors.missingType', { index: i }))
                }
            }
            return res
        }

        debug (...args) {
            if (this.RED.nrAssistant?.DEBUG) {
                const scriptName = 'assistant-index.html.js' // must match the sourceURL set in the script below
                const stackLine = new Error().stack.split('\n')[2].trim()
                const match = stackLine.match(/\(?([^\s)]+):(\d+):(\d+)\)?$/) || stackLine.match(/@?([^@]+):(\d+):(\d+)$/)
                const file = match?.[1] || 'anonymous'
                const line = match?.[2] || '1'
                const col = match?.[3] || '1'
                let link = `${window.location.origin}/${scriptName}:${line}:${col}`
                if (/^VM\d+$/.test(file)) {
                    link = `debugger:///${file}:${line}:${col}`
                } else if (file !== 'anonymous' && file !== '<anonymous>' && file !== scriptName) {
                    link = `${file}:${line}:${col}`
                    if (!link.startsWith('http') && !link.includes('/')) {
                        link = `${window.location.origin}/${link}`
                    }
                }
                // eslint-disable-next-line no-console
                console.log('[nr-assistant]', ...args, `\n   at ${link}`)
            }
        }

        /**
         * Internal helper to send a formatted message to a target window
         */
        _post (payload, targetWindow) {
            if (targetWindow && typeof targetWindow.postMessage === 'function') {
                targetWindow.postMessage({
                    ...payload,
                    source: this.MESSAGE_SOURCE,
                    scope: this.MESSAGE_SCOPE,
                    target: this.MESSAGE_TARGET
                }, this.targetOrigin)
            } else {
                console.warn('Unable to post message, target window not available', payload)
            }
        }

        postParent (payload = {}) {
            this.debug('Posting parent message', payload)
            this._post(payload, window.parent)
        }

        postReply (payload, event) {
            this.debug('Posting reply message:', payload)
            this._post(payload, event.source)
        }
    }

    return new ExpertComms()
}))
