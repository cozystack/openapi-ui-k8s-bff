import { RequestHandler } from 'express'
import _ from 'lodash'
import axios from 'axios'
import { TPrepareFormReq, TPrepareFormRes } from 'src/localTypes/endpoints/forms'
import { TFormsOverridesData, TFormsPrefillsData } from 'src/localTypes/formExtensions'
import { TBuiltinResources } from 'src/localTypes/k8s'
import { KUBE_API_URL, BASE_API_GROUP, BASE_API_VERSION } from 'src/constants/envs'
import { userKubeApi } from 'src/constants/httpAgent'
import { prepare } from './utils/prepare'

export const prepareFormProps: RequestHandler = async (req: TPrepareFormReq, res) => {
  try {
    const cookies = req.headers.cookie

    const { data: formsOverridesData } = await userKubeApi.get<TFormsOverridesData>(
      `${KUBE_API_URL}/apis/${BASE_API_GROUP}/${BASE_API_VERSION}/customformsoverrides`,
      {
        headers: {
          Cookie: cookies,
          'User-Agent': req.headers['user-agent'],
        },
      },
    )

    const { data: formsPrefillsData } = await userKubeApi.get<TFormsPrefillsData>(
      `${KUBE_API_URL}/apis/${BASE_API_GROUP}/${BASE_API_VERSION}/customformsprefills`,
      {
        headers: {
          Cookie: cookies,
          'User-Agent': req.headers['user-agent'],
        },
      },
    )

    const { data: namespacesData } = await userKubeApi.get<TBuiltinResources>(`${KUBE_API_URL}/api/v1/namespaces`, {
      headers: {
        Cookie: cookies,
        'User-Agent': req.headers['user-agent'],
      },
    })

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
