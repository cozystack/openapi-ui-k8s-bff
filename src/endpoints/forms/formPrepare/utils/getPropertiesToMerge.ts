import _ from 'lodash'
import { TJSON } from 'src/localTypes/JSON'
import { buildNestedObject } from './buildNestedObject'

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
