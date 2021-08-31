const fetch = require('node-fetch');
const ca = require('ssl-root-cas').create();
const https = require('https');
/**
 * Make sure the connection is open and throw appropriate error if it not
 */
exports.networkError = (err) => {
    console.log('NETWORK ERROR: ', err);
    throw new Error();
}

class APIToken {
    /**
     * Returns a json that can be used to talk to the Node server
     * @param {number} project - project ID
     * @param {number} user - user ID
     */
    constructor ({
        project = -1,
        user = -1
    }) {
        this.project = project;
        this.user = user;
    }

    async isValid () {
        const res = await exports.request('/get-project-access', this);
        return res['accessLevel'] > 0;
    }
}

exports.APIToken = APIToken;

/**
 *
 * @param {string} url - must start with a '/'
 * @param {APIToken} token
 * @param {object} body
 * @return {Promise<object>}
 */
exports.request = async (url, token = new APIToken({}), body={}) => {
    if (!(token instanceof APIToken)) {
        console.error(`Backend API token must be of type 'APIToken': `, token);
        return {};
    }

    const agent = new https.Agent({
        ca,
        rejectUnauthorized: false
    });

    let response = await fetch(`https://entropyengine.dev:50001${url}`, {
        method: 'POST',
        body: JSON.stringify({
            ...body, token
        }),
        agent
    }).catch(exports.networkError);

    return await response.json();
}

try {
    exports.request('/ping')
        .then(ping => {
            if (!ping.ok)
                exports.networkError('!ping.ok');
        })
        .catch((error) => {
            exports.networkError(error);
        });
} catch (E) {
    exports.networkError(E);
}
