import { gql } from 'apollo-server'

export const typeDefs = gql`
  type Query {
    games: [Game]
    me: User
  }

  type Game {
    id: String!
    time: String!
    context: GameContext
    homeTeam: Team
    awayTeam: Team
    referees: RefereeAssignment
    location: Facility
  }

  type Team {
    name: String
  }

  type Facility {
    name: String
    address: Address
    games: [Game]
  }

  type RefereeAssignment {
    referee: Referee
    assistantReferee1: Referee
    assistantReferee2: Referee
    fourthOfficial: Referee
    game: Game
  }

  type Referee {
    name: String
    address: Address
    phone: [String!]!
    email: String
  }

  type GameContext {
    competition: Competition
    round: Int
  }

  type Competition {
    name: String
  }

  type Address {
    street: String
  }

  type User {
    username: String!
    password: String!
  }
`
