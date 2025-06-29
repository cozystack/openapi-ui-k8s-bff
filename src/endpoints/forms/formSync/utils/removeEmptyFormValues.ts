/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-param-reassign */
import { TFormName } from '../../../../localTypes/forms'

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

export const removeEmptyFormValues = (
  object: any,
  persistedKeys: TFormName[],
  currentPath: (string | number)[] = [],
) => {
  const isSamePath = (path1: (string | number)[], path2: (string | number)[]) => {
    if (path1.length !== path2.length) return false
    return path1.every((value, index) => value === path2[index])
  }

  const isPathPersisted = (path: (string | number)[]) => {
    return persistedKeys.some(persistedPath =>
      isSamePath(path, Array.isArray(persistedPath) ? persistedPath : [persistedPath]),
    )
  }

  if (typeof object === 'object' && !Array.isArray(object) && object !== null) {
    Object.keys(object).forEach(key => {
      const newPath = [...currentPath, key]

      if (typeof object[key] === 'object' && !Array.isArray(object[key]) && object[key] !== null) {
        removeEmptyFormValues(object[key], persistedKeys, newPath)
        if (Object.keys(object[key]).length === 0 && !isPathPersisted(newPath)) {
          delete object[key]
        }
      } else {
        const isEmptyStringOrArray =
          (typeof object[key] === 'string' || Array.isArray(object[key])) && object[key].length === 0
        const isUndefined = object[key] === undefined

        if ((isEmptyStringOrArray || isUndefined) && !isPathPersisted(newPath)) {
          delete object[key]
        }
      }
    })
  }
  return object
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
