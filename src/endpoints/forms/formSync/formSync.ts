import { RequestHandler } from 'express'
import { OpenAPIV2 } from 'openapi-types'
import {
  TFormName,
  TYamlByValuesReq,
  TValuesByYamlReq,
  TYamlByValuesRes,
  TValuesByYamlRes,
} from '../../../localTypes/forms'
import {
  removeEmptyFormValues,
  renameBrokenFieldBack,
  renameBrokenFieldBackToFormAgain,
} from './utils/removeEmptyFormValues'
import { normalizeValuesForQuotas, normalizeValuesForQuotasToNumber } from './utils/normalizeValuesForQuotas'

const onValuesChange = ({
  values,
  persistedKeys,
  properties,
}: {
  values: any
  persistedKeys: TFormName[]
  properties: OpenAPIV2.SchemaObject['properties']
}) => {
  const cleanSchema = removeEmptyFormValues(values, persistedKeys)
  const fixedCleanSchema = renameBrokenFieldBack(cleanSchema)
  const quotasFixedSchema = normalizeValuesForQuotas(fixedCleanSchema, properties)
  return quotasFixedSchema
}

const onYamlChange = ({
  values,
  properties,
}: {
  values: Record<string, unknown>
  properties: OpenAPIV2.SchemaObject['properties']
}) => {
  const normalizedValues = renameBrokenFieldBackToFormAgain(values)
  const normalizedValuesWithQuotas = normalizeValuesForQuotasToNumber(normalizedValues, properties)
  if (normalizedValues) {
    return normalizedValuesWithQuotas
  }
  return undefined
}

export const getYamlValuesByFromValues: RequestHandler = async (req: TYamlByValuesReq, res) => {
  try {
    const result: TYamlByValuesRes = onValuesChange(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json(error)
  }
}

export const getFormValuesByYaml: RequestHandler = async (req: TValuesByYamlReq, res) => {
  try {
    const result: TValuesByYamlRes = onYamlChange(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json(error)
  }
}
