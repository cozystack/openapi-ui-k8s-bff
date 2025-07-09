import dotenv from 'dotenv'

dotenv.config()

export const KUBE_API_URL = process.env.KUBE_API_URL
export const BASE_API_GROUP = process.env.BASE_API_GROUP
export const BASE_API_VERSION = process.env.BASE_API_VERSION
export const BASEPREFIX = process.env.BASEPREFIX || ''
export const DEVELOPMENT = process.env.DEVELOPMENT === 'TRUE'
