import _ from 'lodash'
import { OpenAPIV2 } from 'openapi-types'
import { TFormOverride } from 'src/localTypes/formExtensions'
import { overwriteMatchingKeys } from './overwriteMatchingKeys'

export const processOverride = ({
  specificCustomOverrides,
  newProperties,
  bodyParametersSchema,
}: {
  specificCustomOverrides?: TFormOverride
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newProperties: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bodyParametersSchema: any
}): {
  hiddenPaths?: string[][]
  expandedPaths?: string[][]
  persistedPaths?: string[][]
  propertiesToApply: { [name: string]: OpenAPIV2.SchemaObject }
  requiredToApply?: string[]
} => {
  let hiddenPaths
  let expandedPaths
  let persistedPaths
  let propertiesToApply = newProperties
  let requiredToApply

  if (specificCustomOverrides) {
    if (specificCustomOverrides.spec.hidden) {
      hiddenPaths = specificCustomOverrides.spec.hidden
    }

    if (specificCustomOverrides.spec.expanded) {
      expandedPaths = specificCustomOverrides.spec.expanded
    }

    if (specificCustomOverrides.spec.persisted) {
      persistedPaths = specificCustomOverrides.spec.persisted
    }

    // full replace
    if (specificCustomOverrides.spec.strategy === 'fullReplace') {
      if (specificCustomOverrides.spec.schema.properties) {
        propertiesToApply = specificCustomOverrides.spec.schema.properties as {
          [name: string]: OpenAPIV2.SchemaObject
        }
      } else {
        propertiesToApply = newProperties
      }
      if (specificCustomOverrides.spec.schema.required) {
        requiredToApply = specificCustomOverrides.spec.schema.required
      } else {
        requiredToApply = bodyParametersSchema.required
      }
      // merge logic
    } else if (specificCustomOverrides.spec.strategy === 'merge') {
      if (specificCustomOverrides.spec.schema.properties) {
        const oldPropertiesBeforeOverride = _.cloneDeep(newProperties)
        const newPropertiesAfterOverride = _.merge(
          oldPropertiesBeforeOverride,
          specificCustomOverrides.spec.schema.properties,
        )
        propertiesToApply = newPropertiesAfterOverride
      } else {
        propertiesToApply = newProperties
      }
      if (specificCustomOverrides.spec.schema.required) {
        const newRequiredAfterOverride = [
          ...(bodyParametersSchema.required || []),
          ...specificCustomOverrides.spec.schema.required,
        ]
        requiredToApply = newRequiredAfterOverride
      } else {
        requiredToApply = bodyParametersSchema.required
      }
      // replace logic
    } else if (specificCustomOverrides.spec.strategy === 'replace') {
      if (specificCustomOverrides.spec.schema.properties) {
        const oldPropertiesBeforeOverride = _.cloneDeep(newProperties)
        const newPropertiesAfterOverride = overwriteMatchingKeys(
          oldPropertiesBeforeOverride,
          specificCustomOverrides.spec.schema.properties,
        )
        propertiesToApply = newPropertiesAfterOverride
      } else {
        propertiesToApply = newProperties
      }
      if (specificCustomOverrides.spec.schema.required) {
        requiredToApply = [...specificCustomOverrides.spec.schema.required]
      } else {
        requiredToApply = bodyParametersSchema.required
      }
    } else {
      propertiesToApply = newProperties
      requiredToApply = bodyParametersSchema.required
    }
  } else {
    propertiesToApply = newProperties
    requiredToApply = bodyParametersSchema.required
  }

  return { hiddenPaths, expandedPaths, persistedPaths, propertiesToApply, requiredToApply }
}
