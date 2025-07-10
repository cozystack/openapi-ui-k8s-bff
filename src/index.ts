import express, { Express } from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import expressWs from 'express-ws'
const healthcheck = require('express-healthcheck')
const promBundle = require('express-prom-bundle')
const metricsMiddleware = promBundle({ includeMethod: true })
const cors = require('cors')
const winston = require('winston')
const expressWinston = require('express-winston')
// const apicache = require('apicache')
import { BASEPREFIX } from 'src/constants/envs'
import { getDerefedSwagger } from 'src/endpoints/swagger/getDerefedSwagger/getDerefedSwagger'
import { getYamlValuesByFromValues, getFormValuesByYaml } from 'src/endpoints/forms/formSync/formSync'
import { prepareFormProps } from 'src/endpoints/forms/formPrepare/formPrepare'
import { prepareTableProps } from 'src/endpoints/tables/tablePrepare/tablePrepare'
import { checkIfApiNamespaceScoped, checkIfBuiltInNamespaceScoped } from 'src/endpoints/scopes/checkScopes/checkScopes'
import {
  filterIfApiNamespaceScoped,
  filterIfBuiltInNamespaceScoped,
} from 'src/endpoints/scopes/filterByScope/filterByScope'

dotenv.config()

// const cache = apicache.middleware

const nonWsApp: Express = express()
const { app } = expressWs(nonWsApp)
const port = process.env.PORT || 3000

app.use('/healthcheck', healthcheck())
app.use(metricsMiddleware)

if (process.env.SWAGGER === 'TRUE') {
  const swaggerUi = require('swagger-ui-express')
  const swaggerDocument = require('./swagger/swagger-output.json')
  app.use('/swagger/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
}

if (process.env.LOGGER === 'TRUE') {
  app.use(
    expressWinston.logger({
      transports: [new winston.transports.Console()],
      timeStamp: true,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.json(),
      ),
      expressFormat: true,
      colorize: false,
      requestWhitelist: process.env.LOGGER_WITH_HEADERS === 'TRUE' ? ['body', 'headers'] : ['body'],
      responseWhitelist: ['body'],
    }),
  )
}

app.use(bodyParser.json({ limit: '50mb' }))

const FRONTEND_URL_FOR_CORS = process.env.FRONTEND_URL_FOR_CORS || 'http://localhost:3000'

app.use(
  cors({
    origin: [FRONTEND_URL_FOR_CORS],
  }),
)

/* swagger */
// app.get('/openapi-bff/swagger/swagger/:clusterName', cache('5 minutes'), getDerefedSwagger)
app.get(`${BASEPREFIX}/openapi-bff/swagger/swagger/:clusterName`, getDerefedSwagger)

/* forms */
app.post(`${BASEPREFIX}/openapi-bff/forms/formSync/getYamlValuesByFromValues`, getYamlValuesByFromValues)
app.post(`${BASEPREFIX}/openapi-bff/forms/formSync/getFormValuesByYaml`, getFormValuesByYaml)
app.post(`${BASEPREFIX}/openapi-bff/forms/formPrepare/prepareFormProps`, prepareFormProps)

/* tables */
app.post(`${BASEPREFIX}/openapi-bff/tables/tablePrepare/prepareTableProps`, prepareTableProps)

/* scopes */
app.post(`${BASEPREFIX}/openapi-bff/scopes/checkScopes/checkIfApiNamespaceScoped`, checkIfApiNamespaceScoped)
app.post(`${BASEPREFIX}/openapi-bff/scopes/checkScopes/checkIfBuiltInNamespaceScoped`, checkIfBuiltInNamespaceScoped)
app.post(`${BASEPREFIX}/openapi-bff/scopes/filterScopes/filterIfApiNamespaceScoped`, filterIfApiNamespaceScoped)
app.post(`${BASEPREFIX}/openapi-bff/scopes/filterScopes/filterIfBuiltInNamespaceScoped`, filterIfBuiltInNamespaceScoped)

app.listen(port, () => {
  console.log(`[server]: Server is running at port: ${port}`)
})
