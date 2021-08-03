import { Db } from "./Db";
import { User } from "./models/User";

class UserService {
    db: Db<User[]>

    constructor() {
        this.db = new Db<User[]>('users')
    }

    addUser(apn_token: string, teams: [string]): Promise<User[]> {
        var user: User = { id: apn_token, apn_token: apn_token, teams: teams }
        return this.db.read().then(us => {
            const updated = (us || []).filter(e => e.id != user.id)
            if (teams.length > 0) {
                updated.push(user)
            }
            return this.db.write(updated)
        })
    }
}

export {
    UserService,
}