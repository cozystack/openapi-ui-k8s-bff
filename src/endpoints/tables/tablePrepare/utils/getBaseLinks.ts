import {
  BASE_FRONTEND_PREFIX,
  BASE_CLUSTERNAME,
  BASE_FACTORY_NAMESPACED_API_KEY,
  BASE_FACTORY_CLUSTERSCOPED_API_KEY,
  BASE_FACTORY_NAMESPACED_BUILTIN_KEY,
  BASE_FACTORY_CLUSTERSCOPED_BUILTIN_KEY,
} from 'src/constants/envs'

// href: "/factory/job-details/{reqsJsonPath[0]['.metadata.name']['-']}",

export const getResourceLinkWithoutName = ({
  resource,
  apiGroup,
  apiVersion,
  isNamespaced,
  namespace,
}: {
  resource: string
  apiGroup?: string
  apiVersion: string
  isNamespaced?: boolean
  namespace?: string
}): string => {
  if (apiGroup) {
    return `/${BASE_FRONTEND_PREFIX}/${BASE_CLUSTERNAME}${isNamespaced && namespace ? `/${namespace}` : ''}/factory/${
      isNamespaced ? BASE_FACTORY_NAMESPACED_API_KEY : BASE_FACTORY_CLUSTERSCOPED_API_KEY
    }/${apiGroup}/${apiVersion}/${resource}`
  }
  return `/${BASE_FRONTEND_PREFIX}/${BASE_CLUSTERNAME}${isNamespaced && namespace ? `/${namespace}` : ''}/factory/${
    isNamespaced ? BASE_FACTORY_NAMESPACED_BUILTIN_KEY : BASE_FACTORY_CLUSTERSCOPED_BUILTIN_KEY
  }/${apiGroup}/${apiVersion}/${resource}`
}
