import { SHL } from './ShlClient'
import { GameLoop } from './GameLoop'
import { setupLogger } from './Logger'

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
require('events').EventEmitter.defaultMaxListeners = config.max_listeners || 100

setupLogger(config)

console.log('')
console.log('[SERVER] Starting...', JSON.stringify({ port: config.port, production: config.production }))

const shl = new SHL(config.shl_client_id, config.shl_client_secret)

const currentSeason = 2022
const nrSeasons = 4

const teamsService = new TeamsService()
const users = new UserService()
const gameService = new GameService(currentSeason, nrSeasons, shl)
const standingsService = new StandingService(currentSeason, nrSeasons, shl)

const statsService = new GameStatsService(shl, gameService)
const liveGamesService = new LiveGameService(gameService.getCurrentSeason())

const gameLoop = new GameLoop(
   config,
   liveGamesService,
   gameService,
   users,
   statsService,
   standingsService)

const app = express().use(express.json())

const restService = new RestService(
   app,
   config,
   gameService,
   standingsService,
   users,
   statsService,
   teamsService)

restService.setupRoutes()
restService.startListen(config.port)

Object.entries(gameService.seasons).forEach(e => e[1].update())
Object.entries(standingsService.seasons).forEach(e => e[1].update())

if (config.production) {
   gameLoop.loop()
}