const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const axios = require('axios');

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://localhost:3002';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';
const STREAMING_SERVICE_URL = process.env.STREAMING_SERVICE_URL || 'http://localhost:3003';

// GraphQL Schema
const typeDefs = `#graphql
  type Video {
    id: Int!
    title: String!
    description: String
    category: String
    duration: Int
    pricePerMinute: Int
    filename: String!
    uploadedBy: Int!
    createdAt: String
    updatedAt: String
  }

  type VideosResponse {
    videos: [Video!]!
    total: Int!
    page: Int!
    limit: Int!
  }

  type ViewStats {
    videoId: Int!
    videoTitle: String
    views: Int!
    uniqueViewers: Int!
    totalWatchTime: Int!
    averageWatchTime: Float!
  }

  type RevenueStats {
    totalRevenue: Int!
    totalTransactions: Int!
    averageTransactionAmount: Float!
    revenueByVideo: [VideoRevenue!]!
  }

  type VideoRevenue {
    videoId: Int!
    videoTitle: String
    revenue: Int!
    views: Int!
  }

  type UserBalance {
    userId: Int!
    balance: Int!
  }

  type StreamSession {
    id: Int!
    userId: Int!
    videoId: Int!
    startTime: String!
    endTime: String
    isActive: Boolean!
  }

  type Query {
    # Video queries
    videos(page: Int, limit: Int, category: String): VideosResponse
    video(id: Int!): Video

    # Analytics queries
    videoStats(videoId: Int!): ViewStats
    platformStats: RevenueStats

    # User queries
    userBalance: UserBalance
    activeStreams: [StreamSession!]!
  }

  type Mutation {
    # Billing mutations
    addFunds(amount: Int!): UserBalance

    # Streaming mutations
    startStream(videoId: Int!): StreamSession
    endStream(sessionId: Int!): StreamSession
  }
`;

// Resolvers
const resolvers = {
  Query: {
    videos: async (_, { page = 1, limit = 10, category }, context) => {
      try {
        const params = new URLSearchParams({ page, limit });
        if (category) params.append('category', category);

        const response = await axios.get(`${VIDEO_SERVICE_URL}/api/videos?${params}`);
        return response.data;
      } catch (error) {
        console.error('GraphQL videos error:', error.message);
        throw new Error('Failed to fetch videos');
      }
    },

    video: async (_, { id }) => {
      try {
        const response = await axios.get(`${VIDEO_SERVICE_URL}/api/videos/${id}`);
        return response.data;
      } catch (error) {
        console.error('GraphQL video error:', error.message);
        throw new Error('Failed to fetch video');
      }
    },

    videoStats: async (_, { videoId }, context) => {
      try {
        if (!context.token) {
          throw new Error('Authentication required');
        }

        const response = await axios.get(
          `${ANALYTICS_SERVICE_URL}/api/analytics/videos/${videoId}/stats`,
          {
            headers: { Authorization: `Bearer ${context.token}` }
          }
        );
        return response.data;
      } catch (error) {
        console.error('GraphQL videoStats error:', error.message);
        throw new Error('Failed to fetch video stats');
      }
    },

    platformStats: async (_, __, context) => {
      try {
        if (!context.token) {
          throw new Error('Authentication required');
        }

        const response = await axios.get(
          `${ANALYTICS_SERVICE_URL}/api/analytics/platform/stats`,
          {
            headers: { Authorization: `Bearer ${context.token}` }
          }
        );
        return response.data;
      } catch (error) {
        console.error('GraphQL platformStats error:', error.message);
        throw new Error('Failed to fetch platform stats');
      }
    },

    userBalance: async (_, __, context) => {
      try {
        if (!context.token) {
          throw new Error('Authentication required');
        }

        const response = await axios.get(
          `${BILLING_SERVICE_URL}/api/billing/balance`,
          {
            headers: { Authorization: `Bearer ${context.token}` }
          }
        );
        return response.data;
      } catch (error) {
        console.error('GraphQL userBalance error:', error.message);
        throw new Error('Failed to fetch user balance');
      }
    },

    activeStreams: async (_, __, context) => {
      try {
        if (!context.token) {
          throw new Error('Authentication required');
        }

        const response = await axios.get(
          `${STREAMING_SERVICE_URL}/api/streaming/sessions/active`,
          {
            headers: { Authorization: `Bearer ${context.token}` }
          }
        );
        return response.data.sessions || [];
      } catch (error) {
        console.error('GraphQL activeStreams error:', error.message);
        throw new Error('Failed to fetch active streams');
      }
    }
  },

  Mutation: {
    addFunds: async (_, { amount }, context) => {
      try {
        if (!context.token) {
          throw new Error('Authentication required');
        }

        const response = await axios.post(
          `${BILLING_SERVICE_URL}/api/billing/add-funds`,
          { amount },
          {
            headers: { Authorization: `Bearer ${context.token}` }
          }
        );
        return response.data;
      } catch (error) {
        console.error('GraphQL addFunds error:', error.message);
        throw new Error('Failed to add funds');
      }
    },

    startStream: async (_, { videoId }, context) => {
      try {
        if (!context.token) {
          throw new Error('Authentication required');
        }

        const response = await axios.post(
          `${STREAMING_SERVICE_URL}/api/streaming/start`,
          { videoId },
          {
            headers: { Authorization: `Bearer ${context.token}` }
          }
        );
        return response.data.session;
      } catch (error) {
        console.error('GraphQL startStream error:', error.message);
        throw new Error('Failed to start stream');
      }
    },

    endStream: async (_, { sessionId }, context) => {
      try {
        if (!context.token) {
          throw new Error('Authentication required');
        }

        const response = await axios.post(
          `${STREAMING_SERVICE_URL}/api/streaming/end`,
          { sessionId },
          {
            headers: { Authorization: `Bearer ${context.token}` }
          }
        );
        return response.data.session;
      } catch (error) {
        console.error('GraphQL endStream error:', error.message);
        throw new Error('Failed to end stream');
      }
    }
  }
};

async function setupGraphQL(app, httpServer) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');
        return { token };
      },
    })
  );

  console.log('✅ GraphQL endpoint available at /graphql');
}

module.exports = { setupGraphQL };
