import _ from 'lodash'
import { OpenAPIV2 } from 'openapi-types'
import { TJSON } from 'src/localTypes/JSON'
import { TFormOverride } from 'src/localTypes/formExtensions'
import { checkIfApiInstanceNamespaceScoped, checkIfBuiltInInstanceNamespaceScoped } from 'src/utils/checkScope'
import { overwriteMatchingKeys } from './overwriteMatchingKeys'

export const getSwaggerPathAndIsNamespaceScoped = ({
  swagger,
  data,
}: {
  swagger: OpenAPIV2.Document
  data:
    | {
        type: 'builtin'
        typeName: string
        prefillValuesSchema?: TJSON
        prefillValueNamespaceOnly?: string
      }
    | {
        type: 'apis'
        apiGroup: string
        apiVersion: string
        typeName: string
        prefillValuesSchema?: TJSON
        prefillValueNamespaceOnly?: string
      }
}): { swaggerPath: string; isNamespaced: boolean } => {
  let swaggerPath: string = ''
  let isNamespaced: boolean = false

  if (data.type === 'builtin') {
    const { isNamespaceScoped } = checkIfBuiltInInstanceNamespaceScoped({
      typeName: data.typeName,
      swagger,
    })
    if (isNamespaceScoped) {
      isNamespaced = true
    }
    swaggerPath = `/api/v1${isNamespaceScoped ? '/namespaces/{namespace}' : ''}/${data.typeName}`
  } else {
    const { isNamespaceScoped } = checkIfApiInstanceNamespaceScoped({
      apiGroup: data.apiGroup,
      apiVersion: data.apiVersion,
      typeName: data.typeName,
      swagger,
    })
    if (isNamespaceScoped) {
      isNamespaced = true
    }
    swaggerPath = `/apis/${data.apiGroup}/${data.apiVersion}${isNamespaceScoped ? '/namespaces/{namespace}' : ''}/${
      data.typeName
    }`
  }

  return { swaggerPath, isNamespaced }
}

export const getBodyParametersSchema = ({
  swagger,
  swaggerPath,
}: {
  swagger: OpenAPIV2.Document
  swaggerPath: string
}): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bodyParametersSchema: any
  kindName?: string
  error?: string
} => {
  const postData = swagger?.paths?.[swaggerPath]?.post

  if (!postData) {
    const error = `No post data for ${swaggerPath}`
    return { bodyParametersSchema: undefined, kindName: undefined, error }
  }

  const xK8sGroupVersionKind = (postData as { 'x-kubernetes-group-version-kind'?: { kind: string } })?.[
    'x-kubernetes-group-version-kind'
  ]

  if (!xK8sGroupVersionKind) {
    const error = `postData with no x-kubernetes-group-version-kind: ${JSON.stringify(postData, null, 2)}`
    return { bodyParametersSchema: undefined, kindName: undefined, error }
  }

  const kindName = xK8sGroupVersionKind?.kind

  if (!kindName) {
    const error = `x-kubernetes-group-version-kind with no kind: ${JSON.stringify(xK8sGroupVersionKind, null, 2)}`
    return { bodyParametersSchema: undefined, kindName: undefined, error }
  }

  const parameters = postData?.parameters as OpenAPIV2.Parameter[] | undefined // ensure cause we call openapi v2

  if (!parameters) {
    const error = `postData with no parameters: ${JSON.stringify(postData, null, 2)}`
    return { bodyParametersSchema: undefined, kindName, error }
  }

  const bodyParameters = parameters?.filter(el => el.in === 'body')[0]

  if (!bodyParameters) {
    const error = `paremeters with no ${'{in: body}'}: ${JSON.stringify(parameters, null, 2)}`
    return { bodyParametersSchema: undefined, kindName, error }
  }

  const bodyParametersSchema = bodyParameters.schema

  if (!bodyParametersSchema) {
    const error = `bodyParameters with no schema:${JSON.stringify(bodyParameters, null, 2)}`
    return { bodyParametersSchema: undefined, kindName, error }
  }

  if (Object.keys(bodyParametersSchema).includes('$ref')) {
    const error = 'Underefed schema'
    return { bodyParametersSchema, kindName, error }
  }

  return { bodyParametersSchema, kindName, error: undefined }
}

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
