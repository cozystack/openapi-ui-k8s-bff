import { RequestHandler } from 'express'
import _ from 'lodash'
import { TPrepareTableReq, TPrepareTableRes } from 'src/localTypes/endpoints/tables'
import { TAdditionalPrinterColumns, TTableMappingResponse } from 'src/localTypes/tableExtensions'
import { TApiResources } from 'src/localTypes/k8s'
import { DEVELOPMENT, BASE_API_GROUP, BASE_API_VERSION } from 'src/constants/envs'
import { userKubeApi } from 'src/constants/httpAgent'
import { parseColumnsOverrides } from './utils/parseColumnsOverrides'
import { prepareTableMappings } from './utils/prepareTableMappings'

export const prepareTableProps: RequestHandler = async (req: TPrepareTableReq, res) => {
  try {
    const filteredHeaders = { ...req.headers }
    delete filteredHeaders['host'] // Avoid passing internal host header

    const { data: customcolumnsoverrides } = await userKubeApi.get<TApiResources>(
      `/apis/${BASE_API_GROUP}/${BASE_API_VERSION}/customcolumnsoverrides`,
      {
        headers: {
          ...(DEVELOPMENT ? {} : filteredHeaders),
          'Content-Type': 'application/json',
        },
      },
    )

    const {
      ensuredCustomOverrides,
      ensuredCustomOverridesUndefinedValues,
      ensuredCustomOverridesTrimLengths,
      ensuredCustomOverridesColWidths,
    } = parseColumnsOverrides({
      columnsOverridesData: customcolumnsoverrides,
      customizationId: req.body.customizationId,
    })

    const additionalPrinterColumns: TAdditionalPrinterColumns = req.body.forceDefaultAdditionalPrinterColumns || [
      {
        name: 'Name',
        type: 'string',
        jsonPath: '.metadata.name',
      },
      {
        name: 'Timestamp',
        type: 'string',
        jsonPath: '.metadata.creationTimestamp',
      },
    ]

    const { data: tableurimappings } = await userKubeApi.get<TTableMappingResponse>(
      `/apis/${BASE_API_GROUP}/${BASE_API_VERSION}/tableurimappings`,
      {
        headers: {
          ...(DEVELOPMENT ? {} : filteredHeaders),
          'Content-Type': 'application/json',
        },
      },
    )

    const tableMappingsDataSpecs = tableurimappings.items.map(({ spec }) => spec)

    const tableMappingSpecific =
      tableMappingsDataSpecs.length > 0 && req.body.customizationId && req.body.tableMappingsReplaceValues
        ? prepareTableMappings({
            data: tableMappingsDataSpecs,
            customizationId: req.body.customizationId,
            replaceValues: req.body.tableMappingsReplaceValues,
          })
        : undefined

    const result: TPrepareTableRes = {
      additionalPrinterColumns: ensuredCustomOverrides || additionalPrinterColumns,
      additionalPrinterColumnsUndefinedValues: ensuredCustomOverridesUndefinedValues,
      additionalPrinterColumnsTrimLengths: ensuredCustomOverridesTrimLengths,
      additionalPrinterColumnsColWidths: ensuredCustomOverridesColWidths,
      pathToNavigate: tableMappingSpecific?.pathToNavigate,
      recordKeysForNavigation: tableMappingSpecific?.keysToParse,
      recordKeysForNavigationSecond: tableMappingSpecific?.keysToParseSecond,
      recordKeysForNavigationThird: tableMappingSpecific?.keysToParseThird,
    }

    res.json(result)
  } catch (error) {
    res.status(500).json(error)
  }
}
