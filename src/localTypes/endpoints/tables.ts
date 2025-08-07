import { THeaders } from './common'
import { TJSON } from '../JSON'
import {
  TAdditionalPrinterColumns,
  TAdditionalPrinterColumnsUndefinedValues,
  TAdditionalPrinterColumnsTrimLengths,
  TAdditionalPrinterColumnsColWidths,
} from '../tableExtensions'

export type TPrepareTableReq = {
  body: {
    customizationId?: string
    tableMappingsReplaceValues?: Record<string, string | undefined>
    forceDefaultAdditionalPrinterColumns?: TAdditionalPrinterColumns
  }
} & THeaders

export type TPrepareTableRes = {
  additionalPrinterColumns: TAdditionalPrinterColumns
  additionalPrinterColumnsUndefinedValues?: TAdditionalPrinterColumnsUndefinedValues
  additionalPrinterColumnsTrimLengths?: TAdditionalPrinterColumnsTrimLengths
  additionalPrinterColumnsColWidths?: TAdditionalPrinterColumnsColWidths

  pathToNavigate?: string
  recordKeysForNavigation?: string[]
  recordKeysForNavigationSecond?: string[]
  recordKeysForNavigationThird?: string[]
}
