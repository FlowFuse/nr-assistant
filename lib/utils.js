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

module.exports = {
    tryJsonParse,
    hasProperty,
    isObject
}
