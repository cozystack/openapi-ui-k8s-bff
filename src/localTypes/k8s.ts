import { TJSON } from './JSON'

/* types lists */

export type TApiGroupResourceTypeList = {
  apiVersion: string
  kind: string
  groupVersion: string
  resources: ({
    name: string
    kind: string
  } & unknown)[]
} & unknown

export type TBuiltinResourceTypeList = {
  kind: string
  groupVersion: string
  resources: {
    name: string
    singularName: string
    namespaced: boolean
    kind: string
    verbs: string[]
  }[]
}

/* single resource */

export type TSingleResource = unknown & {
  metadata: {
    name: string
    creationTimestamp: string
    namespace?: string
    managedFields?: any
  }
  spec?: TJSON
  status?: any
}

/* multiple resources */

export type TBuiltinResources = {
  kind: string
  apiVersion: string
  metadata: {
    name: string
    // resourceVersion: string
  }
  items: TSingleResource[]
}

export type TApiResources = {
  kind: string
  apiVersion: string
  metadata: {
    name: string
    // resourceVersion: string
  }
  items: TSingleResource[]
}

export type TCrdResources<T = TJSON[]> = {
  kind: string
  apiVersion: string
  metadata: {
    // resourceVersion: string
    managedFields?: any
  }
  items: T
  status?: {
    allowed?: boolean
    reason?: string
  }
} & unknown
