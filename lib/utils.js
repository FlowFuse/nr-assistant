const tryJsonParse = (str, defaultValue = undefined) => {
    try {
        return JSON.parse(str)
    } catch (e) {
        return defaultValue
    }
}

const hasProperty = (obj, prop) => {
    return isObject(obj) && Object.prototype.hasOwnProperty.call(obj, prop)
}

const isObject = (obj) => {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj)
}

const MSG_SUMMARY_MAX_PROPERTIES = 20
const MSG_SUMMARY_MAX_TOPIC_LENGTH = 100

const valueType = (value) => {
    if (value === null) return 'null'
    if (Array.isArray(value)) return 'array'
    if (Buffer.isBuffer(value)) return 'buffer'
    return typeof value
}

/**
 * Summarise a message for an audit log without recording its values: the top-level property
 * names and types, the topic (string or number only, truncated) and the JSON size in bytes.
 * @param {Object} msg - the message to summarise (`_msgid` is ignored)
 * @returns {{properties: Object<string, string>, truncated?: boolean, topic?: string|number, size?: number}}
 */
const summarizeMsg = (msg) => {
    const keys = Object.keys(msg || {}).filter(key => key !== '_msgid')
    const properties = {}
    for (const key of keys.slice(0, MSG_SUMMARY_MAX_PROPERTIES)) {
        properties[key] = valueType(msg[key])
    }
    const summary = { properties }
    if (keys.length > MSG_SUMMARY_MAX_PROPERTIES) {
        summary.truncated = true
    }
    if (typeof msg?.topic === 'string') {
        summary.topic = msg.topic.slice(0, MSG_SUMMARY_MAX_TOPIC_LENGTH)
    } else if (typeof msg?.topic === 'number') {
        summary.topic = msg.topic
    }
    try {
        summary.size = Buffer.byteLength(JSON.stringify(msg || {}))
    } catch (_err) {
        // not serialisable (e.g. circular) - leave size out
    }
    return summary
}

module.exports = {
    tryJsonParse,
    hasProperty,
    isObject,
    summarizeMsg
}
