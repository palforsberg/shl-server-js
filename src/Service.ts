import { Db } from "./Db"
import { DbWrapper, create } from "./DbWrapper"

interface WrappedObject<T> {
   timestamp: string
   data: T
}

class Service<T> {
   db: DbWrapper<T, WrappedObject<T>>
   service: () => Promise<T>
   update: () => Promise<T>

   constructor(name: string, service: () => Promise<T>, expiryDelta = 0) {
      this.db = create(name, this.fromData, this.fromDb)
      this.service = service
      this.update = () => this.db.db.read().then((wrapped: WrappedObject<T>) => {

         const hasExpired = (delta: number) =>
            new Date().getTime() - new Date(wrapped.timestamp || 0).getTime() > delta

         if (wrapped == undefined) {
            return service().then(this.db.write)
         } else if (expiryDelta >= 0 && hasExpired(expiryDelta * 1000)) {
            return service().then(this.db.write)
         }
         return wrapped.data
      })
   }
   fromData(data: T): WrappedObject<T> {
      return { timestamp: new Date().toString(), data }
   }
   
   fromDb(dbObject: WrappedObject<T>): T  {
      return dbObject?.data
   }
}

export {
   Service,
}
