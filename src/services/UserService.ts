import { Db } from "../Db";
import { User } from "../models/User";

class UserService {
    db: Db<User[]>

    constructor() {
        this.db = new Db<User[]>('users')
    }

    addUser(id: string, teams: string[], apn_token?: string): Promise<User[]> {
        var user: User = { id: id, apn_token: apn_token, teams: teams }
        return this.db.read().then(us => {
            const updated = (us || []).filter(e => e.id != user.id)
            if (user.teams.length > 0 && user.apn_token != undefined) {
                // if apn_token is null or teams is empty we dont want to push notifications to that user
                // we can remove it from the db until both has been set
                updated.push(user)
            }
            return this.db.write(updated)
        })
    }
}

export {
    UserService,
}