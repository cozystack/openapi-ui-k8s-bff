import { RequestHandler } from 'express'
import { TYamlByValuesReq, TValuesByYamlReq, TYamlByValuesRes, TValuesByYamlRes } from 'src/localTypes/endpoints/forms'
import { onValuesChange } from './utils/onValuesChange'
import { onYamlChange } from './utils/onYamlChange'

export const getYamlValuesByFromValues: RequestHandler = async (req: TYamlByValuesReq, res) => {
  try {
    const result: TYamlByValuesRes = onValuesChange(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json(error)
  }
}

export const getFormValuesByYaml: RequestHandler = async (req: TValuesByYamlReq, res) => {
  try {
    const result: TValuesByYamlRes = onYamlChange(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json(error)
  }
}
