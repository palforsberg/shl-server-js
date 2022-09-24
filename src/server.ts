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
import { EventService } from './services/EventService'


const config: Config = require(`${process.cwd()}/${process.argv[2]}`)
require('events').EventEmitter.defaultMaxListeners = config.max_listeners || 100

setupLogger(config)

console.log('')
console.log('[SERVER] Starting...', JSON.stringify({ port: config.port, production: config.production }))

const shl = new SHL(config)

const currentSeason = 2022
const nrSeasons = 4

const teamsService = new TeamsService()
const users = new UserService()
const standingsService = new StandingService(currentSeason, nrSeasons, shl)

const statsService = new GameStatsService(shl)
const seasonServices = {
   2022: new SeasonService(currentSeason, 60 * 10, shl, statsService),
   2021: new SeasonService(2021, -1, shl, statsService),
   2020: new SeasonService(2020, -1, shl, statsService),
   2019: new SeasonService(2019, -1, shl, statsService),
}

const eventService = new EventService()

const gameLoop = new GameLoop(
   config,
   seasonServices[currentSeason],
   users,
   statsService,
   standingsService,
   eventService)

const app = express().use(express.json())

const restService = new RestService(
   app,
   seasonServices,
   standingsService,
   users,
   statsService,
   eventService)

restService.setupRoutes()
restService.startListen(config.port)

Object.entries(seasonServices).forEach(e => e[1].update())
Object.entries(standingsService.seasons).forEach(e => e[1].update())

// Populate stats cache
try {
   statsService.db.read().then(() => gameLoop.loop())
} catch (e) {
   console.log('[SERVER] Loop threw ', e)
}