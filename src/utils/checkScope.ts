import { OpenAPIV2 } from 'openapi-types'

export const checkIfApiInstanceNamespaceScoped = ({
  typeName,
  apiGroup,
  apiVersion,
  swagger,
}: {
  typeName: string
  apiGroup: string
  apiVersion: string
  swagger: OpenAPIV2.Document
}): { isClusterWide: boolean; isNamespaceScoped: boolean } => {
  const url = `/apis/${apiGroup}/${apiVersion}/${typeName}`
  const nsUrl = `/apis/${apiGroup}/${apiVersion}/namespaces/{namespace}/${typeName}`
  const isClusterWide = Object.keys(swagger.paths || {}).includes(url)
  const isNamespaceScoped = Object.keys(swagger.paths || {}).includes(nsUrl)

  return { isClusterWide, isNamespaceScoped }
}

export const checkIfBuiltInInstanceNamespaceScoped = ({
  typeName,
  swagger,
}: {
  typeName: string
  swagger: OpenAPIV2.Document
}): { isClusterWide: boolean; isNamespaceScoped: boolean } => {
  const url = `/api/v1/${typeName}`
  const nsUrl = `/api/v1/namespaces/{namespace}/${typeName}`
  const isClusterWide = Object.keys(swagger.paths || {}).includes(url)
  const isNamespaceScoped = Object.keys(swagger.paths || {}).includes(nsUrl)

  return { isClusterWide, isNamespaceScoped }
}
