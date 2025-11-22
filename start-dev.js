const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Service configurations
const services = [
  {
    name: 'API Gateway',
    path: './services/api-gateway',
    port: 3000,
    color: colors.cyan,
    env: {
      PORT: '3000',
      AUTH_SERVICE_URL: 'http://localhost:3001',
      VIDEO_SERVICE_URL: 'http://localhost:3002',
      STREAMING_SERVICE_URL: 'http://localhost:3003',
      BILLING_SERVICE_URL: 'http://localhost:3004',
      ANALYTICS_SERVICE_URL: 'http://localhost:3005',
      NODE_ENV: 'development'
    }
  },
  {
    name: 'Auth Service',
    path: './services/auth-service',
    port: 3001,
    color: colors.green,
    env: {
      PORT: '3001',
      JWT_SECRET: 'your-dev-secret-key-change-in-production',
      DATABASE_URL: 'postgresql://streamify_user:streamify_pass@localhost:5432/streamify_auth',
      NODE_ENV: 'development'
    }
  },
  {
    name: 'Video Service',
    path: './services/video-service',
    port: 3002,
    color: colors.yellow,
    env: {
      PORT: '3002',
      DATABASE_URL: 'postgresql://streamify_user:streamify_pass@localhost:5433/streamify_video',
      AUTH_SERVICE_URL: 'http://localhost:3001',
      NODE_ENV: 'development'
    }
  },
  {
    name: 'Streaming Service',
    path: './services/streaming-service',
    port: 3003,
    color: colors.magenta,
    env: {
      PORT: '3003',
      DATABASE_URL: 'postgresql://streamify_user:streamify_pass@localhost:5434/streamify_streaming',
      AUTH_SERVICE_URL: 'http://localhost:3001',
      VIDEO_SERVICE_URL: 'http://localhost:3002',
      BILLING_SERVICE_URL: 'http://localhost:3004',
      ANALYTICS_SERVICE_URL: 'http://localhost:3005',
      NODE_ENV: 'development'
    }
  },
  {
    name: 'Billing Service',
    path: './services/billing-service',
    port: 3004,
    color: colors.blue,
    env: {
      PORT: '3004',
      DATABASE_URL: 'postgresql://streamify_user:streamify_pass@localhost:5435/streamify_billing',
      AUTH_SERVICE_URL: 'http://localhost:3001',
      NODE_ENV: 'development'
    }
  },
  {
    name: 'Analytics Service',
    path: './services/analytics-service',
    port: 3005,
    color: colors.red,
    env: {
      PORT: '3005',
      DATABASE_URL: 'postgresql://streamify_user:streamify_pass@localhost:5436/streamify_analytics',
      AUTH_SERVICE_URL: 'http://localhost:3001',
      VIDEO_SERVICE_URL: 'http://localhost:3002',
      STREAMING_SERVICE_URL: 'http://localhost:3003',
      BILLING_SERVICE_URL: 'http://localhost:3004',
      NODE_ENV: 'development'
    }
  }
];

// Track running processes
const processes = [];

// Function to log with color
function log(service, message, isError = false) {
  const timestamp = new Date().toLocaleTimeString();
  const colorCode = isError ? colors.red : service.color;
  console.log(`${colorCode}[${timestamp}] ${service.name}:${colors.reset} ${message}`);
}

// Function to install dependencies for a service
function installDependencies(service) {
  return new Promise((resolve, reject) => {
    const packageJsonPath = path.join(service.path, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      log(service, `No package.json found, skipping dependency installation`);
      resolve();
      return;
    }

    log(service, `Installing dependencies...`);

    const install = spawn('npm', ['install'], {
      cwd: service.path,
      stdio: 'pipe'
    });

    install.on('close', (code) => {
      if (code === 0) {
        log(service, `Dependencies installed successfully`);
        resolve();
      } else {
        log(service, `Failed to install dependencies (exit code: ${code})`, true);
        reject(new Error(`Dependency installation failed for ${service.name}`));
      }
    });
  });
}

// Function to start a service
function startService(service) {
  return new Promise((resolve) => {
    log(service, `Starting on port ${service.port}...`);

    const child = spawn('node', ['index.js'], {
      cwd: service.path,
      env: { ...process.env, ...service.env },
      stdio: 'pipe'
    });

    // Store the process
    processes.push({ name: service.name, process: child });

    // Handle stdout
    child.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        log(service, message);
      }
    });

    // Handle stderr
    child.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        log(service, message, true);
      }
    });

    // Handle process exit
    child.on('close', (code) => {
      log(service, `Process exited with code ${code}`, code !== 0);
    });

    // Handle errors
    child.on('error', (err) => {
      log(service, `Error: ${err.message}`, true);
    });

    // Give the service a moment to start
    setTimeout(() => {
      resolve(child);
    }, 1000);
  });
}

// Function to check if a service directory exists
function checkServiceExists(service) {
  const servicePath = path.resolve(service.path);
  const indexPath = path.join(servicePath, 'index.js');

  if (!fs.existsSync(servicePath)) {
    log(service, `Service directory not found: ${servicePath}`, true);
    return false;
  }

  if (!fs.existsSync(indexPath)) {
    log(service, `index.js not found: ${indexPath}`, true);
    return false;
  }

  return true;
}

// Function to clean up processes on exit
function cleanup() {
  console.log(`\n${colors.yellow}Shutting down services...${colors.reset}`);

  processes.forEach(({ name, process }) => {
    if (process && !process.killed) {
      console.log(`${colors.yellow}Stopping ${name}...${colors.reset}`);
      process.kill('SIGTERM');
    }
  });

  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Main function
async function main() {
  console.log(`${colors.cyan}🎬 Starting Streamify Microservices...${colors.reset}\n`);

  // Check if all services exist
  const validServices = services.filter(checkServiceExists);

  if (validServices.length === 0) {
    console.log(`${colors.red}No valid services found!${colors.reset}`);
    process.exit(1);
  }

  try {
    // Install dependencies for all services
    console.log(`${colors.yellow}Installing dependencies for all services...${colors.reset}`);
    for (const service of validServices) {
      await installDependencies(service);
    }

    console.log(`\n${colors.yellow}Starting all services...${colors.reset}\n`);

    // Start all services
    for (const service of validServices) {
      await startService(service);
    }

    console.log(`\n${colors.green}✅ All services started successfully!${colors.reset}`);
    console.log(`${colors.cyan}🌐 Frontend available at: http://localhost:3000${colors.reset}`);
    console.log(`${colors.yellow}📡 API Gateway running on port 3000${colors.reset}`);
    console.log(`${colors.yellow}Press Ctrl+C to stop all services${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}Failed to start services: ${error.message}${colors.reset}`);
    cleanup();
  }
}

// Start the application
main().catch((error) => {
  console.error(`${colors.red}Startup error: ${error.message}${colors.reset}`);
  process.exit(1);
});