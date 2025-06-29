import { RequestHandler } from 'express'
import axios from 'axios'
const https = require('https')
import { dereference } from '@readme/openapi-parser'
import { OpenAPIV2 } from 'openapi-types'
import { KUBE_API_URL } from '../../constants/kubeApiUrl'

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

export const getDerefedSwagger: RequestHandler = async (req, res) => {
  try {
    const { clusterName } = req.params
    // const authHeader = req.headers.authorization
    axios
      .get<OpenAPIV2.Document>(`${KUBE_API_URL}/api/clusters/${clusterName}/k8s/openapi/v2`, {
        httpsAgent,
      })
      .then(({ data }) => {
        dereference(data, {
          dereference: {
            circular: 'ignore',
          },
        }).then(data => res.json(data))
      })
  } catch (error) {
    res.status(500).json(error)
  }
}
