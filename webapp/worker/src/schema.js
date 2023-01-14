import { makeExecutableSchema } from '@graphql-tools/schema';

const typeDefinitions = `
	type Query {
		hello: String!
		info(owner: String): Info!
	}

	type Info {
		id: ID!
		owner: String!
		categories: [Category]
	}

	type Category {
		id: ID!
		name: String!
		items: [Item]
	}

	type Item {
		id: ID!
		name: String!
		value: String!
	}
`;

const resolvers = {
  Query: {
    info: (parent, args, context, info) => {
      console.log('args.owners', args.owner);
      return {
        id: 1,
        owner: 'nick.brett1@gmail.com',
      };
    },
  },
};

const schema = makeExecutableSchema({
  resolvers: [resolvers],
  typeDefs: [typeDefinitions],
});

export default schema;
