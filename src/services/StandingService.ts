import { Standing } from "../models/Standing"
import { Service } from "../Service"
import { SHL } from "../ShlClient"

class StandingService extends Service<Standing[]> {
    constructor(season: number, currentSeason: number, shl: SHL) {
        super(`standings_${season}`, () => shl.getStandings(season), season == currentSeason ? 10 * 60 : -1)
    }
}

export {
    StandingService,
}