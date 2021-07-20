

/**
 * 
 *     {
      "away_team_code": "DIF",
      "away_team_result": 0,
      "game_center_active": false,
      "game_id": 14367,
      "game_type": "Regular season game",
      "game_uuid": "qZl-8uIfjbeZ1",
      "highlights_coverage_enabled": false,
      "home_team_code": "IKO",
      "home_team_result": 0,
      "live_coverage_enabled": false,
      "overtime": false,
      "penalty_shots": false,
      "played": false,
      "season": "2021",
      "series": "SHL",
      "start_date_time": "2022-03-15T19:00:00+0100",
      "tv_channels": [],
      "venue": "Be-Ge Hockey Center"
    },
 * @param {*} oldLiveGames 
 * @param {*} newLiveGames 
 */
function compare(oldLiveGames, newLiveGames) {
    const result = []
    const oldIds = arrToMap(oldLiveGames, e => e.game_uuid)
    const newIds = arrToMap(newLiveGames, e => e.game_uuid)


    Object.keys(newIds).filter(e => oldIds[e] == undefined).forEach(e => {
        result.push(Event.began(newIds[e]))
    })
    Object.keys(oldIds).filter(e => newIds[e] == undefined).forEach(e => {
        result.push(Event.ended(oldIds[e]))
    })
    const ongoing = Object.keys(oldIds).filter(e => newIds[e] !== undefined)
    ongoing.forEach(e => {
        const old = oldIds[e]
        const updated = newIds[e]
        /**
         * there is a risk that a goal is made within the first or last 3 seconds of a game
         * in this case it'll not be picked up here but will be considered as a new or ended game
         */
        if (old.home_team_result < updated.home_team_result) {
            result.push(Event.scored(updated))
        }
        if (old.home_team_result > updated.home_team_result) {
            result.push(Event.scored(updated))
        }
        if (old.away_team_result < updated.away_team_result) {
            result.push(Event.scored(updated))
        }
        if (old.away_team_result > updated.away_team_result) {
            result.push(Event.scored(updated))
        }
    })

    return result
}

const arrToMap = (arr, keyMapper) => {
    const map = {}
    arr.forEach(e => map[keyMapper(e)] = e)
    return map
}


class Event {
    constructor(type, info) {
        this.type = type
        this.info = info
    }

    static began(game) {
        return new Event('began', this.getInfo(game))
    }
    static ended(game) {
        return new Event('ended', this.getInfo(game))
    }
    static scored(game) {
        return new Event('scored', this.getInfo(game))
    }


    static getInfo(game) {
        return {
            home_team_code: game.home_team_code,
            home_team_result: game.home_team_result,
            away_team_code: game.away_team_code,
            away_team_result: game.away_team_result,
        }
    }
}
module.exports = {
    compare,
}