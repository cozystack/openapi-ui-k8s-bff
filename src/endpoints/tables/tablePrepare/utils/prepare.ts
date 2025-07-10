import jp from 'jsonpath'
import { TJSON } from 'src/localTypes/JSON'
import { TAdditionalPrinterColumns } from 'src/localTypes/tableExtensions'

export const prepare = ({
  dataItems,
  resourceSchema,
  dataForControls,
  additionalPrinterColumns,
}: {
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
  additionalPrinterColumns?: TAdditionalPrinterColumns
}): {
  // dataSource: TableProps['dataSource']
  dataSource: any[]
  // columns: TableProps['columns']
  columns: { title: string; dataIndex: string | string[]; key: string }[]
} => {
  const customFields: { dataIndex: string; jsonPath: string }[] = []

  let columns: { title: string; dataIndex: string | string[]; key: string }[] = []
  if (additionalPrinterColumns) {
    columns = additionalPrinterColumns.map(({ name, jsonPath }) => {
      let newDataIndex: string | undefined = ''

      if (jsonPath.includes('[')) {
        // newDataIndex = uuidv4()
        newDataIndex = JSON.stringify(jsonPath)
        customFields.push({ dataIndex: newDataIndex, jsonPath })
      }

      const fieldsPath = jsonPath.split('.').slice(1)
      return {
        title: name,
        dataIndex: newDataIndex || fieldsPath,
        key: name,
      }
    })
  } else if (resourceSchema) {
    columns = [
      ...Object.keys(resourceSchema).map(el => ({
        title: el,
        dataIndex: el,
        key: el,
      })),
    ]
  }

  let dataSource: any[] = []
  if (additionalPrinterColumns) {
    dataSource = dataItems.map((el: TJSON) => {
      if (typeof el === 'object' && el !== null) {
        if (
          !Array.isArray(el) &&
          el.metadata &&
          typeof el.metadata === 'object' &&
          !Array.isArray(el.metadata) &&
          el.metadata.name &&
          dataForControls
        ) {
          const internalDataForControls = {
            cluster: dataForControls.cluster,
            syntheticProject: dataForControls.syntheticProject,
            pathPrefix: dataForControls.pathPrefix,
            apiGroupAndVersion: dataForControls.apiVersion,
            typeName: dataForControls.typeName,
            entryName: el.metadata.name,
            namespace: el.metadata.namespace || undefined,
            backlink: dataForControls.backlink,
            deletePathPrefix: dataForControls.deletePathPrefix,
            onDeleteHandle: dataForControls.onDeleteHandle,
            permissions: dataForControls.permissions,
          }
          return {
            key: el.metadata.name,
            ...el,
            internalDataForControls,
          }
        }
        return { key: JSON.stringify(el), ...el }
      }
      // impossible in k8s
      return {}
    })
    if (customFields.length > 0) {
      dataSource = dataSource.map((el: TJSON) => {
        const newFieldsForComplexJsonPath: Record<string, TJSON> = {}
        customFields.forEach(({ dataIndex, jsonPath }) => {
          const jpQueryResult = jp.query(el, `$${jsonPath}`)
          newFieldsForComplexJsonPath[dataIndex] =
            Array.isArray(jpQueryResult) && jpQueryResult.length === 1 ? jpQueryResult[0] : jpQueryResult
        })
        if (typeof el === 'object') {
          return { ...el, ...newFieldsForComplexJsonPath }
        }
        // impossible in k8s
        return { ...newFieldsForComplexJsonPath }
      })
    }
  } else {
    dataSource = dataItems.map((el: TJSON) => {
      if (typeof el === 'object' && el !== null && !Array.isArray(el) && el.spec && typeof el.spec === 'object') {
        if (
          !Array.isArray(el) &&
          el.metadata &&
          typeof el.metadata === 'object' &&
          !Array.isArray(el.metadata) &&
          el.metadata.name &&
          dataForControls
        ) {
          const internalDataForControls = {
            cluster: dataForControls.cluster,
            synthetichProject: dataForControls.syntheticProject,
            pathPrefix: dataForControls.pathPrefix,
            apiGroupAndVersion: dataForControls.apiVersion,
            typeName: dataForControls.typeName,
            entryName: el.metadata.name,
            namespace: el.metadata.namespace || undefined,
            backlink: dataForControls.backlink,
            deletePathPrefix: dataForControls.deletePathPrefix,
            onDeleteHandle: dataForControls.onDeleteHandle,
            permissions: dataForControls.permissions,
          }
          return {
            key: el.metadata.name,
            ...el.spec,
            internalDataForControls,
          }
        }
        return { key: JSON.stringify(el.spec), ...el.spec }
      }
      // impossible in k8s
      return {}
    })
  }

  return { dataSource, columns }
}
