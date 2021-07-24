import { Db } from './Db'

interface DbWrapper<E,I> {
   read: () => Promise<E>,
   write: (a: E) => Promise<E>,
   db: Db<I>,
}
function create<E, I>(name: string, fromData: (a: E) => I, fromDb: (a: I) => E): DbWrapper<E, I> {
   var db = new Db<I>(name)
   return {
      read: () => db.read().then(fromDb),
      write: (data: E) => db.write(fromData(data)).then(fromDb),
      db: db,
   }
}

export {
   DbWrapper,
   create,
}