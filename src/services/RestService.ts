import { Config } from "../models/Config";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { Notifier } from "../Notifier";
import { GameService } from "./GameService";
import { GameStatsService } from "./GameStatsService";
import { StandingService } from "./StandingService";
import { TeamsService } from "./TeamsService";
import { UserService } from "./UserService";

class RestService {
    private config: Config
    private gamesServices: GameService
    private standingServices: StandingService
    private users: UserService
    private statsService: GameStatsService
    private teamsService: TeamsService
    private app: any
    private notifier: Notifier

    constructor(
        app: any,
        config: Config,
        gamesServices: GameService,
        standingServices: StandingService,
        users: UserService,
        statsService: GameStatsService,
        teamsService: TeamsService,
    ) {
        this.app = app
        this.config = config
        this.gamesServices = gamesServices
        this.standingServices = standingServices
        this.users = users
        this.statsService = statsService
        this.teamsService = teamsService

        this.notifier = new Notifier(config)
    }

    startListen(port: number) {
        return this.app.listen(port, () => console.log(`[REST]: Server is running at http://localhost:${port}`))
    }

    setupRoutes() {

        this.app.get('/games/:season', (req: any, res: any) => {
            const season = this.gamesServices.getSeason(req.params.season)
            if (!season) {
               return res.status(404).send('Could not find season ' + req.params.season)
            }
            return season.db.read().then(s => res.send(JSON.stringify(s)))
         })
         
         this.app.get('/game/:game_uuid/:game_id', (req: any, res: any) => {
            return this.statsService.get(req.params.game_uuid, req.params.game_id).then(stats => {
               if (stats == undefined) {
                  return res.status(404).send('Could not find game')
               }
               return res.send(JSON.stringify(stats))
            })
         })
         
         this.app.get('/standings/:season', (req: any, res: any) => {
            const standing = this.standingServices.getSeason(req.params.season)
            if (!standing) {
               return res.status(404).send('Could not find season ' + req.params.season)
            }
            return standing.db.read().then(s => {
               if (s == undefined || s.length == 0) {
                  const season = this.gamesServices.getSeason(req.params.season)
                  if (!season) {
                      return Promise.resolve()
                  }
                  return season.db.read().then(g => 
                    res.send(JSON.stringify(StandingService.getEmptyStandingsFrom(g || [])))) 
               } else {
                  return res.send(JSON.stringify(s))
               }
            }) 
         })
         
         this.app.post('/user', (req: any, res: any) => {
            const user: User = new User(req.body.id, req.body.teams, req.body.apn_token)
            if (!user.isValid()) {
                return res.status(500)
            }
            return this.users.addUser(user).then(e => res.send('success'))
         })
         
         this.app.get('/teams', (req: any, res: any) => {
            const teams = this.teamsService.db.read()
            return teams.then((e: Team[]) => res.send(JSON.stringify(e)))
         })
         
         this.app.post('/push', (req: any, res: any) => {
            const pass = req.body.admin_password
            if (pass !== this.config.admin_password) {
               return res.status(403).send('Not authorized')
            }
            const msg = req.body.message
            return this.users.db.read().then((us: User[]) => {
               us.forEach(u => this.notifier.sendNotificationMsg(u, msg)) 
               res.send(`Sent notification to ${us.length} users`)
            })
         })
         
    }
}

export {
    RestService,
}