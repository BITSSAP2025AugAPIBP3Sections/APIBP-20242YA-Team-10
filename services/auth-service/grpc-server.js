const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GRPC_PORT = process.env.GRPC_PORT || 50051;

// Load proto file
// In container: proto files are at /app/proto, __dirname is /app
// In development: proto files are at ../../proto relative to this file
const PROTO_PATH = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, './proto/auth.proto')
  : path.join(__dirname, '../../proto/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

// gRPC Service Implementation
const authService = {
  VerifyToken: async (call, callback) => {
    try {
      const { token } = call.request;

      if (!token) {
        return callback(null, {
          valid: false,
          error: 'Token is required'
        });
      }

      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from database
      const result = await pool.query(
        'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return callback(null, {
          valid: false,
          error: 'User not found'
        });
      }

      const user = result.rows[0];
      callback(null, {
        valid: true,
        user_id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        error: ''
      });
    } catch (error) {
      console.error('VerifyToken error:', error);
      callback(null, {
        valid: false,
        error: error.message
      });
    }
  },

  GetUserProfile: async (call, callback) => {
    try {
      const { user_id } = call.request;

      if (!user_id) {
        return callback(null, {
          error: 'User ID is required'
        });
      }

      const result = await pool.query(
        'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = $1',
        [user_id]
      );

      if (result.rows.length === 0) {
        return callback(null, {
          error: 'User not found'
        });
      }

      const user = result.rows[0];
      callback(null, {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at.toISOString(),
        error: ''
      });
    } catch (error) {
      console.error('GetUserProfile error:', error);
      callback(null, {
        error: error.message
      });
    }
  },

  HealthCheck: (call, callback) => {
    callback(null, {
      status: 'ok',
      service: 'auth-service-grpc',
      timestamp: new Date().toISOString()
    });
  }
};

// Start gRPC Server
function startGrpcServer() {
  const server = new grpc.Server();
  server.addService(authProto.AuthService.service, authService);

  server.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Failed to start gRPC server:', err);
        return;
      }
      console.log(`✅ gRPC Server running on port ${port}`);
    }
  );
}

module.exports = { startGrpcServer };
