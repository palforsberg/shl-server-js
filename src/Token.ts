import { Service } from './Service'

interface Token {
   access_token: string,
}
function createTokenGetter(service: () => Promise<Token>, expiresIn = 3600) {
   const s = new Service<Token>('token', service, expiresIn)
   return () => s.update().then(s.db.read).then((t: Token) => {
      return t?.access_token
   })
}

export {
   createTokenGetter
}