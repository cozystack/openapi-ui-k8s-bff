import { OpenAPIV2 } from 'openapi-types'
import { TApiGroupResourceTypeList } from 'src/localTypes/k8s'
import { checkIfApiInstanceNamespaceScoped } from 'src/utils/checkScope'

export const filterApiResources = ({
  namespace,
  data,
  apiGroup,
  apiVersion,
  swagger,
}: {
  namespace?: string
  data?: TApiGroupResourceTypeList
  apiGroup: string
  apiVersion: string
  swagger: OpenAPIV2.Document
}): TApiGroupResourceTypeList['resources'] | undefined => {
  return namespace
    ? data?.resources.filter(
        ({ name }) =>
          checkIfApiInstanceNamespaceScoped({ typeName: name, apiGroup, apiVersion, swagger }).isNamespaceScoped,
      )
    : data?.resources
}
