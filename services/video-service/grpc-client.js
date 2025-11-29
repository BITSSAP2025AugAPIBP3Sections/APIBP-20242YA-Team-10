const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const AUTH_GRPC_URL = process.env.AUTH_GRPC_URL || 'localhost:50051';

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

// Create gRPC client
const authClient = new authProto.AuthService(
  AUTH_GRPC_URL,
  grpc.credentials.createInsecure()
);

// Helper function to verify token via gRPC
function verifyTokenGrpc(token) {
  return new Promise((resolve, reject) => {
    authClient.VerifyToken({ token }, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

// Helper function to get user profile via gRPC
function getUserProfileGrpc(userId) {
  return new Promise((resolve, reject) => {
    authClient.GetUserProfile({ user_id: userId }, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

module.exports = {
  authClient,
  verifyTokenGrpc,
  getUserProfileGrpc
};
