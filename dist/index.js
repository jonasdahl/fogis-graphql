"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_1 = require("apollo-server");
const typeDefs_1 = require("./typeDefs");
const resolvers_1 = require("./resolvers");
const server = new apollo_server_1.ApolloServer({
    typeDefs: typeDefs_1.typeDefs,
    resolvers: resolvers_1.resolvers,
    context: ({ req }) => {
        // Get the user token from the headers.
        const { authorization } = req.headers;
        if (!authorization) {
            console.log('No authorization header set');
            return { principal: null };
        }
        const parsed = authorization.match(/^Basic (.*)$/);
        const match = parsed === null || parsed === void 0 ? void 0 : parsed[1];
        if (!match) {
            console.log('Authorization header had wrong format, must start with Basic ');
            return { principal: null };
        }
        try {
            const text = Buffer.from(match, 'base64').toString('ascii');
            const matches = text.match(/^(.*?):(.*)$/);
            if (matches && matches[1] && matches[2]) {
                return { principal: { username: matches[1], password: matches[2] } };
            }
        }
        catch (e) {
            console.log('Could not parse basic auth token.', e);
            return { principal: null };
        }
        return { principal: null };
    },
});
// The `listen` method launches a web server.
server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
});
//# sourceMappingURL=index.js.map