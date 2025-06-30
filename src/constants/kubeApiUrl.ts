import dotenv from 'dotenv'

dotenv.config()

export const KUBE_API_URL = process.env.KUBE_API_URL
export const BASE_API_GROUP = process.env.BASE_API_GROUP
export const BASE_API_VERSION = process.env.BASE_API_VERSION
export const COOKIE_FOR_BFF = process.env.COOKIE_FOR_BFF
export const USER_AGENT_FOR_BFF = process.env.USER_AGENT_FOR_BFF
