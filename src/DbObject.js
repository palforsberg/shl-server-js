function extend(db, service) {
   db.readDbObject = () => db.read().then(fromDb)
   db.writeDbObject = data => db.write(fromData(data))
   db.readCachedDbObject = (expiryDelta) => db.readDbObject().then(data => {
      if (data.hasExpired(expiryDelta * 1000)) {
         return service().then(db.writeDbObject)
      }
      return data
   })
   return db
}

function fromData(data) {
   const dbObject = { timestamp: new Date().toString(), data }
   return fromDb(dbObject)
}

function fromDb(dbObject) {
   const object = { ...dbObject }
   object.hasExpired = (delta) => {
      if (object.timestamp == undefined || delta == undefined) {
         return true
      }
      return new Date() - new Date(object.timestamp) > delta
   }
   return object;
}

module.exports = {
   extend,
   fromData,
   fromDb,
}