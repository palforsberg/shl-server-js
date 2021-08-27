import { Config } from "./models/Config"

const winston = require('winston')
const { combine, timestamp, printf } = winston.format

function setupLogger(config: Config) {
    const fileOption = {
        maxsize: 2 * 1_000 * 1_000,
        maxFiles: 5,
        tailable: true
    }
    const logger = winston.createLogger({
        format: combine(timestamp(), printf((i: any) => `${i.timestamp}: ${i.message}`)),
        exitOnError: false,
        transports: [
            new winston.transports.File({ filename: 'deployment/error.log', level: 'error', ...fileOption }),
            new winston.transports.File({ filename: 'deployment/console.log', ...fileOption }),
        ],
        exceptionHandlers: [
            new winston.transports.File({ filename: 'deployment/error.log' }),
            new winston.transports.File({ filename: 'deployment/console.log' }),   
        ],
    })
    if (!config.production) {
        // log to stdout as well
        logger.add(new winston.transports.Console())
        logger.exceptions.handle(new winston.transports.Console())
    }
    console.log = (...e) => logger.info(e.join(' '))
    console.error = (...e) => logger.error(e.join(' '))
}

export {
    setupLogger,
}