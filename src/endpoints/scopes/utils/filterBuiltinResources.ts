import { OpenAPIV2 } from 'openapi-types'
import { TBuiltinResourceTypeList } from '../../../localTypes/k8s'
import { checkIfBuiltInInstanceNamespaceScoped } from '../../../utils/checkScope'

export const filterBuiltinResources = ({
  namespace,
  data,
  swagger,
}: {
  namespace?: string
  data?: TBuiltinResourceTypeList
  swagger: OpenAPIV2.Document
}): TBuiltinResourceTypeList['resources'] | undefined => {
  return namespace
    ? data?.resources?.filter(
        ({ name }) => checkIfBuiltInInstanceNamespaceScoped({ typeName: name, swagger }).isNamespaceScoped,
      )
    : data?.resources
}
