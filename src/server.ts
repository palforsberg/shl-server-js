import { SHL } from './ShlClient'
import { Service } from './Service'
import { GameLoop } from './GameLoop'
import { setupLogger } from './Logger'

import { Standing } from './models/Standing'
import { Config } from './models/Config'

import { GameStatsService } from './services/GameStatsService'
import { TeamsService } from './services/TeamsService'
import { UserService } from './services/UserService'
import { LiveGameService } from './services/LiveGameSerive'
import { GameService } from './services/GameService'
import { StandingService } from './services/StandingService'
import { RestService } from './services/RestService'
import express from 'express'

const config: Config = require(`${process.cwd()}/${process.argv[2]}`)

setupLogger(config)

console.log('')
console.log('[SERVER] Starting...', JSON.stringify({ port: config.port, production: config.production }))

const port = config.port
const shl = new SHL(config.shl_client_id, config.shl_client_secret)

const currentSeason = 2021

const teamsService = new TeamsService()
const users = new UserService()
const seasons: Record<number, GameService> = {}
const standings: Record<number, Service<Standing[]>> = {}

for (let i = currentSeason; i >= currentSeason - 4; i--) {
   seasons[i] = new GameService(i, currentSeason, shl)
   standings[i] = new StandingService(i, currentSeason, shl)
}

const statsService = new GameStatsService(shl)
const liveGamesService = new LiveGameService(seasons[currentSeason])

const gameLoop = new GameLoop(
   config,
   liveGamesService,
   seasons[currentSeason],
   users,
   statsService,
   standings[currentSeason])

const app = express()
app.use(express.json())

const restService = new RestService(app,
   config,
   seasons,
   standings,
   users,
   statsService,
   teamsService)

restService.setupRoutes()
restService.startListen(config.port)

Object.entries(seasons).forEach(e => e[1].update())
Object.entries(standings).forEach(e => e[1].update())

if (config.production) {
   gameLoop.loop()
}