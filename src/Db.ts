const fs = require('fs')

interface FileError {
   code: string
}
class Db<T> {
   in_mem?: T
   name: string
   defaultValue: T

   constructor(name: string, defaultValue: T) {
      this.name = name
      this.defaultValue = defaultValue
      this.read = this.read.bind(this)
      this.write = this.write.bind(this)
      this.storeInMemory = this.storeInMemory.bind(this)
      this.handleError = this.handleError.bind(this)
   }

   write(data: T): Promise<T> {
      this.storeInMemory(data)
      return fs.promises.writeFile(Db.getPath(this.name), JSON.stringify(data, null, 2))
         .catch((e: FileError) => this.handleError(e, this.name))
         .then((e: any) => data)
   }
   
   read(): Promise<T> {
      if (this.in_mem) {
         return Promise.resolve(this.in_mem)
      }
      console.log(`[DB] read ${this.name} from file`)
      return fs.promises.readFile(Db.getPath(this.name))
         .then(JSON.parse)
         .catch((e: FileError) => this.handleError(e, this.name))
         .then((data: T | undefined) => this.storeInMemory(data || this.defaultValue))
   }

   readCached(): T {
      return this.in_mem || this.defaultValue
   }

   private storeInMemory(data: T): T {
      this.in_mem = data
      return data
   }
   
   private handleError(e: FileError, db: string): T {
      if (e.code == 'ENOENT') {
         console.log('[DB] could not find db-file', db)
      } else {
         console.error('[DB] ERROR reading', e)
      }
      return this.in_mem || this.defaultValue
   }
   
   private static getPath(db: string) {
      return `./db/${db}.json`
   }
}



export {
   Db,
}