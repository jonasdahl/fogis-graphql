import { ApolloServer } from 'apollo-server'
import { typeDefs } from './typeDefs'
import { resolvers } from './resolvers'

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Get the user token from the headers.
    const { authorization } = req.headers
    if (!authorization) {
      console.log('No authorization header set')
      return { principal: null }
    }
    const parsed = authorization.match(/^Basic (.*)$/)
    const match = parsed?.[1]
    if (!match) {
      console.log('Authorization header had wrong format, must start with Basic ')
      return { principal: null }
    }
    try {
      const text = Buffer.from(match, 'base64').toString('ascii')
      const matches = text.match(/^(.*?):(.*)$/)
      if (matches && matches[1] && matches[2]) {
        return { principal: { username: matches[1], password: matches[2] } }
      }
    } catch (e) {
      console.log('Could not parse basic auth token.', e)
      return { principal: null }
    }

    return { principal: null }
  },
})

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
