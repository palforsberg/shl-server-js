
import { Db } from './Db'
import { Game } from './models/Game'
import { User } from './models/User'
const { SHL } = require('./ShlClient.js')
import { Service } from './Service'
import * as GameComparer from './GameComparer'
const Notifier = require('./Notifier.js')

const clientId = process.argv[2]
const clientSecret = process.argv[3]
const shl = new SHL(clientId, clientSecret)

const currentSeason = 2021

const standingsService = new Service<Game[]>(
   'standings',
   () => shl.getStandings(currentSeason),
   10 * 60)

const liveGamesService = new Service<Game[]>(
   'live_games',
   () => gamesService.db.read().then(getLiveGames))

const serviceForSeason = (s: number, expiry = 0) => new Service<Game[]>(
      'games_' + s,
      () => shl.getGames(s),
      expiry)

const users = new Db<User[]>('users')

const gamesService: Service<Game[]> = serviceForSeason(currentSeason)

const oldSeasons: Service<Game[]>[] = []
for (let i = currentSeason - 4; i < currentSeason; i++) {
   oldSeasons.push(serviceForSeason(i, -1))
}

/**
 * Get games for 4 old seasons if isn't stored already
 * 
 * Live loop:
 * Get current season
 * Find all live games
 * Compare live games to previous cycle, find started games, finished games, new goals
 */
function main() {
   oldSeasons.forEach(e => e.update())
   gameLoop()
}

function gameLoop() {
   liveGamesService.db.read().then(oldLiveGames => {
      gamesService.update()
         .then(standingsService.update)
         .then(liveGamesService.update)
         .then((liveGames: Game[]) => {
            const events = GameComparer.compare(oldLiveGames, liveGames)
            users.read().then(us => Notifier.notify(events, us))

            var delay = liveGames.length > 0 ? 3 : 30
            setTimeout(gameLoop, delay * 1000)
         })
   })
}

function getLiveGames(games: Game[]): Game[] {
   const now = new Date()
   const hasHappened = (date: Date) => new Date(date) < now
   const isLive = (g: Game) => !g.played && hasHappened(g.start_date_time)
   return games?.filter(isLive) || []
}

main()