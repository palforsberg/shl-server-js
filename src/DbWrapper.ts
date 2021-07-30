import { Db } from './Db'

interface DbWrapper<E,I> {
   read: () => Promise<E>,
   write: (a: E) => Promise<E>,
   db: Db<I>,
}
function create<E, I>(name: string, fromData: (a: E) => Promise<I>, fromDb: (a: I) => Promise<E>): DbWrapper<E, I> {
   var db = new Db<I>(name)
   return {
      read: () => db.read().then(fromDb),
      write: (data: E) => fromData(data).then(db.write).then(fromDb),
      db: db,
   }
}

export {
   DbWrapper,
   create,
}