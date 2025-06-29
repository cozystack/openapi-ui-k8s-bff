export type TFormPrefill = {
  spec: {
    overrideType: string
    values: {
      path: (string | number)[]
      value: unknown
    }[]
  }
}

export type TFormsPrefillsData = {
  items: TFormPrefill[]
}

export type TFormOverride = {
  spec: {
    overrideType: string
    strategy: string
    schema: {
      properties: Record<string, unknown>
      required?: string[]
    }
    hidden?: string[][]
    expanded?: string[][]
    persisted?: string[][]
  }
}

export type TFormsOverridesData = {
  items: (TFormOverride & unknown)[]
}
