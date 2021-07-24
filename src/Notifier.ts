import { GameEvent } from './models/GameEvent'
import { User } from './models/User'

/**
 * For each event, get a list of users to send notification to.
 */
function notify(events: GameEvent[], users: User[]) {
    events.forEach(e => {
        users
            .filter(u => userHasSubscribed(u, e.info.home_team_code, e.info.away_team_code))
            .forEach(u => sendNotification(u, e))
    })
}

function sendNotification(user: User, event: GameEvent) {
    console.log('Notify ' + user.id + ' with ' + event.type)
}

function userHasSubscribed(user: User, team1: string, team2: string) {
    return user.teams.includes(team1) || user.teams.includes(team2)
}

module.exports = {
    notify,
}