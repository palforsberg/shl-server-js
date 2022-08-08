class User {

    id: string
    teams: string[]
    apn_token?: string
    ios_version?: string
    app_version?: string

    constructor(id: string, teams: string[], apn_token?: string, ios_version?: string, app_version?: string) {
        this.id = id?.toString()
        this.teams = teams
        this.apn_token = apn_token
        this.ios_version = ios_version
        this.app_version = app_version
    }

    isValid(): boolean {
        if (this.id == undefined || this.teams == undefined) {
            return false
        }
        if (typeof this.id !== 'string') {
            return false
        }
        if (!Array.isArray(this.teams)) {
            return false
        }

        return true
    }
}

export {
    User,
}