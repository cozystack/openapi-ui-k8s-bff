import { THeaders } from './common'
import { TJSON } from '../JSON'
import {
  TAdditionalPrinterColumnsUndefinedValues,
  TAdditionalPrinterColumnsTrimLengths,
  TAdditionalPrinterColumnsColWidths,
} from '../tableExtensions'

export type TPrepareTableReq = {
  body: {
    customizationId?: string
    tableMappingsReplaceValues?: Record<string, string | undefined>

    dataItems: TJSON[]
    resourceSchema?: TJSON
    dataForControls?: {
      cluster: string
      syntheticProject?: string
      pathPrefix: string
      apiVersion: string
      typeName: string
      backlink: string
      deletePathPrefix: string
      onDeleteHandle: (name: string, endpoint: string) => void
      permissions: {
        canUpdate?: boolean
        canDelete?: boolean
      }
    }
  }
} & THeaders

export type TPrepareTableRes = {
  // dataSource: TableProps['dataSource']
  dataSource: any[]
  // columns: TableProps['columns']
  columns: { title: string; dataIndex: string | string[]; key: string }[]

  additionalPrinterColumnsUndefinedValues?: TAdditionalPrinterColumnsUndefinedValues
  additionalPrinterColumnsTrimLengths?: TAdditionalPrinterColumnsTrimLengths
  additionalPrinterColumnsColWidths?: TAdditionalPrinterColumnsColWidths

  pathToNavigate?: string
  recordKeysForNavigation?: string[]
}
