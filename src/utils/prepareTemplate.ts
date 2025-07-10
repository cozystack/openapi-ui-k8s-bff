export const prepareTemplate = ({
  template,
  replaceValues,
}: {
  template: string
  replaceValues: Record<string, string | undefined>
}): string => {
  return template.replaceAll(/{(.*?)}/g, (_, key) => replaceValues[key] || '')
}
