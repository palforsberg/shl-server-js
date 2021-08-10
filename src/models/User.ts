class User {

    id: string
    teams: string[]
    apn_token?: string

    constructor(id: string, teams: string[], apn_token?: string) {
        this.id = id
        this.teams = teams
        this.apn_token = apn_token
    }
}

export {
    User,
}