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
import { examplePost } from './endpoints/example/example'

dotenv.config()

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

app.use(bodyParser.json())

const FRONTEND_URL_FOR_CORS = process.env.FRONTEND_URL_FOR_CORS || 'http://localhost:3000'

app.use(
  cors({
    origin: [FRONTEND_URL_FOR_CORS],
  }),
)

app.post('/openapi-bff/example/example', examplePost)

app.listen(port, () => {
  console.log(`[server]: Server is running at port: ${port}`)
})
