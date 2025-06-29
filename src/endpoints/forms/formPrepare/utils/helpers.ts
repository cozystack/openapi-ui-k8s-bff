import _ from 'lodash'
import { OpenAPIV2 } from 'openapi-types'
import { TJSON } from '../../../../localTypes/JSON'

export const getPathsWithAdditionalProperties = ({
  properties,
  currentPath = [],
  result = [],
}: {
  properties: OpenAPIV2.SchemaObject['properties']
  currentPath?: (string | number)[]
  result?: (string | number)[][]
}): (string | number)[][] => {
  if (properties) {
    Object.keys(properties).forEach((key: keyof typeof properties) => {
      const newPath = [...currentPath, key]
      if (key === 'additionalProperties') {
        result.push(currentPath)
      } else if (typeof properties[key] === 'object' && properties[key] !== null) {
        getPathsWithAdditionalProperties({ properties: properties[key], currentPath: newPath, result })
      }
    })
  }

  return result
}

export const buildNestedObject = ({
  path,
  defaultValue,
}: {
  path: (string | number)[]
  defaultValue: unknown
}): Record<string, unknown> => {
  if (path.length === 0) {
    return {}
  }

  const [firstKey, ...remainingKeys] = path

  if (remainingKeys.length === 0) {
    return { [firstKey]: defaultValue }
  }

  return { [firstKey]: buildNestedObject({ path: remainingKeys, defaultValue }) }
}

export const getPropertiesToMerge = ({
  pathsWithAdditionalProperties,
  prefillValuesSchema,
  bodyParametersSchema,
}: {
  pathsWithAdditionalProperties: (string | number)[][]
  prefillValuesSchema?: TJSON | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bodyParametersSchema: any
}): Record<string, unknown> => {
  return pathsWithAdditionalProperties.reduce((acc: Record<string, unknown>, path: (string | number)[]) => {
    const pathWithoutProperties = path.filter((_, i) => {
      return i % 2 === 0
    })
    let prefillVals = null
    try {
      prefillVals = _.get(prefillValuesSchema, pathWithoutProperties.join('.'))
      // eslint-disable-next-line no-empty, @typescript-eslint/no-unused-vars
    } catch (e) {}
    if (prefillVals) {
      const prefillValsType = _.get(bodyParametersSchema.properties, `${path.join('.')}.additionalProperties.type`)
      const openapiValues: Record<string, unknown> = {}
      Object.keys(prefillVals).forEach(el => {
        const tempElement = {
          [el]: {
            type: prefillValsType,
            isAdditionalProperties: true,
          },
        }
        const oldOpenApiValues = _.cloneDeep(openapiValues)
        openapiValues.properties = _.merge(oldOpenApiValues.properties, tempElement)
      })
      const newEntryInMergeObject = buildNestedObject({ path, defaultValue: openapiValues })
      const localResult = _.merge(acc, newEntryInMergeObject)
      return localResult
    }
    return acc
  }, {})
}
