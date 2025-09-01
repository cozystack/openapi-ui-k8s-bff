/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-param-reassign */
import { TFormName } from 'src/localTypes/forms'

// export const removeEmptyFormValues = (object: any) => {
//   if (typeof object === 'object' && !Array.isArray(object) && object !== null) {
//     Object.keys(object).forEach(key => {
//       if ((typeof object[key] === 'string' || Array.isArray(object[key])) && object[key].length === 0) {
//         delete object[key]
//       }
//       if (object[key] === undefined) {
//         delete object[key]
//       }
//       if (typeof object[key] === 'object' && !Array.isArray(object[key]) && object[key] !== null) {
//         removeEmptyFormValues(object[key])
//         if (Object.keys(object[key]).length === 0) {
//           delete object[key]
//         }
//       }
//     })
//   }
//   return object
// }

// ----

// export const removeEmptyFormValues = (
//   object: any,
//   persistedKeys: TFormName[],
//   currentPath: (string | number)[] = [],
// ) => {
//   const isSamePath = (path1: (string | number)[], path2: (string | number)[]) => {
//     if (path1.length !== path2.length) return false
//     return path1.every((value, index) => value === path2[index])
//   }

//   const isPathPersisted = (path: (string | number)[]) => {
//     return persistedKeys.some(persistedPath =>
//       isSamePath(path, Array.isArray(persistedPath) ? persistedPath : [persistedPath]),
//     )
//   }

//   if (typeof object === 'object' && !Array.isArray(object) && object !== null) {
//     Object.keys(object).forEach(key => {
//       const newPath = [...currentPath, key]

//       if (typeof object[key] === 'object' && !Array.isArray(object[key]) && object[key] !== null) {
//         removeEmptyFormValues(object[key], persistedKeys, newPath)
//         if (Object.keys(object[key]).length === 0 && !isPathPersisted(newPath)) {
//           delete object[key]
//         }
//       } else {
//         const isEmptyStringOrArray =
//           (typeof object[key] === 'string' || Array.isArray(object[key])) && object[key].length === 0
//         const isUndefined = object[key] === undefined

//         if ((isEmptyStringOrArray || isUndefined) && !isPathPersisted(newPath)) {
//           delete object[key]
//         }
//       }
//     })
//   }
//   return object
// }

type PathSeg = string | number

const OMIT: unique symbol = Symbol('omit')
type MaybeOmit<T> = T | typeof OMIT

const isSamePath = (a: PathSeg[], b: PathSeg[]) => a.length === b.length && a.every((v, i) => v === b[i])

const isPathPersisted = (path: PathSeg[], persisted: TFormName[]) =>
  persisted.some(p => isSamePath(path, Array.isArray(p) ? p : [p]))

const clean = (value: any, persisted: TFormName[], path: PathSeg[]): MaybeOmit<any> => {
  // Remove null/undefined unless persisted
  if (value === null || value === undefined) {
    return isPathPersisted(path, persisted) ? value : OMIT
  }

  // Primitives
  if (typeof value !== 'object') {
    if (typeof value === 'string' && value.length === 0) {
      return isPathPersisted(path, persisted) ? value : OMIT
    }
    return value // number | boolean | non-empty string
  }

  // Arrays
  if (Array.isArray(value)) {
    const cleanedItems = value.map((item, idx) => clean(item, persisted, [...path, idx])).filter(item => item !== OMIT)

    if (cleanedItems.length === 0) {
      return isPathPersisted(path, persisted) ? [] : OMIT
    }
    return cleanedItems
  }

  // Plain objects
  const cleanedEntries = Object.entries(value)
    .map(([k, v]) => {
      const cleaned = clean(v, persisted, [...path, k])
      return cleaned === OMIT ? null : ([k, cleaned] as const)
    })
    .filter((e): e is readonly [string, any] => e !== null)

  if (cleanedEntries.length === 0) {
    return isPathPersisted(path, persisted) ? {} : OMIT
  }

  return Object.fromEntries(cleanedEntries)
}

export const removeEmptyFormValues = (input: any, persistedKeys: TFormName[]): any => {
  const out = clean(input, persistedKeys, [])
  return out === OMIT ? undefined : out
}

export const renameBrokenFieldBack = (object: any) => {
  if (typeof object === 'object' && !Array.isArray(object) && object !== null) {
    Object.keys(object).forEach(key => {
      if (key === 'nodeNameBecauseOfSuddenBug') {
        object.nodeName = object[key]
        delete object[key]
      }
      if (typeof object[key] === 'object' && !Array.isArray(object[key]) && object[key] !== null) {
        renameBrokenFieldBack(object[key])
      }
    })
  }
  if (typeof object === 'object' && Array.isArray(object) && object !== null) {
    if (typeof typeof object[0] === 'object' && !Array.isArray(object[0]) && object[0] !== null) {
      object = object.map(el => renameBrokenFieldBack(el))
    }
  }
  return object
}

// forgive me Lord
export const renameBrokenFieldBackToFormAgain = (object: any) => {
  if (typeof object === 'object' && !Array.isArray(object) && object !== null) {
    Object.keys(object).forEach(key => {
      if (key === 'nodeName') {
        object.nodeNameBecauseOfSuddenBug = object[key]
        delete object[key]
      }
      if (typeof object[key] === 'object' && !Array.isArray(object[key]) && object[key] !== null) {
        renameBrokenFieldBackToFormAgain(object[key])
      }
    })
  }
  if (typeof object === 'object' && Array.isArray(object) && object !== null) {
    if (typeof typeof object[0] === 'object' && !Array.isArray(object[0]) && object[0] !== null) {
      object = object.map(el => renameBrokenFieldBackToFormAgain(el))
    }
  }
  return object
}
