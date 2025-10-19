import { TAdditionalPrinterColumnsKeyTypeProps, TAdditionalPrinterColumns } from 'src/localTypes/tableExtensions'

export const getNameFactory = ({
  kind,
  basePrefixLinkWithoutName,
}: {
  kind?: string
  basePrefixLinkWithoutName?: string
}): TAdditionalPrinterColumnsKeyTypeProps => {
  return {
    Name: {
      type: 'factory',
      customProps: {
        disableEventBubbling: true,
        items: [
          {
            type: 'antdFlex',
            data: {
              align: 'center',
              direction: 'row',
              gap: 6,
              id: 'resource-badge-link-row',
            },
            children: [
              {
                type: 'ResourceBadge',
                data: {
                  id: 'example-resource-badge',
                  value: kind,
                },
              },
              {
                type: 'antdLink',
                data: {
                  href: `${basePrefixLinkWithoutName}/{reqsJsonPath[0]['.metadata.name']['-']}`,
                  id: 'name-link',
                  text: "{reqsJsonPath[0]['.metadata.name']['-']}",
                },
              },
            ],
          },
        ],
      },
    },
  }
}

export const getNamespaceFactory = ({
  basePrefixLinkWithoutName,
}: {
  basePrefixLinkWithoutName?: string
}): TAdditionalPrinterColumnsKeyTypeProps => {
  return {
    Namespace: {
      type: 'factory',
      customProps: {
        disableEventBubbling: true,
        items: [
          {
            type: 'antdFlex',
            data: {
              align: 'center',
              direction: 'row',
              gap: 6,
              id: 'resource-badge-link-row',
            },
            children: [
              {
                type: 'ResourceBadge',
                data: {
                  id: 'example-resource-badge',
                  value: 'Namespace',
                },
              },
              {
                type: 'antdLink',
                data: {
                  href: `${basePrefixLinkWithoutName}/{reqsJsonPath[0]['.metadata.namespace']['-']}`,
                  id: 'name-link',
                  text: "{reqsJsonPath[0]['.metadata.namespace']['-']}",
                },
              },
            ],
          },
        ],
      },
    },
  }
}

export const getTimestampFactory = (): TAdditionalPrinterColumnsKeyTypeProps => {
  return {
    Created: {
      type: 'factory',
      customProps: {
        disableEventBubbling: true,
        items: [
          {
            type: 'parsedText',
            data: {
              id: 'created-timestamp',
              text: "{reqsJsonPath[0]['.metadata.creationTimestamp']['-']}",
              formatter: 'timestamp',
            },
          },
        ],
      },
    },
  }
}

export const prepareKeyTypeProps = ({
  ensuredCustomOverrides,
  ensuredCustomOverridesKeyTypeProps,
  namespaceScopedWithoutNamespace,
  kind,
  basePrefixLinkWithoutName,
}: {
  ensuredCustomOverrides?: TAdditionalPrinterColumns
  ensuredCustomOverridesKeyTypeProps: TAdditionalPrinterColumnsKeyTypeProps | undefined
  namespaceScopedWithoutNamespace?: boolean
  kind?: string
  basePrefixLinkWithoutName?: string
}): TAdditionalPrinterColumnsKeyTypeProps => {
  const nameFactory = getNameFactory({ kind, basePrefixLinkWithoutName })
  const namespaceFactory = getNamespaceFactory({ basePrefixLinkWithoutName })
  const timestampFactory = getTimestampFactory()

  // Start with a shallow copy of provided key-type props (if any).
  const result: TAdditionalPrinterColumnsKeyTypeProps = ensuredCustomOverridesKeyTypeProps
    ? { ...ensuredCustomOverridesKeyTypeProps }
    : {}

  // Compose the factories we want to ensure (Namespace only if namespaceScopedWithoutNamespace).
  const requiredFactories: TAdditionalPrinterColumnsKeyTypeProps = {
    ...nameFactory,
    ...(namespaceScopedWithoutNamespace ? namespaceFactory : {}),
    ...timestampFactory,
  }

  // For each required factory key: if missing or not a factory, replace it.
  for (const key of Object.keys(requiredFactories)) {
    const existing = result[key]
    const shouldReplace = !existing || existing.type !== 'factory'
    if (shouldReplace) {
      result[key] = requiredFactories[key]
    }
  }

  // If there were no incoming overrides and result is still empty (shouldn't happen),
  // fall back to the composed factories.
  if (Object.keys(result).length === 0) {
    return requiredFactories
  }

  return result
}
