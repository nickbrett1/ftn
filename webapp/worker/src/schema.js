import { makeExecutableSchema } from '@graphql-tools/schema';

const typeDefinitions = `
	type Query {
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
      return {
        id: 1,
        owner: 'nick.brett1@gmail.com',
        categories: [
          {
            id: 2,
            name: 'Travel',
            items: [
              {
                id: 3,
                name: 'Passport',
                value: '123456789',
              },
              {
                id: 4,
                name: 'BA Executive Club',
                value: '123456789',
              },
              {
                id: 5,
                name: 'Known Traveler Number',
                value: '123456789',
              },
            ],
          },
          {
            id: 6,
            name: 'Personal',
            items: [
              {
                id: 7,
                name: 'National Insurance Number',
                value: '123456789',
              },
              {
                id: 8,
                name: 'Social Security Number',
                value: '123456789',
              },
            ],
          },
        ],
      };
    },
  },
};

const schema = makeExecutableSchema({
  resolvers: [resolvers],
  typeDefs: [typeDefinitions],
});

export default schema;
