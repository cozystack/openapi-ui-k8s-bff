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
