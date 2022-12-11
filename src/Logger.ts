import { Config } from "./models/Config"

function setupLogger(config: Config) {
    if (!config.production) {
        // log to stdout as well
        console.debug = (...e) => console.log(e.join(' '))
    }

    process.on('uncaughtException', e => {
        console.error('uncaughtException:', e)
    })

    process.on('unhandledRejection', (reason, promise) => {
        console.error('unhandledRejection:', reason, promise)
    })
}

export {
    setupLogger,
}