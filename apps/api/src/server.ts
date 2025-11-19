import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'http';
import { errorHandler } from './middleware/errors';

// Import routes
import authRoutes from './routes/auth';
import consultantRoutes from './routes/consultants';
import cycleRoutes from './routes/cycles';
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';
import auditRoutes from './routes/audit';
import equipmentRoutes from './routes/equipment';
import workHoursRoutes from './routes/work-hours';
import timeDoctorRoutes from './routes/time-doctor';
import bonusRoutes from './routes/bonus';
import settingsRoutes from './routes/settings';
import payoneerRoutes from './routes/payoneer';

const app = express();
const PORT = process.env.PORT || 2021;

// Keep track of the server instance for graceful shutdown
let server: Server;

// CORS configuration with support for ngrok and multiple origins
// CORS must be configured BEFORE helmet to ensure headers are set correctly
function getCorsOrigin(): string | string[] | ((origin: string | undefined) => boolean) {
  // Helper function to check if origin is localhost or local network IP
  const isLocalOrigin = (origin: string): boolean => {
    // Allow localhost on any port
    if (origin.startsWith('http://localhost:')) return true;
    if (origin.startsWith('http://127.0.0.1:')) return true;
    
    // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (origin.match(/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/)) return true;
    if (origin.match(/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/)) return true;
    if (origin.match(/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:\d+$/)) return true;
    
    return false;
  };

  // If CORS_ORIGIN is explicitly set, use it but also allow local origins
  if (process.env.CORS_ORIGIN) {
    const origins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
    // Support wildcard patterns for ngrok domains (e.g., *.ngrok.io, *.ngrok-free.app)
    return (origin: string | undefined) => {
      if (!origin) return true; // Allow requests with no origin (like Postman)
      
      // Always allow localhost and local network IPs
      if (isLocalOrigin(origin)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ CORS: Allowing local origin: ${origin}`);
        }
        return true;
      }
      
      // Check exact matches first
      if (origins.includes(origin)) {
        return true;
      }
      
      // Check wildcard patterns
      for (const pattern of origins) {
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          if (regex.test(origin)) {
            return true;
          }
        }
      }
      
      // Always allow ngrok domains even when CORS_ORIGIN is set
      if (origin.match(/^https:\/\/[a-z0-9-]+\.ngrok\.(io|app)$/)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ CORS: Allowing ngrok origin: ${origin}`);
        }
        return true;
      }
      if (origin.match(/^https:\/\/[a-z0-9-]+\.ngrok-free\.(io|app)$/)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ CORS: Allowing ngrok-free origin: ${origin}`);
        }
        return true;
      }
      
      return false;
    };
  }
  
  // Default behavior: allow localhost, local network IPs, and ngrok domains
  // Always allow ngrok domains (commonly used for development/testing)
  return (origin: string | undefined) => {
    if (!origin) return true; // Allow requests with no origin (like Postman)
    
    // Allow localhost and local network IPs
    if (isLocalOrigin(origin)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ CORS: Allowing local origin: ${origin}`);
      }
      return true;
    }
    
    // Always allow ngrok domains (common patterns: *.ngrok.io, *.ngrok.app, *.ngrok-free.app, *.ngrok-free.io)
    // Match patterns like: https://vsol-admin.ngrok.app, https://abc123.ngrok.io, etc.
    if (origin.match(/^https:\/\/[a-z0-9-]+\.ngrok\.(io|app)$/)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ CORS: Allowing ngrok origin: ${origin}`);
      }
      return true;
    }
    if (origin.match(/^https:\/\/[a-z0-9-]+\.ngrok-free\.(io|app)$/)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ CORS: Allowing ngrok-free origin: ${origin}`);
      }
      return true;
    }
    
    // In development mode, allow all origins (for flexibility)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ CORS: Allowing origin in development mode: ${origin}`);
      return true;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`❌ CORS: Rejecting origin: ${origin}`);
    }
    return false;
  };
}

// CORS configuration with debug logging
const corsOriginFunction = getCorsOrigin();
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Log all CORS requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 CORS preflight check - Origin: ${origin || 'no origin'}`);
    }
    
    const originFunction = corsOriginFunction as (origin: string | undefined) => boolean;
    const isAllowed = originFunction(origin);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`   ${isAllowed ? '✅' : '❌'} CORS ${isAllowed ? 'ALLOWED' : 'BLOCKED'}: ${origin || 'no origin'}`);
    }
    
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests for all routes (backup for ngrok)
app.options('*', (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 OPTIONS request received: ${req.method} ${req.path} from origin: ${req.headers.origin || 'no origin'}`);
  }
  cors(corsOptions)(req, res, () => {
    res.status(204).end();
  });
});

// Security middleware - configured to work with CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/consultants', consultantRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/work-hours', workHoursRoutes);
app.use('/api/time-doctor', timeDoctorRoutes);
app.use('/api', bonusRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payoneer', payoneerRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Function to find an available port
async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const testServer = app.listen(startPort, () => {
      const port = (testServer.address() as any)?.port || startPort;
      testServer.close(() => resolve(port));
    });
    
    testServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        resolve(startPort);
      }
    });
  });
}

// Graceful shutdown function
function gracefulShutdown(signal: string) {
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    // In development, exit immediately to avoid Windows batch job prompt
    console.log(`\n🛑 Shutting down...`);
    if (server) {
      server.close(() => {
        process.exit(0);
      });
      // Force exit after 1 second if close takes too long
      setTimeout(() => process.exit(0), 1000);
    } else {
      process.exit(0);
    }
    return;
  }
  
  // Production graceful shutdown with timeout
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close((err) => {
      if (err) {
        console.error('❌ Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('✅ Server closed successfully');
      console.log('👋 Goodbye!');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.log('⚠️  Forcing shutdown after 10s...');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Start server with port conflict handling
async function startServer() {
  try {
    // Initialize database (sets encryption key if enabled)
    const { initializeDatabase } = await import('./db');
    await initializeDatabase();
    
    const availablePort = await findAvailablePort(Number(PORT));
    
    server = app.listen(availablePort, () => {
      console.log(`🚀 Server running on port ${availablePort}`);
      console.log(`📊 Health check: http://localhost:${availablePort}/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (availablePort !== Number(PORT)) {
        console.log(`⚠️  Note: Port ${PORT} was busy, using ${availablePort} instead`);
      }
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${availablePort} is already in use`);
        console.log('💡 Try running: pnpm kill-port to clean up stuck processes');
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1);
    });

    // Register shutdown handlers
    // Use immediate exit on Windows to avoid batch job prompt
    const isWindows = process.platform === 'win32';
    const isDev = process.env.NODE_ENV !== 'production';
    
    if (isWindows && isDev) {
      // On Windows in dev, exit immediately without waiting
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down...');
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down...');
        process.exit(0);
      });
    } else {
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    }
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
