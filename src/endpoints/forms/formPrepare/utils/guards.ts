import { TFormOverride } from '../../../../localTypes/formExtensions'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type SafeShallowShape<Type extends {}> = {
  [_ in keyof Type]?: unknown
}

export const isFormOverride = (root: unknown): root is TFormOverride => {
  if (!(typeof root === 'object' && root !== null)) {
    return false
  }
  const { spec }: SafeShallowShape<TFormOverride> = root
  if (!(typeof spec === 'object' && spec !== null)) {
    return false
  }
  const { overrideType, strategy, schema, hidden, expanded, persisted }: SafeShallowShape<TFormOverride['spec']> = spec
  if (!(typeof overrideType === 'string')) {
    return false
  }
  if (!(typeof overrideType === 'string')) {
    return false
  }
  if (!(typeof strategy === 'string')) {
    return false
  }
  if (!(typeof schema === 'object' && schema !== null)) {
    return false
  }
  if (!Array.isArray(hidden) && typeof hidden !== 'undefined') {
    return false
  }
  if (!Array.isArray(expanded) && typeof expanded !== 'undefined') {
    return false
  }
  if (!Array.isArray(persisted) && typeof persisted !== 'undefined') {
    return false
  }

  return true
}
