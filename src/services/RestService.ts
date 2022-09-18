import { Config } from "../models/Config";
import { Team } from "../models/Team";
import { isUserValid, User } from "../models/User";
import { Notifier } from "../Notifier";
import { SeasonService } from "./SeasonService";
import { GameStatsService } from "./GameStatsService";
import { StandingService } from "./StandingService";
import { TeamsService } from "./TeamsService";
import { UserService } from "./UserService";
import { GameStats } from "../models/GameStats";

class RestService {
    private seasonServices: Record<number, SeasonService>
    private standingServices: StandingService
    private users: UserService
    private statsService: GameStatsService
    private app: any

    constructor(
        app: any,
        seasonServices: Record<number, SeasonService>,
        standingServices: StandingService,
        users: UserService,
        statsService: GameStatsService,
    ) {
        this.app = app
        this.seasonServices = seasonServices
        this.standingServices = standingServices
        this.users = users
        this.statsService = statsService
    }

    startListen(port: number) {
        return this.app.listen(port, () => console.log(`[REST]: Server is running at http://localhost:${port}`))
    }

    setupRoutes() {

        this.app.get('/games/:season', (req: any, res: any) => {
            const season = this.seasonServices[req.params.season]
            if (!season) {
               return res.status(404).send('Could not find season ' + req.params.season)
            }
            return season.read().then(s => res.send(JSON.stringify(s)))
         })
         
         this.app.get('/game/:game_uuid/:game_id', (req: any, res: any) => {
            const stats = this.statsService.getFromDb(req.params.game_uuid) || GameStats.empty()
            return res.send(JSON.stringify(stats))
         })
         
         this.app.get('/standings/:season', (req: any, res: any) => {
            const standing = this.standingServices.getSeason(req.params.season)
            if (!standing) {
               return res.status(404).send('Could not find season ' + req.params.season)
            }
            return standing.read().then(s => {
               if (s == undefined || s.length == 0) {
                  const season = this.seasonServices[req.params.season]
                  if (!season) {
                      return Promise.resolve()
                  }
                  return season.read().then(g => 
                    res.send(JSON.stringify(StandingService.getEmptyStandingsFrom(g || [])))) 
               } else {
                  return res.send(JSON.stringify(s))
               }
            }) 
         })
         
         this.app.post('/user', (req: any, res: any) => {
            const user: User = {
               id: req.body.id ? `${req.body.id}` : '',
               teams: req.body.teams,
               apn_token: req.body.apn_token,
               ios_version: req.body.ios_version,
               app_version: req.body.app_version
            }
            if (!isUserValid(user)) {
                return res.status(500)
            }
            return this.users.addUser(user).then(e => res.send('success'))
         })
         
         this.app.get('/teams', (req: any, res: any) => {
            return res.send(JSON.stringify(TeamsService.getTeams()))
         })
    }
}

export {
    RestService,
}