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

    function debounce (func, wait) {
        let timeout
        return function () {
            const context = this; const args = arguments
            const later = function () {
                timeout = null
                func.apply(context, args)
            }
            clearTimeout(timeout)
            timeout = setTimeout(later, wait)
        }
    }

    // Copied from Node-RED core editor-client/src/js/ui/utils.js
    const loggingLevels = {
        off: 1,
        fatal: 10,
        error: 20,
        warn: 30,
        info: 40,
        debug: 50,
        trace: 60,
        audit: 98,
        metric: 99
    }
    const logLevelLabels = {
        [loggingLevels.fatal]: 'fatal',
        [loggingLevels.error]: 'error',
        [loggingLevels.warn]: 'warn',
        [loggingLevels.info]: 'info',
        [loggingLevels.debug]: 'debug',
        [loggingLevels.trace]: 'trace',
        [loggingLevels.audit]: 'audit',
        [loggingLevels.metric]: 'metric'
    }

    const getNearestLoggingLevel = (level, fallback = logLevelLabels[loggingLevels.debug]) => {
        // if level == one of the strings, just return it
        const logLabels = Object.values(logLevelLabels)
        if (typeof level === 'string' && logLabels.includes(level)) {
            return level
        }
        if (loggingLevels[level]) {
            return loggingLevels[level]
        }
        const levelNo = +level
        if (isNaN(levelNo)) {
            return fallback
        }
        let nearestLevel = 0
        Object.values(loggingLevels).forEach(l => {
            if (Math.abs(levelNo - l) < Math.abs(levelNo - nearestLevel)) {
                nearestLevel = l
            }
        })
        return logLevelLabels[nearestLevel] || fallback
    }
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
            'register-event-listeners': 'handleRegisterEvents',
            'debug-log-context-registered': 'handleDebugLogContextRegistration',
            'debug-log-context-get-entries': 'handleDebugLogContextGetEntries'
        }

        /**
         * A set of flags and features supported by this plugin version.
         * These should be used by the FlowFuse Expert to determine what functionality can be leveraged.
         */
        get features () {
            return {
                commands: Object.fromEntries(Object.entries(this.commandMap).map(([name, value]) => [name, { enabled: true }])),
                actions: Object.fromEntries(Object.entries(this.supportedActions).map(([name, value]) => [name, { enabled: true }])),
                registeredEvents: Object.fromEntries(Object.entries(this.nodeRedEventsMap).map(([name, value]) => [name, { enabled: true }])), // list of Node-RED events registered to be echoed to the expert
                dynamicEventRegistration: { enabled: true }, // supports dynamic registration of Node-RED events to be listened to
                flowSelection: { enabled: true }, // supports passing the flow selection
                flowImport: { enabled: true }, // supports importing flows
                paletteManagement: { enabled: true }, // supports palette management actions
                debugLog: { enabled: true } // supports passing debug log context
            }
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

            // Hook into Node-RED's debug sidebar to add "Add to FF Expert context" buttons to debug log entries, and handle their interactions
            const allowHook = this.assistantOptions.enabled && this.assistantOptions.standalone !== true
            const that = this
            let debugClearRegistered = false
            const OriginalCreateObjectElement = allowHook && RED.utils.createObjectElement
            if (RED.utils.createObjectElement && !RED.utils.createObjectElement._ffWrapped) {
                const hasProperty = (obj, prop) => obj && Object.prototype.hasOwnProperty.call(obj, prop)
                RED.utils.createObjectElement = function (obj, options) {
                    try {
                        // This function is called for more than just debug log entries (it is used for info panel props and context props) but it provides no
                        // clear `reason` so, based on very strict duck-typing approach, we can identify debug log entry creation based the below conditions:
                        // 1. options.sourceId will be a string which is the id of the node which generated the debug message
                        // 2. options.key will === `null`.
                        // 3. options.hideKey will === `false`.
                        // 4. options.enablePinning will === `true` (if present - it was added in Jan 2025 13cac1b5efe9888c2a1bc922674f42ed9994af27, so may not be there in older versions)
                        // 5. options.tools will not be present (for top level debug messages, nested ones may have a pin tool for example)
                        // 6. options.typeHint will be present
                        // 7. options.path and options.rootPath keys must be string and must === each other.
                        // 8. options.nodeSelector will be a function (if present - it was added in Nov 2023 febc769df5a0f530ff43225611e412dee4f1ca08, so may not be there in older versions)
                        // 9. must ONLY contain 8 keys (those verified above)
                        // REF: See https://github.com/node-red/node-red/blob/661828b208c0024335841afde14e184a278e96b4/packages/node_modules/%40node-red/nodes/core/common/lib/debug/debug-utils.js#L514-L515
                        // NOTE: An obvious alternative to this would be to check the stack trace for calls originating from `processDebugMessage` however that is an order
                        // of magnitude slower than the cascading duck-typing property reads and comparisons (very fast, native ops).

                        const propCount = 6 // for 8 years prior, there were 6 properties. In 2023, nodeSelector was added, in 2025, enablePinning was added

                        // perform the checks in a cascading manner to avoid unnecessary checks once a condition fails, as this function can be called frequently
                        const check1 = typeof options.sourceId === 'string' && options.sourceId.length > 0
                        const check2 = check1 && options.key === null
                        const check3 = check2 && options.hideKey === false
                        const hasEnablePinning = (check3 && hasProperty(options, 'enablePinning')) ? 1 : 0
                        const check4 = check3 && (hasEnablePinning === false || options.enablePinning === true)
                        const check5 = check4 && hasProperty(options, 'tools') === false
                        const check6 = check5 && hasProperty(options, 'typeHint')
                        const check7 = check6 && typeof options.path === 'string' && options.path === options.rootPath // blank is OK (it can mean full msg or not even be a msg at all!)
                        const hasNodeSelector = (check7 && hasProperty(options, 'nodeSelector')) ? 1 : 0
                        const check8 = check7 && (hasNodeSelector === false || typeof options.nodeSelector === 'function')

                        const isTopLevelDebugMsg = check8 && Object.keys(options).length === (propCount + hasEnablePinning + hasNodeSelector)

                        if (isTopLevelDebugMsg) {
                            // This is a debug log entry creation - add an "Add to context" tool button to the entry
                            options.tools = function (key, msg) {
                                const buttonEl = $('<button class="ff-expert-debug-context red-ui-button red-ui-button-small"><i class="fa fa-plus"></i></button>')
                                RED.popover.tooltip(buttonEl, 'Add debug message to FlowFuse Expert context')
                                buttonEl.css('cursor', 'pointer')
                                // to allow us to tie together the button with the relevant debug log entry data when the button is clicked
                                // we generate a unique id here and store it as a data attribute on the button, along with the relevant options, msg, and key data
                                // (jquery data is used for storage as it allows storing complex objects, whereas data attributes can only store strings)
                                const uuid = `${options.path}:${options.sourceId}:${Math.random().toString(16).slice(2)}`
                                buttonEl.attr('data-ff-expert-debug-uuid', uuid)
                                buttonEl.data('ff-expert-debug-data', { options, msg, key })
                                buttonEl.on('click', function (evt) {
                                    evt.preventDefault()
                                    evt.stopPropagation()

                                    if (!debugClearRegistered) {
                                        const clearButton = $('#red-ui-sidebar-debug-clear')
                                        clearButton.on('click', function () {
                                            that.postParent({
                                                type: 'debug-log-context-clear',
                                                data: {}
                                            })
                                        })
                                        debugClearRegistered = true
                                    }

                                    if (buttonEl.hasClass('selected')) {
                                        const uuid = buttonEl.attr('data-ff-expert-debug-uuid')
                                        that.postParent({
                                            type: 'debug-log-context-remove',
                                            debugLog: [{ uuid }]
                                        })
                                        return
                                    }

                                    const entry = that.getDebugEntry(options, buttonEl, uuid, key, msg)
                                    that.postParent({
                                        type: 'debug-log-context-add',
                                        debugLog: [entry]
                                    })
                                })
                                return buttonEl
                            }
                            return OriginalCreateObjectElement.call(this, obj, options)
                        } else {
                            // not a debug log entry - proceed as normal
                            return OriginalCreateObjectElement.call(this, obj, options)
                        }
                    } catch (_err) {
                        return OriginalCreateObjectElement.call(this, obj, options)
                    }
                }
                RED.utils.createObjectElement._ffWrapped = true
            }
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
                    this.RED.events.on(nodeRedEvent, (eventData) => {
                        this.postParent({ type: callBackName, eventMapping, eventData })
                    })
                }
            }

            // send updated feature list
            this.postReply({ type: 'set-assistant-features', features: this.features }, event)
        }

        /**
         * This function syncs the selected debug log entries in the Node-RED debug sidebar with the FlowFuse Expert.
         * It should be called when the user clears logs from chat context
         */
        handleDebugLogContextRegistration ({ event, params }) {
            if (!params || typeof params !== 'object') {
                return
            }
            const { register } = params
            if (register) {
                // update class on the debug panel
                // remove all .selected'
                $('button.ff-expert-debug-context').removeClass('selected')
                register.forEach(uuid => {
                    // find the element with data-ff-expert-debug-uuid=uuid and add class .selected
                    $(`button[data-ff-expert-debug-uuid="${uuid}"]`).addClass('selected')
                })
            }
        }

        /**
         * This function retrieves the debug log entries from the Node-RED debug sidebar and sends them to the FlowFuse Expert.
         * It supports filtering by log level and visibility in the UI.
         * This is typically commanded by the user in the Chat UI where they may request to add debug log entries to the context.
         */
        handleDebugLogContextGetEntries ({ event, params }) {
            const { visibleOnly = true, fatal = true, error = true, warn = true, info = true, debug = true, trace = true } = params || {}
            const wantLevels = []
            if (fatal) wantLevels.push('fatal')
            if (error) wantLevels.push('error')
            if (warn) wantLevels.push('warn')
            if (info) wantLevels.push('info')
            if (debug) wantLevels.push('debug')
            if (trace) wantLevels.push('trace')

            const isElementInView = (jElement) => {
                if (jElement.length === 0) {
                    return false
                }
                if (!visibleOnly) {
                    return true
                }
                if (jElement.hasClass('hide')) {
                    return false // not visible, skip this entry
                }
                const rect = jElement[0].getBoundingClientRect()
                if (!rect?.width || !rect?.height) {
                    return false
                }
                return (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= $(window).height() &&
                    rect.right <= $(window).width()
                )
            }
            // first remove class .selected from all entries. It will be re-added once the expert responds with the list uuids it has registered.
            $('button.ff-expert-debug-context').removeClass('selected')

            const filteredEntries = []
            // get buttons `#red-ui-sidebar-content .red-ui-debug-content-list button.ff-expert-debug-context` in the debug sidebar
            // but dont include any with `.hide` on the parent `.red-ui-debug-msg` element, as those are not visible
            $('#red-ui-sidebar-content .red-ui-debug-content-list button.ff-expert-debug-context').each((i, el) => {
                const expertToolButtonEl = $(el)
                const parent = expertToolButtonEl.closest('div.red-ui-debug-msg')
                if (!isElementInView(parent)) {
                    return // hidden or not visible in the viewport, skip this entry
                }
                const uuid = expertToolButtonEl.attr('data-ff-expert-debug-uuid')
                if (uuid) {
                    // const options = expertToolButtonEl.data('ff-expert-debug-options')
                    // const msg = expertToolButtonEl.data('ff-expert-debug-msg')
                    // const key = expertToolButtonEl.data('ff-expert-debug-key')
                    const data = expertToolButtonEl.data('ff-expert-debug-data')
                    if (!data) return
                    const { options, msg, key } = data
                    const entry = this.getDebugEntry(options, expertToolButtonEl, uuid, key, msg)
                    const level = entry?.level
                    if (!wantLevels.includes(level)) {
                        return // not a level we want to include, skip this entry
                    }
                    filteredEntries.push(entry)
                }
            })
            this.postReply({ type: 'debug-log-context-add', debugLog: filteredEntries }, event)
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
            }, true) // debounced
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

        _postDebounced = debounce(this._post, 150)

        postParent (payload = {}, debounce) {
            if (debounce) {
                this.debug('Posting parent message (debounced)', payload)
                this._postDebounced(payload, window.parent)
            } else {
                this.debug('Posting parent message', payload)
                this._post(payload, window.parent)
            }
        }

        postReply (payload, event) {
            this.debug('Posting reply message:', payload)
            this._post(payload, event.source)
        }

        /**
         * Internal helper to format a debug log entry based on the options and message provided by the Node-RED debug sidebar,
         * enriched with metadata about the source node and workspace.
         * @param {Object} options - the options object provided by the Node-RED debug sidebar when it generates a debug log entry
         * @param {*} button - the jQuery button element that was clicked to add this debug entry to the FlowFuse Expert context
         * @param {*} uuid - a unique identifier for this debug log entry, used to manage selection state between Node-RED and the FlowFuse Expert
         * @param {*} key - the key of the debug message (e.g., "payload", "topic", etc.)
         * @param {*} msg - the debug message content
         * @returns an object representing the debug log entry, enriched with metadata about its source and context, suitable for sending to the FlowFuse Expert
         */
        getDebugEntry (options, button, uuid, key, msg) {
            const node = this.RED.nodes.node(options.sourceId)
            // if no z and _def.category is "config" this is on the global flow
            let tabId = 'global'
            let tabLabel = 'global'
            if (node && node.z) {
                tabId = node.z
                const tab = this.RED.nodes.workspace(tabId)
                tabLabel = tab ? tab.label : 'unknown'
            }

            // get log level from grand parent element "div.red-ui-debug-msg" (it _might_ have a class like red-ui-debug-msg-level-{level})
            const parent = button.closest('div.red-ui-debug-msg')
            const levelClass = parent.attr('class').split(' ').find(c => c.startsWith('red-ui-debug-msg-level-'))
            const level = getNearestLoggingLevel(levelClass ? levelClass.replace('red-ui-debug-msg-level-', '') : 'debug')

            // get meta data from entry div.red-ui-debug-msg-meta
            // typically: red-ui-debug-msg-topic, red-ui-debug-msg-name, red-ui-debug-msg-date
            // but lets just grab whatever is there and include it in the context
            const meta = {}
            parent.find('.red-ui-debug-msg-meta').children().each((i, el) => {
                const metaClass = el.className.split(' ').find(c => c.startsWith('red-ui-debug-msg-'))
                if (metaClass) {
                    const key = metaClass.replace('red-ui-debug-msg-', '')
                    meta[key] = el.innerText
                }
            })
            const event = {
                uuid,
                level,
                path: options.path,
                data: msg,
                source: {
                    id: options.sourceId || '',
                    type: node?.type || '',
                    isConfig: node?._def?.category === 'config' || false,
                    name: node?.name || '',
                    z: tabId,
                    zName: tabLabel
                },
                metadata: meta
            }
            return event
        }
    }

    return new ExpertComms()
}))
