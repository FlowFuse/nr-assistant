import { ExpertAutomations } from './expertAutomations.js'

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

const hasProperty = (obj, prop) => !!(obj && Object.prototype.hasOwnProperty.call(obj, prop))

export class ExpertComms {
    /** @type {import('node-red').NodeRedInstance} */
    RED = null
    assistantOptions = {}
    expertSupportedFeatures = {}

    MESSAGE_SOURCE = 'nr-assistant'
    MESSAGE_TARGET = 'flowfuse-expert'
    MESSAGE_SCOPE = 'flowfuse-expert'

    /** @type {ExpertAutomations} */
    nrAutomations = new ExpertAutomations() // will set RED instance later in init

    /**
     * targetOrigin is set to '*' by default, which allows messages to be sent and received from any origin.
     * This is fine for the initial handshake with the FF Expert (will change to the origin of the expert page once it is loaded)
     *
     * @type {string}
     */
    targetOrigin = '*'

    messageTransactionId = null

    messageUserProperties = null

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
        'custom:close-actionList': { params: null },
        ...this.nrAutomations.supportedActions
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
        'view:selection-changed': 'notifySelectionChanged',
        // workspace changes
        'workspace:change': 'notifyWorkspaceChange',
        'flows:loaded': 'notifyWorkspaceChange'
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
        'expert-ready': 'handleExpertReady',
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
            debugLogContext: { enabled: true } // supports providing debug log context to the expert
        }
    }

    init (RED, assistantOptions) {
        /** @type {import('node-red').NodeRedInstance} */
        this.RED = RED
        this.RED.nrAssistant = this
        this.assistantOptions = assistantOptions
        this.nrAutomations.init(this, RED)

        if (!window.parent?.postMessage || window.self === window.top) {
            console.warn('Parent window not detected - certain interactions with the FlowFuse Expert will not be available')
            return
        }

        this.setNodeRedEventListeners()

        this.setupMessageListeners()

        this.notifyWorkspaceChange()

        // Notify the parent window that the assistant is ready
        this.postParent({
            type: 'assistant-ready',
            version: this.assistantOptions.assistantVersion,
            enabled: this.assistantOptions.enabled,
            standalone: this.assistantOptions.standalone,
            nodeRedVersion: this.RED.settings.version,
            nodeRedUpdatesAvailable: this.RED.palette?.editor?.getAvailableUpdates ? this.RED.palette.editor.getAvailableUpdates() : null,
            features: this.features
        })

        // Hook into Node-RED's FrontEnd `debugPostProcessMessage` hook to add an "Add to context" button to debug log
        // entries in the debug sidebar, allowing users to easily add relevant debug messages to the FlowFuse Expert context.
        const allowHook = this.assistantOptions.enabled && this.assistantOptions.standalone !== true
        const hookValid = RED.hooks.isKnownHook ? RED.hooks.isKnownHook('debugPostProcessMessage') : false
        let alreadyHooked = false
        if (allowHook && hookValid && !alreadyHooked) {
            alreadyHooked = true
            const that = this

            // listen for `flows:loaded` (i.e. editor is ready) then hook the debug clear button
            const hookDebugClearButton = function () {
                if ($('#red-ui-sidebar-debug-clear').length) {
                    $('#red-ui-sidebar-debug-clear').on('click', function () {
                        that.postParent({
                            type: 'debug-log-context-clear',
                            data: {}
                        })
                    })
                    that.RED.events.off('flows:loaded', hookDebugClearButton)
                }
            }
            that.RED.events.on('flows:loaded', hookDebugClearButton)

            // Hook into the debug message post-processing to add our "Add to context" button
            RED.hooks.add('debugPostProcessMessage.nr-assistant', function (processedMessage) {
                try {
                    const { message, element, payload } = processedMessage
                    const metaRowTools = element && element.find('.red-ui-debug-msg-meta .red-ui-debug-msg-tools')
                    if (!metaRowTools || !metaRowTools.length) {
                        return // can't find the tools container, so we can't add our button
                    }
                    // Check if the button already exists to avoid adding multiple buttons
                    if (metaRowTools.find('button.ff-expert-debug-context').length) {
                        return // button already exists, no need to add another
                    }

                    // Create button and add data/click handler
                    const buttonEl = $('<button class="ff-expert-debug-context red-ui-button red-ui-button-small"><i class="fa fa-plus"></i></button>')
                    RED.popover.tooltip(buttonEl, 'Add to FlowFuse Expert context')
                    buttonEl.css('cursor', 'pointer')
                    // Here we generate a unique id here and store it as a data attribute on the button, along with the relevant data
                    // (jquery data is used for storage as it allows storing complex objects, whereas data attributes can only store strings)
                    const uuid = `${message._source?.id || message.id}:${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
                    buttonEl.attr('data-ff-expert-debug-uuid', uuid)
                    buttonEl.data('ff-expert-debug-data', { message, payload })
                    buttonEl.on('click', function (evt) {
                        evt.preventDefault()
                        evt.stopPropagation()
                        // toggle off if already selected
                        if (buttonEl.hasClass('selected')) {
                            const uuid = buttonEl.attr('data-ff-expert-debug-uuid')
                            that.postParent({
                                type: 'debug-log-context-remove',
                                debugLog: [{ uuid }]
                            })
                            return
                        }
                        // send formatted debug message to the parent

                        const entry = that.formatDebugMessage(uuid, message, payload)
                        that.postParent({
                            type: 'debug-log-context-add',
                            debugLog: [entry]
                        })
                    })
                    metaRowTools.append(buttonEl)
                } catch (_err) {
                    // fallback to original function if any error is encountered
                    this.debug('Error adding debug log context button, falling back to original element creation', _err)
                }
            })
        }
    }

    setupMessageListeners () {
        // Listen for postMessages from the parent window
        window.addEventListener('message', async (event) => {
            // prevent own messages being processed (unless they are debug test messages)
            if (event.source === window.self) {
                return
            }

            const { type, action, params, target, source, scope, userProperties, transactionId } = event.data || {}

            if (userProperties) {
                this.messageUserProperties = userProperties
            }

            if (transactionId) {
                this.messageTransactionId = transactionId
            }

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
                const handler = this.commandMap[eventName]
                // identify if the hander is a string, function or async function
                let handlerType = typeof handler
                if (handlerType === 'function' && handler.constructor.name === 'AsyncFunction') {
                    handlerType = 'asyncfunction'
                }
                if (type === eventName && handlerType === 'function') {
                    return this.commandMap[eventName](payload)
                }

                if (type === eventName && handlerType === 'asyncfunction') {
                    return await this.commandMap[eventName](payload)
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
                if (hasProperty(this.nodeRedEventsMap, nodeRedEvent)) {
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
                const data = expertToolButtonEl.data('ff-expert-debug-data')
                if (!data) return
                const { message, payload } = data
                const entry = this.formatDebugMessage(uuid, message, payload)
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

    notifyWorkspaceChange () {
        const activeTab = this.RED.workspaces?.active?.()
        const tab = activeTab ? (this.RED.nodes?.workspace(activeTab) || this.RED.nodes?.subflow(activeTab)) : null
        const label = tab?.label || tab?.name
        if (!label) { return }
        this.postParent({
            type: 'nr-assistant/workspace:change',
            tab: { id: tab.id, label }
        })
    }

    /**
     * FlowFuse Expert message handlers
     */
    async handleActionInvocation ({ event, type, action, params } = {}) {
        this.debug(`Received request to invoke action "${action}" with params`, params)
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
            const validation = this.validateActionParams(params, actionSchema)
            if (!validation || !validation.valid) {
                console.warn(`Params for action "${action}" did not validate against the expected schema`, params, actionSchema, validation)
                this.postReply({ type, action, error: validation.error || 'invalid-parameters' }, event)
                return
            }
        }

        const actionNamespace = action.split('/')[0]
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
                this.nrAutomations.importFlow(params.flow, { addFlow: params.addFlow })
                this.postReply({ type, success: true }, event)
            } catch (err) {
                this.RED.notify('Import failed:' + err.message, 'error')
                this.postReply({ type, error: err?.message }, event)
            }
            return
        default: {
            const result = { handled: false, success: false, noReply: false }
            try {
                if (actionNamespace === 'automation') {
                    // Handle supported automated actions
                    await this.nrAutomations.invokeAction(action, { event, params }, result)
                } else {
                    // Handle supported native Node-RED actions
                    this.RED.actions.invoke(action, params)
                    result.handled = true
                    result.success = true
                }
                if (result.noReply === true) {
                    // if the action took care of business or has no reply - i.e. dont reply!
                    return
                }
                this.postReply({ type, action, success: true, ...result }, event)
            } catch (err) {
                result.error = err.message
                result.exception = err
                this.postReply({ type, action, ...result, success: false }, event)
            }
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
            if (hasProperty(palette, plugin.module)) {
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
            if (hasProperty(palette, node.module)) {
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

    handleExpertReady ({ event, params }) {
        // Expert is ready. `params` should contain flags for features the expert supports, which
        // can be used to conditionally enable/disable functionality in the assistant.
        // For now, the only functionality we need to gate is showing the "Add to FF Expert context" buttons
        // in the debug sidebar, which we don't want to show if the expert does not support debug log context!
        const { supportedFeatures } = params || {}
        this.expertSupportedFeatures = { ...supportedFeatures }
        // if the expert supports debug log context, then we should allow the buttons to be shown
        // by setting --ff-feature--display-debug-log-context: unset in the CSS
        if (supportedFeatures.debugLogContext && supportedFeatures.debugLogContext.enabled) {
            document.documentElement.style.setProperty('--ff-feature--display-debug-log-context', 'unset')
        }
    }

    formatSelectedNodes (nodes, includeModuleConfig = true) {
        return this.RED.nodes.createExportableNodeSet(nodes, { includeModuleConfig })
    }

    /**
     * Recursively apply default values from a JSON schema to the data object.
     * Handles nested object properties.
     * @param {*} data - the data object to apply defaults to (mutated in place)
     * @param {object} schema - JSON schema with potential default values
     * @returns {*} the data object with defaults applied
     */
    applySchemaDefaults (data, schema) {
        if (!schema || typeof schema !== 'object') {
            return data
        }
        if (schema.type === 'object' && schema.properties && typeof data === 'object' && data !== null && !Array.isArray(data)) {
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
                if (propSchema.default !== undefined && !(propName in data)) {
                    data[propName] = propSchema.default
                }
                if (propName in data) {
                    this.applySchemaDefaults(data[propName], propSchema)
                }
            }
        } else if (schema.type === 'array' && schema.items && Array.isArray(data)) {
            for (const item of data) {
                this.applySchemaDefaults(item, schema.items)
            }
        }
        return data
    }

    validateActionParams (data, schema) {
        // apply defaults (including nested) before validation
        this.applySchemaDefaults(data, schema)
        const errors = []

        const validate = (data, schema, path, errors) => {
            if (schema.type === 'object') {
                if (typeof data !== 'object' || Array.isArray(data) || data === null) {
                    errors.push(path ? `${path}: is not of a type(s) object` : 'Data is not of type object')
                    return
                }
                // check required properties
                if (Array.isArray(schema.required)) {
                    for (const reqProp of schema.required) {
                        if (!(reqProp in data)) {
                            const propPath = path ? `${path}.${reqProp}` : reqProp
                            errors.push(`${propPath}: is required`)
                        }
                    }
                }
                // check properties
                if (schema.properties) {
                    for (const [propName, propSchema] of Object.entries(schema.properties)) {
                        if (!(propName in data)) continue
                        const propPath = path ? `${path}.${propName}` : propName
                        validate(data[propName], propSchema, propPath, errors)
                    }
                }
            } else if (schema.type === 'array') {
                if (!Array.isArray(data)) {
                    errors.push(path ? `${path}: is not of a type(s) array` : 'Data is not of type array')
                    return
                }
                if (schema.items) {
                    for (let i = 0; i < data.length; i++) {
                        const itemPath = path ? `${path}[${i}]` : `[${i}]`
                        validate(data[i], schema.items, itemPath, errors)
                    }
                }
            } else if (schema.type) {
                const actualType = typeof data
                const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type]
                if (!allowedTypes.includes(actualType)) {
                    errors.push(`${path}: is not of a type(s) ${allowedTypes.join(' or ')}`)
                    return
                }
            }
            // check enum
            if (schema.enum && !schema.enum.includes(data)) {
                errors.push(`${path}: is not one of enum values: ${schema.enum.join(', ')}`)
            }
        }

        validate(data, schema, '', errors)
        if (errors.length > 0) {
            return { valid: false, error: errors.join('; ') }
        }
        return { valid: true }
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
                target: this.MESSAGE_TARGET,

                // if transactionId and userProperties are present, it means that the response is for an agent tool call
                // that is getting executed tool calls are executed sequentially and awaited for, and
                // there should be no risk of overlap
                transactionId: this.messageTransactionId,
                userProperties: this.messageUserProperties
            }, this.targetOrigin)

            // clear message transactionId and userProperties
            this.messageTransactionId = null
            this.messageUserProperties = null
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
     * @param {string} uuid - a unique identifier for this debug log entry, used to manage selection state between Node-RED and the FlowFuse Expert
     * @param {*} message - the debug message object
     * @param {*} payload - the debug payload as sent from backend (rehydrated)
     * @returns an object representing the debug log entry, enriched with metadata about its source and context, suitable for sending to the FlowFuse Expert
     */
    formatDebugMessage (uuid, message, payload) {
        const getInfo = (id, name, type, z) => {
            const result = { id, name: name || '', type, z }
            const node = this.RED.nodes.node(id)
            const isNodeSubFlowInstance = (node?.type || '').startsWith('subflow:')
            const flow = !node ? this.RED.nodes.workspace(id) : null
            if (node) {
                result.type = node.type || result.type
                result.name = node.name || result.name
                result.z = node.z || result.z
                if (isNodeSubFlowInstance) {
                    result.isSubflowInstance = true
                    result.subflowTemplateId = node.type.replace('subflow:', '')
                    const subflowTemplate = this.RED.nodes.subflow(result.subflowTemplateId)
                    result.subFlowTemplateName = subflowTemplate?.name || ''
                }
                if (node._def?.category === 'config') {
                    result.isConfig = true
                }
            } else if (flow) {
                result.type = flow.type || result.type || 'tab'
                result.name = flow.name || result.name
                if (!flow.z && !result.z) {
                    result.z = flow.id // set to self (to aid in identification in the expert)
                }
            }
            return result
        }

        const _source = message._source || {}
        const _sourceId = message._alias || _source._alias || _source.id || message.id || ''
        const _hierarchy = _source.pathHierarchy || [{ id: _sourceId }]
        const hierarchy = _hierarchy.map(e => getInfo(e.id, e.name || e.label, e.type, e.z))
        const source = hierarchy.pop()
        const ancestors = hierarchy
        const metadata = {
            format: message.format,
            timestamp: message.timestamp || Date.now(),
            path: message.path || ''
        }
        if (hasProperty(message, 'topic')) {
            metadata.topic = message.topic // sometimes the message has a topic
        }
        if (hasProperty(message, 'property')) {
            metadata.property = message.property // if the message has a property, it indicates what property of the message is being debugged (e.g. msg.payload, msg.payload.value, etc.)
        }

        const event = {
            uuid,
            level: getNearestLoggingLevel(message.level, 'debug'), // default to 'debug' if no level is provided
            data: payload, // the data in the debug message, as sent from the backend (rehydrated)
            source, // info about the node that generated the debug message
            ancestors, // info about the parent nodes of the source node, up to the workspace level
            metadata
        }
        return event
    }
}
