const Db = require('./Db.js')

function create(name, fromData, fromDb) {
   var db = Db.create(name)
   var wrapped = {}
   wrapped.read = () => db.read().then(fromDb)
   wrapped.write = data => db.write(fromData(data)).then(fromDb)

   return wrapped
}

module.exports = {
   create,
}