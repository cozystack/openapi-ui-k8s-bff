import { OpenAPIV2 } from 'openapi-types'
import { TFormName } from 'src/localTypes/forms'
import { removeEmptyFormValues, renameBrokenFieldBack } from './removeAndRename'
import { normalizeValuesForQuotas } from './normalizeQuotas'

export const onValuesChange = ({
  values,
  persistedKeys,
  properties,
}: {
  values: any
  persistedKeys: TFormName[]
  properties: OpenAPIV2.SchemaObject['properties']
}): any => {
  const cleanSchema = removeEmptyFormValues(values, persistedKeys)
  const fixedCleanSchema = renameBrokenFieldBack(cleanSchema)
  const quotasFixedSchema = normalizeValuesForQuotas(fixedCleanSchema, properties)
  return quotasFixedSchema
}
