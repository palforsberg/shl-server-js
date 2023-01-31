import { isUserValid, User } from "../models/User";
import { SeasonService } from "./SeasonService";
import { GameStatsService } from "./GameStatsService";
import { StandingService } from "./StandingService";
import { TeamsService } from "./TeamsService";
import { UserService } from "./UserService";
import { GameStats } from "../models/GameStats";
import { WsEventService } from "./WsEventService";
import { GameReportService, getStatusFromGameReport } from "./GameReportService";
import { Config } from "../models/Config";
import { PlayerService } from "./PlayerService";

class RestService {
    private config: Config
    private seasonServices: Record<number, SeasonService>
    private standingServices: StandingService
    private users: UserService
    private statsService: GameStatsService
    private wsEventService: WsEventService
    private gameReportService: GameReportService
    private playerService: PlayerService
    private app: any

    constructor(
        config: Config,
        app: any,
        seasonServices: Record<number, SeasonService>,
        standingServices: StandingService,
        users: UserService,
        statsService: GameStatsService,
        wsEventService: WsEventService,
        gameReportService: GameReportService,
        playerService: PlayerService,
    ) {
        this.config = config
        this.app = app
        this.seasonServices = seasonServices
        this.standingServices = standingServices
        this.users = users
        this.statsService = statsService
        this.wsEventService = wsEventService
        this.gameReportService = gameReportService
        this.playerService = playerService
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
            return season.getDecorated().then(e => res.json(e))
         })
         
         this.app.get('/game/:game_uuid/:game_id', async (req: any, res: any) => {
            let stats = this.statsService.getFromCache(req.params.game_uuid) ?? GameStats.empty()
            const report = await this.gameReportService.read(req.params.game_uuid)
            stats.report = report
            if (report) {
               stats.status = getStatusFromGameReport(report)
            }
            if (report != undefined && stats.recaps?.gameRecap != undefined) {
               stats.recaps!.gameRecap.homeG = report.homeScore
               stats.recaps!.gameRecap.awayG = report.awayScore
            }
            stats!.events = await this.wsEventService.read(req.params.game_uuid)
            return res.json(stats)
         })

         this.app.post('/game/fetch/:game_uuid/:game_id/:pass', async (req: any, res: any) => {
            let stats = await this.statsService.updateGame(req.params.game_uuid, req.params.game_id)
            return res.json(stats)
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
                    res.json(StandingService.getEmptyStandingsFrom(g || [])))
               } else {
                  return res.json(s)
               }
            }) 
         })

         this.app.get('/playoffs/:season', (req: any, res: any) => {
            return res.sendFile('./playoff.json', { root: process.cwd() })
         })

         this.app.get('/players/:team', async (req: any, res: any) => {
            var players = await this.playerService.getPlayersForTeam(req.params.team)
            return res.json(players)
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
            return res.json(TeamsService.getTeams())
         })
    }
}

export {
    RestService,
}