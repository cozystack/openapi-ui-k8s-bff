import _, { uniq } from 'lodash'
import { getClusterSwaggerPathByName, getClusterSwaggerPaths } from 'src/cache'
import { TPrepareForm } from 'src/localTypes/forms'
import { TPrepareFormRes } from 'src/localTypes/endpoints/forms'
import { deepMerge } from 'src/utils/deepMerge'
import { getSwaggerPathAndIsNamespaceScoped } from './getSwaggerPathAndIsNamespaceScoped'
import { getBodyParametersSchema } from './getBodyParametersSchema'
import { processOverride } from './processOverride'
import { getPathsWithAdditionalProperties } from './getPathsWithAdditionalProperties'
import { getPropertiesToMerge } from './getPropertiesToMerge'
import { computePersistedAPPaths } from './computePersistedAPPaths'

export const prepare = async ({
  data,
  clusterName,
  formsOverridesData,
  formsPrefillsData,
  customizationId,
  namespacesData,
}: TPrepareForm): Promise<TPrepareFormRes> => {
  const swaggerPaths = await getClusterSwaggerPaths()

  if (!swaggerPaths) {
    return {
      result: 'error',
      error: 'no swagger paths',
      isNamespaced: false,
      kindName: undefined,
      fallbackToManualMode: true,
    }
  }

  const { swaggerPath, isNamespaced } = getSwaggerPathAndIsNamespaceScoped({
    swaggerPaths,
    data,
  })

  const swaggerPathValue = await getClusterSwaggerPathByName(swaggerPath)

  const { bodyParametersSchema, kindName, error } = getBodyParametersSchema({ swaggerPathValue, swaggerPath })

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
  const newProperties = deepMerge(oldProperties, propertiesToMerge)

  const specificCustomOverrides = formsOverridesData?.items.find(item => item.spec.customizationId === customizationId)

  const autoPersistedFromAP = computePersistedAPPaths({
    pathsWithAdditionalProperties,
    prefillValuesSchema: data.prefillValuesSchema,
  })

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

  // merge persisted lists generically
  const mergedPersistedPaths: string[][] = [...(persistedPaths || []), ...autoPersistedFromAP]

  // ensure uniqueness (optional)
  const uniqPersisted = Array.from(new Map(mergedPersistedPaths.map(p => [p.join('\u0000'), p])).values())

  // merge persisted lists generically
  const mergedExpandedPaths: string[][] = [...(expandedPaths || []), ...autoPersistedFromAP]

  // ensure uniqueness (optional)
  const uniqExpanded = Array.from(new Map(mergedExpandedPaths.map(p => [p.join('\u0000'), p])).values())

  return {
    result: 'success',
    properties,
    required,
    hiddenPaths: hiddenPaths || [],
    expandedPaths: uniqExpanded,
    persistedPaths: uniqPersisted,
    kindName,
    isNamespaced,
    formPrefills: formsPrefillsData?.items.find(item => item.spec.customizationId === customizationId),
    namespacesData: namespacesData?.items?.map(item => item.metadata?.name).filter(Boolean),
  }
}
