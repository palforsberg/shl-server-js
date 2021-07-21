
/**
 * For each event, get a list of users to send notification to.
 */
function notify(events, users = []) {
    events.forEach(e => {
        users
            .filter(u => userHasSubscribed(u, e.home_team_code, e.away_team_code))
            .forEach(u => sendNotification(u, e))
    })
}

function sendNotification(user, event) {
    console.log('Notify ' + user.id + ' with ' + event.type)
}

function userHasSubscribed(user, team1, team2) {
    return user.teams.includes(team1) || user.teams.includes(team2)
}

class User {
    constructor(id, teams) {
        this.id = id
        this.teams = teams
    }
}

module.exports = {
    notify,
}