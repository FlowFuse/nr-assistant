const crypto = require('node:crypto')
const path = require('node:path')
const { readFile, writeFile } = require('node:fs/promises')
const { existsSync } = require('node:fs')

const base64url = require('base64url')
const store = require('./store')
const got = require('got')
let baseURL = 'https://app.flowfuse.com'
const authorizationURL = () => `${baseURL}/account/authorize`
const tokenURL = () => `${baseURL}/account/token`

let activeTokens = { }
const activeTimers = { }
let assistant = null
let tokenFile
let RED

/**
 * Initialise the auth handling for standalone FF Assistant mode
 * @param {*} _RED
 */
async function init (_RED) {
    RED = _RED
    baseURL = RED.settings.flowfuse?.assistant?.url || 'https://app.flowfuse.com'
    tokenFile = path.join(RED.settings.userDir, '.flowfuse-assistant.json')
    if (existsSync(tokenFile)) {
        try {
            const data = await readFile(tokenFile, 'utf8')
            if (data) {
                activeTokens = JSON.parse(data)
                // We currently only support a single user '_'
                const token = activeTokens._
                if (!token || token.expires_at < Date.now()) {
                    RED.log.info('FlowFuse Assistant: access has expired, please log in again')
                    await deleteUserToken('_')
                } else {
                    setupRefreshTimer('_')
                }
            }
        } catch (err) {
            RED.log.error('FlowFuse Assistant: Failed to load access tokens')
        }
    }
}

/**
 * Write tokens to file
 */
async function saveTokens () {
    await writeFile(tokenFile, JSON.stringify(activeTokens), 'utf8')
}

/**
 * Update a user token, setup refresh timer and save to file
 * @param {*} user
 * @param {*} token
 */
async function setUserToken (user, token) {
    activeTokens[user] = token
    setupRefreshTimer(user)
    await saveTokens()
}

/**
 * Setup the refresh timer for the token. User tokens have a relatively short expiry time, but can be refreshed before expiry
 * to provide a longer session.
 * @param {*} user
 */
function setupRefreshTimer (user) {
    const token = activeTokens[user]
    if (!token.expires_at) {
        token.expires_at = Date.now() + (token.expires_in * 1000)
    }
    const refreshInterval = token.expires_at - Date.now() - 10000 // refresh with 10 secs to spare
    if (refreshInterval > 0) {
        activeTimers[user] = setTimeout(async () => {
            try {
                const newTokens = await refreshToken(token)
                newTokens.expires_at = Date.now() + (newTokens.expires_in * 1000)
                await setUserToken(user, newTokens)
            } catch (err) {
                // Failed to refresh token - remove it and disable the agent
                await deleteUserToken(user)
                assistant.RED.log.warn('Failed to refresh FlowFuse Assistant access token')
                reinitialiseAssistant()
            }
        }, refreshInterval)
    }
}

/**
 * When running in a managed FF environment, the tokens are provided statically via settings.
 * This is used to insert the token into the auth table so we have a single place to retrieve
 * tokens from.
 * @param {*} token
 */
function setStaticToken (token) {
    // A token provided by settings file - does not need refresh logic
    activeTokens._ = {
        access_token: token
    }
}

/**
 * Get the current user token
 */
function getUserToken () {
    // Only single shared user supported currently
    return activeTokens._?.access_token
}

/**
 * Delete a users token, clears up refresh timers and updates saved tokens
 * @param {*} user
 */
async function deleteUserToken (user) {
    const token = activeTokens[user]
    if (token) {
        clearTimeout(activeTimers[user])
    }
    delete activeTokens[user]
    delete activeTimers[user]
    saveTokens()
}

/**
 * Make an API request to refresh the user token
 * @param {*} token
 */
async function refreshToken (token) {
    const params = {
        grant_type: 'refresh_token',
        client_id: 'ff-plugin',
        refresh_token: token.refresh_token
    }
    return got.post(tokenURL(), {
        headers: {
            'Content-Type': 'application/json'
        },
        json: params
    }).then(async (result) => {
        return JSON.parse(result.body)
    })
}

function setupRoutes (_assistant, RED) {
    assistant = _assistant
    RED.httpAdmin.get('/nr-assistant/auth/authorize', (request, response) => {
        const existingRequest = store.getRequest(request.query.s)
        if (!existingRequest) {
            return response.send(404)
        }
        const verifier = base64url(crypto.randomBytes(32))
        const scope = 'ff-assistant'
        store.storeRequest({ ...existingRequest, verifier, scope })
        const params = {}
        params.client_id = 'ff-plugin'
        params.scope = scope
        params.response_type = 'code'
        params.state = existingRequest.state
        params.code_challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
        params.code_challenge_method = 'S256'
        params.redirect_uri = existingRequest.redirect_uri
        const authURL = new URL(authorizationURL())
        authURL.search = new URLSearchParams(params)
        response.redirect(authURL.toString())
    })

    RED.httpAdmin.get('/nr-assistant/auth/callback', async (request, response) => {
        if (request.query.error) {
            const postMessage = JSON.stringify({ code: 'flowfuse-auth-error', error: request.query.error, message: request.query.errorDescription })
            response.send(`
<html><head>
<script>
if (window.opener) {
    window.opener.postMessage('${postMessage}', '*')
    window.close()
}
</script>
</head><body>Failed to complete authentication.</body></html>            
`)
            return
        }
        if (!request.query.code || !request.query.state) {
            response.send('Failed to complete authentication')
            return
        }
        const originalRequest = store.getRequest(request.query.state)
        if (!originalRequest) {
            response.send('Failed to complete authentication - unknown state')
            return
        }

        const params = {}
        params.grant_type = 'authorization_code'
        params.code = request.query.code
        params.redirect_uri = originalRequest.redirect_uri
        params.client_id = 'ff-plugin'
        params.code_verifier = originalRequest.verifier

        got.post(tokenURL(), {
            headers: {
                'Content-Type': 'application/json'
            },
            json: params
        }).then(async (result) => {
            const tokens = JSON.parse(result.body)
            await setUserToken(originalRequest.user, tokens)
            const postMessage = JSON.stringify({ code: 'flowfuse-auth-complete', state: originalRequest.state })
            response.send(`
<html><head>
<script>
if (window.opener) {
    window.opener.postMessage('${postMessage}', '*')
    window.close()
}
</script>
</head><body>Success! You're connected to FlowFuse. You can now close this window to continue.</body></html>            
`)
            // Now we have a token for the user, reinitialise the assistant to enable it
            reinitialiseAssistant()
        }).catch((error) => {
            console.warn('request failed', error)
        })
    })

    RED.httpAdmin.use('/nr-assistant/*', RED.auth.needsPermission('flowfuse.write'))

    RED.httpAdmin.post('/nr-assistant/auth/start', async (request, response) => {
        // This request is made from the editor, so will have the Node-RED user attached.
        // Generate the login url for the auth pop-up window
        // if (request.body.forgeURL) {
        //     request.body.forgeURL = request.body.forgeURL.replace(/\/$/, '')
        //     settings.set('forgeURL', request.body.forgeURL)
        // }

        // Ping the server to check it is responsive and looks like a valid FF endpoint
        got.get(`${baseURL}/api/v1/settings`).then(result => {
            const state = base64url(crypto.randomBytes(16))
            const redirect = request.body.editorURL + (request.body.editorURL.endsWith('/') ? '' : '/') + 'nr-assistant/auth/callback'
            store.storeRequest({
                user: '_',
                state,
                redirect_uri: redirect
            })
            const authPath = 'nr-assistant/auth/authorize?s=' + state
            response.send({ path: authPath, state })
        }).catch(err => {
            RED.log.error(`[nr-assistant] Failed to connect to server: ${err.toString()}`)
            response.send({ error: err.toString(), code: 'connect_failed' })
        })
    })
    RED.httpAdmin.post('/nr-assistant/auth/disconnect', async (request, response) => {
        deleteUserToken('_')
        response.send({ })
    })
}

async function reinitialiseAssistant () {
    if (assistant && assistant.RED) {
        const newSettings = await require('../settings').getSettings(assistant.RED)
        assistant.init(assistant.RED, newSettings).then(() => {
            // All good, the assistant is initialized.
            // Any info messages made during initialization are logged in the assistant module
        }).catch((error) => {
            console.error(error)
            assistant.RED.log.error('Failed to initialize FlowFuse Assistant Plugin:', error)
        })
    }
}
module.exports = {
    init,
    setupRoutes,
    getUserToken,
    setStaticToken
}
