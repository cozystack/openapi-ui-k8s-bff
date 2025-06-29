import { RequestHandler } from 'express'
import axios from 'axios'
const https = require('https')
import { KUBE_API_URL } from '../../constants/kubeApiUrl'
import { TExample } from '../../localTypes/common'

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

export const examplePost: RequestHandler = async (req: TExample, res) => {
  try {
    const response = await axios.get<unknown>(
      `${KUBE_API_URL}/api/clusters/${req.body.cluster}/k8s/apis/front.in-cloud.io/v1alpha1/sidebars/`,
      { httpsAgent },
    )
    res.json(response.data)
  } catch (error) {
    res.status(500).json(error)
  }
}
