class User {

    id: string
    teams: string[]
    constructor(id: string, teams: string[]) {
        this.id = id
        this.teams = teams
    }
}

export {
    User,
}