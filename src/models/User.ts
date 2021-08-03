class User {

    id: string
    teams: string[]
    apn_token?: string
    constructor(id: string, teams: string[]) {
        this.id = id
        this.teams = teams
    }
}

export {
    User,
}