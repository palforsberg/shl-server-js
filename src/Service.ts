import { Db } from "./Db"
import { DbWrapper, create } from "./DbWrapper"

interface WrappedObject<T> {
   timestamp: string
   data: T
}

class Service<T> {
   db: DbWrapper<T, WrappedObject<T>>
   service: () => Promise<T>
   expiryDelta: number

   constructor(name: string, service: () => Promise<T>, expiryDelta = 0) {
      this.fromData = this.fromData.bind(this)
      this.fromDb = this.fromDb.bind(this)
      this.update = this.update.bind(this)
      this.hasExpired = this.hasExpired.bind(this)
      this.db = create(name, this.fromData, this.fromDb)
      this.expiryDelta = expiryDelta * 1000
      this.service = service.bind(this)
   }
   fromData(data: T): Promise<WrappedObject<T>> {
      return Promise.resolve({ timestamp: new Date().toString(), data })
   }
   
   fromDb(dbObject: WrappedObject<T>): Promise<T>  {
      return Promise.resolve(dbObject?.data)
   }

   /**
    * If the data has expired, make call to service and repopulate database.
    * If error occurs, will log and just ignore the response and will not update the database
    * @returns A promise with the updated entity or the old entity if cache not expired or error occured
    */
   update(): Promise<T> {
      const name = this.db.db.name
      return this.db.db.read().then((wrapped: WrappedObject<T>) => {
         if (wrapped == undefined) { // nothing has been stored yet, need to update
            return this.service().then(this.db.write)
         } else if (this.hasExpired(wrapped.timestamp)) { // stored data has expired, need to update first
            return this.service().then(this.db.write)
         }
         console.log('cache not expired ', this.db.db.name)
         return wrapped.data
      }).catch(e => {
         console.error('[SERVICE] Failed to update', this.db.db.name, e?.toString())
         return this.db.db.read().then(e => e?.data)
      })
   }

   hasExpired(timestamp?: string) {
      if (this.expiryDelta == 0) {
         return true
      }
      const diff = new Date().getTime() - new Date(timestamp || 0).getTime()
      return diff > this.expiryDelta
   }
}

export {
   Service,
}
