import { Service } from './Service'

interface Token {
   access_token: string,
}
function createTokenGetter(service: () => Promise<Token>, expiresIn = 3600) {
   const s = new Service<Token | undefined>('token', undefined, service, expiresIn)
   return () => s.update().then((t: Token | undefined) => t?.access_token)
}

export {
   createTokenGetter
}