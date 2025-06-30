const https = require('https')
export const httpsAgent = new https.Agent({ rejectUnauthorized: false })
