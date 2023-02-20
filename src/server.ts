import { SHL } from './ShlClient'
import { GameLoop } from './GameLoop'
import { setupLogger } from './Logger'

import { Config } from './models/Config'

import { GameStatsService } from './services/GameStatsService'
import { TeamsService } from './services/TeamsService'
import { UserService } from './services/UserService'
import { SeasonService } from './services/SeasonService'
import { StandingService } from './services/StandingService'
import { RestService } from './services/RestService'
import express from 'express'
import compression from 'compression'
import { Notifier } from './Notifier'
import { ShlSocket } from './ShlSocket'
import { SocketMiddleware } from './services/SocketMiddleware'
import { WsEventService } from './services/WsEventService'
import { FileAppend } from './services/FileAppend'
import { GameReportService } from './services/GameReportService'
import { PlayerService } from './services/PlayerService'

const config: Config = require(`${process.cwd()}/${process.argv[2]}`)
require('events').EventEmitter.defaultMaxListeners = config.max_listeners || 100

setupLogger(config)

console.log('')
console.log('[SERVER] Starting...', JSON.stringify({ port: config.port, production: config.production }))

const shl = new SHL(config)

const currentSeason = 2022
const nrSeasons = 4

const teamsService = new TeamsService()
const userService = new UserService()
const standingsService = new StandingService(currentSeason, nrSeasons, shl)
const wsEventService = new WsEventService()
const gameReportService = new GameReportService()
const statsService = new GameStatsService(shl)
const seasonServices = {
   2022: new SeasonService(currentSeason, 60 * 10, shl, gameReportService, statsService),
   2021: new SeasonService(2021, -1, shl, gameReportService, statsService),
   2020: new SeasonService(2020, -1, shl, gameReportService, statsService),
   2019: new SeasonService(2019, -1, shl, gameReportService, statsService),
}
const playerService = new PlayerService(
   currentSeason,
   seasonServices[currentSeason].getDecorated,
   statsService.getFromCache)

const notifier = new Notifier(config, userService)
notifier.setOnError(userService.handleNotificationError)

const socket = new ShlSocket(config.shl_socket_path)
const middleware = new SocketMiddleware(seasonServices[currentSeason], socket, wsEventService, gameReportService, notifier, statsService)

FileAppend.enabled = config.production

socket.onEvent(e => {
   return middleware.onEvent(e)
})
socket.onGameReport(g => {
   return middleware.onGame(g)
})
socket.onClose(() => {
})

const gameLoop = new GameLoop(
   seasonServices[currentSeason],
   statsService,
   standingsService,
   socket,
   playerService,
)

const app = express()
   .use(express.json())
   .use(compression())

const restService = new RestService(
   config,
   app,
   seasonServices,
   standingsService,
   userService,
   statsService,
   wsEventService,
   gameReportService,
   playerService,
)

restService.setupRoutes()
restService.startListen(config.port)

try {
   // Populate caches
   Promise.all(Object.entries(seasonServices).map(e => e[1].update()))
      .then(() => Promise.all(Object.entries(standingsService.seasons).map(e => e[1].update())))
      .then(() => seasonServices[currentSeason].populateGameIdCache())
      .then(() => statsService.db.read())
      .then(() => wsEventService.db.read())
      .then(() => playerService.update())
      .then(() => gameLoop.loop())
} catch (e) {
   console.log('[SERVER] Loop threw ', e)
}