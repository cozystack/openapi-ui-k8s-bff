import { TTableMappingData } from 'src/localTypes/tableExtensions'
import { prepareTemplate } from 'src/utils/prepareTemplate'

export const prepareTableMappings = ({
  data,
  customizationId,
  replaceValues,
}: {
  data: Partial<TTableMappingData>[]
  customizationId: string
  replaceValues: Record<string, string | undefined>
}): { pathToNavigate?: string; keysToParse?: string[]; keysToParseSecond?: string[] } | undefined => {
  const specificData = data.find(({ id }) => id === customizationId)

  const preparedData = {
    ...specificData,
    pathToNavigate: specificData?.pathToNavigate
      ? prepareTemplate({
          template: specificData.pathToNavigate,
          replaceValues,
        })
      : undefined,
  }

  return preparedData
}
