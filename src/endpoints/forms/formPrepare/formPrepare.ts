import { RequestHandler } from 'express'
import _ from 'lodash'
import axios from 'axios'
import { TPrepareFormReq, TPrepareFormRes } from 'src/localTypes/endpoints/forms'
import { TFormsOverridesData, TFormsPrefillsData } from 'src/localTypes/formExtensions'
import { TBuiltinResources } from 'src/localTypes/k8s'
import { KUBE_API_URL, BASE_API_GROUP, BASE_API_VERSION } from 'src/constants/envs'
import { httpsAgent } from 'src/constants/httpAgent'
import { prepare } from './utils/prepare'

export const prepareFormProps: RequestHandler = async (req: TPrepareFormReq, res) => {
  try {
    const cookies = req.headers.cookie

    const { data: formsOverridesData } = await axios.get<TFormsOverridesData>(
      `${KUBE_API_URL}/api/clusters/${req.body.clusterName}/k8s/apis/${BASE_API_GROUP}/${BASE_API_VERSION}/customformsoverrides`,
      {
        httpsAgent,
        headers: {
          Cookie: cookies,
          'User-Agent': req.headers['user-agent'],
        },
      },
    )

    const { data: formsPrefillsData } = await axios.get<TFormsPrefillsData>(
      `${KUBE_API_URL}/api/clusters/${req.body.clusterName}/k8s/apis/${BASE_API_GROUP}/${BASE_API_VERSION}/customformsprefills`,
      {
        httpsAgent,
        headers: {
          Cookie: cookies,
          'User-Agent': req.headers['user-agent'],
        },
      },
    )

    const { data: namespacesData } = await axios.get<TBuiltinResources>(
      `${KUBE_API_URL}/api/clusters/${req.body.clusterName}/k8s/api/v1/namespaces`,
      {
        httpsAgent,
        headers: {
          Cookie: cookies,
          'User-Agent': req.headers['user-agent'],
        },
      },
    )

    const result: TPrepareFormRes = await prepare({
      ...req.body,
      formsOverridesData,
      formsPrefillsData,
      namespacesData,
    })
    res.json(result)
  } catch (error) {
    res.status(500).json(error)
  }
}
