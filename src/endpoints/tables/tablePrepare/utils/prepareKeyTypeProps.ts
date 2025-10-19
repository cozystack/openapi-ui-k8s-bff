import { TAdditionalPrinterColumnsKeyTypeProps, TAdditionalPrinterColumns } from 'src/localTypes/tableExtensions'

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
}): TAdditionalPrinterColumnsKeyTypeProps | undefined => {
  if (ensuredCustomOverrides) {
    return ensuredCustomOverridesKeyTypeProps
  }
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
    ...(namespaceScopedWithoutNamespace && {
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
    }),
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
