export type THeaders = {
  headers: {
    authorization?: string
  } & unknown
}

export type TExample = {
  body: {
    cluster: string
  }
} & THeaders
