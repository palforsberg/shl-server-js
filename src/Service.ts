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
      this.fromData = this.fromData.bind(this)
      this.fromDb = this.fromDb.bind(this)
      this.db = create(name, this.fromData, this.fromDb)
      this.service = service.bind(this)
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
   fromData(data: T): Promise<WrappedObject<T>> {
      return Promise.resolve({ timestamp: new Date().toString(), data })
   }
   
   fromDb(dbObject: WrappedObject<T>): Promise<T>  {
      return Promise.resolve(dbObject?.data)
   }
}

export {
   Service,
}
