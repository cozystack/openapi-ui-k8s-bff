import { RequestHandler } from 'express'
import _ from 'lodash'
import axios from 'axios'
import { getClusterSwagger } from 'src/cache'
import { TPrepareForm, TPrepareFormReq, TPrepareFormRes } from 'src/localTypes/forms'
import { TFormsOverridesData } from 'src/localTypes/formExtensions'
import { KUBE_API_URL, BASE_API_GROUP, BASE_API_VERSION } from 'src/constants/kubeApiUrl'
import { getSwaggerPathAndIsNamespaceScoped, getBodyParametersSchema, processOverride } from './utils/utils'
import { getPathsWithAdditionalProperties, getPropertiesToMerge } from './utils/helpers'
import { httpsAgent } from 'src/constants/httpAgent'

const prepare = async ({ data, clusterName, formsOverridesData }: TPrepareForm['body']): Promise<TPrepareFormRes> => {
  const swagger = await getClusterSwagger(clusterName)

  if (!swagger) {
    return {
      result: 'error',
      error: 'no swagger',
      isNamespaced: false,
      kindName: undefined,
      fallbackToManualMode: true,
    }
  }

  const { swaggerPath, isNamespaced } = getSwaggerPathAndIsNamespaceScoped({
    swagger,
    data,
  })

  const { bodyParametersSchema, kindName, error } = getBodyParametersSchema({ swagger, swaggerPath })

  if (error) {
    return { result: 'error', error, isNamespaced, kindName, fallbackToManualMode: true }
  }

  const pathsWithAdditionalProperties: (string | number)[][] = getPathsWithAdditionalProperties({
    properties: bodyParametersSchema.properties,
  })

  const propertiesToMerge = getPropertiesToMerge({
    pathsWithAdditionalProperties,
    prefillValuesSchema: data.prefillValuesSchema,
    bodyParametersSchema,
  })

  const oldProperties = _.cloneDeep(bodyParametersSchema.properties)
  const newProperties = _.merge(oldProperties, propertiesToMerge)

  const overrideType =
    data.type === 'apis' ? `${data.apiGroup}/${data.apiVersion}/${data.typeName}` : `v1/${data.typeName}`

  const specificCustomOverrides = formsOverridesData?.items.find(item => item.spec.overrideType === overrideType)

  const {
    hiddenPaths,
    expandedPaths,
    persistedPaths,
    propertiesToApply: properties,
    requiredToApply: required,
  } = processOverride({
    specificCustomOverrides,
    newProperties,
    bodyParametersSchema,
  })

  return {
    result: 'success',
    properties,
    required,
    hiddenPaths: hiddenPaths || [],
    expandedPaths,
    persistedPaths,
    kindName,
    isNamespaced,
  }
}

export const prepareFormProps: RequestHandler = async (req: TPrepareFormReq, res) => {
  try {
    const cookies = req.headers.cookie

    const { data: formsOverridesData } = await axios.get<TFormsOverridesData>(
      `${KUBE_API_URL}/api/clusters/${req.body.clusterName}/k8s/apis/${BASE_API_GROUP}/${BASE_API_VERSION}/customformsoverrides`,
      {
        httpsAgent,
        headers: {
          // Forward cookies to the backend
          Cookie: cookies,
          // Optional: Forward the User-Agent or other headers if needed
          'User-Agent': req.headers['user-agent'],
        },
      },
    )

    const result: TPrepareFormRes = await prepare({ ...req.body, formsOverridesData })
    res.json(result)
  } catch (error) {
    res.status(500).json(error)
  }
}
