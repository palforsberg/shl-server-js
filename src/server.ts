
import { Db } from './Db'
import { Game } from './models/Game'
import { User } from './models/User'
const { SHL } = require('./ShlClient.js')
import { Service } from './Service'
import { Standing } from './models/Standing'
import express from 'express'
import * as GameComparer from './GameComparer'
import { GameStatsService } from './GameStatsService'
const Notifier = require('./Notifier.js')

const port = process.argv[2]
const clientId = process.argv[3]
const clientSecret = process.argv[4]
const shl = new SHL(clientId, clientSecret)

const currentSeason = 2021

const standingsForSeason = (s: number) =>
   new Service<Standing[]>(`standings_${s}`, () => shl.getStandings(s), s == currentSeason ? 10 * 60 : -1)

const serviceForSeason = (s: number) =>
   new Service<Game[]>(`games_${s}`, () => shl.getGames(s), s == currentSeason ? 0 : -1)

const statsService = new GameStatsService(shl)

const liveGamesService = new Service<Game[]>(
   'live_games', () => seasons[currentSeason].db.read().then(getLiveGames))

function getLiveGames(games: Game[]): Game[] {
   const now = new Date()
   const hasHappened = (date: Date) => new Date(date) < now
   const isLive = (g: Game) => !g.played && hasHappened(g.start_date_time)
   return games?.filter(isLive) || []
}

const users = new Db<User[]>('users')

const seasons: Record<number, Service<Game[]>> = {}
const standings: Record<number, Service<Standing[]>> = {}

for (let i = currentSeason; i >= currentSeason - 4; i--) {
   seasons[i] = serviceForSeason(i)
   standings[i] = standingsForSeason(i)
}

const app = express()

app.get('/games/:season', (req, res) => {
   const season = seasons[parseInt(req.params.season)]
   if (!season) {
      return res.status(404).send('Could not find season ' + req.params.season)
   }
   season.db.read().then(s => res.send(JSON.stringify(s))) 
})

app.get('/game/:game_uuid/:game_id', (req, res) => {
   statsService.get(req.params.game_uuid, req.params.game_id).then(stats => {
      if (stats == undefined) {
         return res.status(404).send('Could not find game')
      }
      return res.send(JSON.stringify(stats))
   })
})

app.get('/standings/:season', (req, res) => {
   const standing = standings[parseInt(req.params.season)]
   if (!standing) {
      return res.status(404).send('Could not find season ' + req.params.season)
   }
   standing.db.read().then(s => res.send(JSON.stringify(s))) 
})

app.get('/users', (req, res) => {
   res.send(JSON.stringify(users.read()))
})

function main() {
   app.listen(port, () => console.log(`[REST]: Server is running at https://localhost:${port}`))

   Object.entries(seasons).filter(e => parseInt(e[0]) != currentSeason).forEach(e => e[1].update())
   Object.entries(standings).filter(e => parseInt(e[0]) != currentSeason).forEach(e => e[1].update())

   // gameLoop()
}

function gameLoop() {
   console.log('[LOOP] ******* Begin ********')
   gameJob()
      .then(liveGamesService.db.read)
      .then(liveGames => {
         var delay = liveGames.length > 0 ? 0 : 30
         setTimeout(gameLoop, delay * 1000)
         console.log('[LOOP] ******* End **********')
      })
}

function gameJob() {
   return liveGamesService.db.read().then(oldLiveGames => 
      seasons[currentSeason].update()
         .then(standings[currentSeason].update)
         .then(liveGamesService.update)
         .then(liveGames => {
            const events = GameComparer.compare(oldLiveGames || [], liveGames)
            return users.read().then(us => {
               Notifier.notify(events, us || [])
               return Promise.resolve()
            }).then(() => Promise.all(liveGames.map(e => statsService.update(e))))
         }))
}

main()

export {
   gameLoop,
}