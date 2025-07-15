import { RequestHandler } from 'express'
import { getClusterSwagger } from 'src/cache'
import { TGetDerefedSwaggerRes } from 'src/localTypes/endpoints/swagger'

export const getDerefedSwagger: RequestHandler = async (req, res) => {
  try {
    const swagger: TGetDerefedSwaggerRes = await getClusterSwagger()

    return res.json(swagger)
  } catch (error) {
    console.error('Error getting dereferenced Swagger:', error)
    return res.status(500).json(error)
  }
}
