
import { Game } from './models/Game'
const { SHL } = require('./ShlClient.js')
import { Service } from './Service'
import { Standing } from './models/Standing'
import express from 'express'
import * as GameComparer from './GameComparer'
import { GameStatsService } from './GameStatsService'
import { Config } from './models/Config'
import { TeamsService } from './TeamsService'
import { UserService } from './UserService'
import { Notifier } from './Notifier'
import { Db } from './Db'

const config: Config = require(`${process.cwd()}/${process.argv[2]}`)

const port = config.port
const shl = new SHL(config.shl_client_id, config.shl_client_secret)

const currentSeason = 2021

const teamsService = new TeamsService()
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

const users = new UserService()

const seasons: Record<number, Service<Game[]>> = {}
const standings: Record<number, Service<Standing[]>> = {}

for (let i = currentSeason; i >= currentSeason - 4; i--) {
   seasons[i] = serviceForSeason(i)
   standings[i] = standingsForSeason(i)
}

const notifier = new Notifier(config)

const app = express()
app.use(express.json())

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
   standing.db.read().then(s => {
      if (s == undefined || s.length == 0) {
         const season = seasons[parseInt(req.params.season)]
         return season.db.read().then(g => {
            var teams: Set<string> = new Set()
            const getStanding: ((a: string) => Standing) = team_code => ({
               gp: 0,
               team_code,
               points: 0,
               rank: 0,
               diff: 0,
            })
            g?.forEach(e => teams.add(e.home_team_code))
            return res.send(JSON.stringify(Array.from(teams).map(getStanding)))
         }) 
      } else {
         return res.send(JSON.stringify(s))
      }
   }) 
})

app.post('/user', (req, res) => {
   users.addUser(req.body.id, req.body.teams, req.body.apn_token)
   res.send('success')
})

app.get('/teams', (req, res) => {
   const teams = teamsService.db.read()
   teams.then(e => res.send(JSON.stringify(e)))
})

function main() {
   app.listen(port, () => console.log(`[REST]: Server is running at http://localhost:${port}`))

   Object.entries(seasons).forEach(e => e[1].update())
   Object.entries(standings).forEach(e => e[1].update())

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
            return users.db.read().then(us => {
               notifier.notify(events, us || [])
               return Promise.resolve()
            }).then(() => Promise.all(liveGames.map(e => statsService.update(e))))
         }))
}

main()

export {
   gameLoop,
}