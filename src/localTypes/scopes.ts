import { THeaders } from './common'
import { TApiGroupResourceTypeList, TBuiltinResourceTypeList } from './k8s'

/* check */
export type TCheckIfApiInstanceNamespaceScopedReq = {
  body: {
    typeName: string
    apiGroup: string
    apiVersion: string
    clusterName: string
  }
} & THeaders

export type TCheckIfApiInstanceNamespaceScopedRes = {
  isClusterWide: boolean
  isNamespaceScoped: boolean
}

export type TCheckIfBuiltInInstanceNamespaceScopedReq = {
  body: {
    typeName: string
    clusterName: string
  }
} & THeaders

export type TCheckIfBuiltInInstanceNamespaceScopedRes = {
  isClusterWide: boolean
  isNamespaceScoped: boolean
}

/* filter */
export type TFilterIfApiInstanceNamespaceScopedReq = {
  body: {
    namespace?: string
    data?: TApiGroupResourceTypeList
    apiGroup: string
    apiVersion: string
    clusterName: string
  }
} & THeaders

export type TFilterIfApiInstanceNamespaceScopedRes = TApiGroupResourceTypeList['resources'] | undefined

export type TFilterIfBuiltInInstanceNamespaceScopedReq = {
  body: {
    namespace?: string
    data?: TBuiltinResourceTypeList
    clusterName: string
  }
} & THeaders

export type TFilterIfBuiltInInstanceNamespaceScopedRes = TBuiltinResourceTypeList['resources'] | undefined
