const pendingRequests = {}

function storeRequest (request) {
    pruneRequests()
    request.ttl = Date.now() + 1000 * 60 * 5 // 5 minute ttl
    pendingRequests[request.state] = request
}
function getRequest (state) {
    pruneRequests()
    const result = pendingRequests[state]
    delete pendingRequests[state]
    return result
}

function deleteRequest (state) {
    pruneRequests()
    delete pendingRequests[state]
}
function pruneRequests () {
    const now = Date.now()
    for (const [key, value] of Object.entries(pendingRequests)) {
        if (value.ttl < now) {
            delete pendingRequests[key]
        }
    }
}

module.exports = {
    getRequest,
    storeRequest,
    deleteRequest,
    export: () => { return { ...pendingRequests } }
}
