import { Db } from "./Db"

interface WrappedObject<T> {
   timestamp?: string
   data: T
}

class Service<T> {
   private db: Db<WrappedObject<T>>
   service: () => Promise<T>
   expiryDelta: number

   constructor(name: string, defaultData: T, service: () => Promise<T>, expiryDelta = 0) {
      this.fromData = this.fromData.bind(this)
      this.update = this.update.bind(this)
      this.hasExpired = this.hasExpired.bind(this)
      this.read = this.read.bind(this)
      this.write = this.write.bind(this)
      this.db = new Db(name, { data: defaultData })
      this.expiryDelta = expiryDelta * 1000
      this.service = service.bind(this)
   }

   read(): Promise<T> {
      return this.db.read().then(e => e.data)
   }

   write(data: T): Promise<T> {
      return this.db.write(this.fromData(data)).then(e => e.data)
   }

   /**
    * If the data has expired, make call to service and repopulate database.
    * If error occurs, will log and just ignore the response and will not update the database
    * @returns A promise with the updated entity or the old entity if cache not expired or error occured
    */
   update(): Promise<T> {
      return this.db.read().then(wrapped => {
         if (wrapped.timestamp == undefined) { // nothing has been stored yet, need to update
            return this.service().then(this.write)
         }
         if (this.hasExpired(wrapped.timestamp)) { // stored data has expired, need to update first
            return this.service().then(this.write)
         }
         console.log('cache not expired', this.db.name)
         return Promise.resolve(wrapped.data)
      }).catch(e => {
         console.error('[SERVICE] Failed to update', this.db.name, e?.toString())
         return this.db.read().then(e => e.data)
      })
   }

   hasExpired(timestamp: string): boolean {
      if (this.expiryDelta == 0) {
         return true
      }
      if (this.expiryDelta < 0) {
         return false
      }
      const diff = new Date().getTime() - new Date(timestamp).getTime()
      return diff > this.expiryDelta
   }

   private fromData(data: T): WrappedObject<T> {
      return { timestamp: new Date().toString(), data }
   }

}

export {
   Service,
}
