import { Game } from "../models/Game"
import { Standing } from "../models/Standing"
import { Service } from "../Service"
import { SHL } from "../ShlClient"

class StandingService {
    seasons: Record<number, Service<Standing[]>>
    getCurrentSeason: () => Service<Standing[]>

    constructor(currentSeason: number, numberSeasons: number, shl: SHL) {
        this.seasons = {}
        for (let i = currentSeason; i >= currentSeason - numberSeasons; i--) {
            this.seasons[i] = new Service(`standings_${i}`, () => shl.getStandings(i), i == currentSeason ? 10 * 60 : -1)
         }
         this.getCurrentSeason = () => this.seasons[currentSeason]
    }

    getSeason(season: number): Service<Standing[]> | undefined {
        return this.seasons[season]
    }

    public static getEmptyStandingsFrom(games: Game[]): Standing[] {
        var teams: Set<string> = new Set()
        games?.forEach(e => teams.add(e.home_team_code))
        return Array.from(teams).map(StandingService.getEmptyStanding)
    }

    static getEmptyStanding(team_code: string) {
        return {
            team_code,
            gp: 0,
            points: 0,
            rank: 0,
            diff: 0,
        }
    }
}

export {
    StandingService,
}