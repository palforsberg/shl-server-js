import { Db } from "../Db";
import { User } from "../models/User";
import { NotifyError } from "../Notifier";

class UserService {
    db: Db<User[]>

    constructor() {
        this.db = new Db<User[]>('users', [])
    }

    addUser(user: User): Promise<User[]> {
        return this.db.read().then(us => {
            const updated = (us || []).filter(e => e.id != user.id)
            if (user.teams.length > 0 && user.apn_token != undefined) {
                // if apn_token is null or teams is empty we dont want to push notifications to that user
                // we can remove it from the db until both has been set
                updated.push(user)
            }
            return this.db.write(updated)
        })
    }

    handleNotificationError(error: Error) {
        if (error instanceof NotifyError) {
            console.log('[USER] NotifyError ' + JSON.stringify(error.failed))
        } else {
            console.log('[USER] Unknown Error ' + JSON.stringify(error))
        }
    }
}

export {
    UserService,
}