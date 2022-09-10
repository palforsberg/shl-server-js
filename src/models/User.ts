
interface User {
    id: string
    teams: string[]
    apn_token?: string
    ios_version?: string
    app_version?: string
}

function isUserValid(user: User): boolean {
    if (user.id == undefined || user.teams == undefined) {
        return false
    }
    if (typeof user.id !== 'string' || user.id.length == 0) {
        return false
    }
    if (!Array.isArray(user.teams)) {
        return false
    }

    return true
}

export {
    User,
    isUserValid,
}