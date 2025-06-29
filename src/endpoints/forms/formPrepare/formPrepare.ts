import { RequestHandler } from 'express'
import _ from 'lodash'
import { getClusterSwagger } from '../../../cache'
import { TPrepareFormReq, TPrepareFormRes } from '../../../localTypes/forms'
import { getSwaggerPathAndIsNamespaceScoped, getBodyParametersSchema, processOverride } from './utils/utils'
import { getPathsWithAdditionalProperties, getPropertiesToMerge } from './utils/helpers'

const prepare = async ({
  data,
  clusterName,
  formsOverridesData,
}: TPrepareFormReq['body']): Promise<TPrepareFormRes> => {
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

  return { result: 'success', properties, required, hiddenPaths, expandedPaths, persistedPaths, kindName, isNamespaced }
}

export const prepareFormProps: RequestHandler = async (req: TPrepareFormReq, res) => {
  try {
    const result: TPrepareFormRes = await prepare(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json(error)
  }
}
