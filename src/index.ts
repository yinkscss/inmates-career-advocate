/**
 * Inmates Career Advocate - Entry Point
 * 
 * Standalone API service for conversational job discovery
 */

import { config } from 'dotenv';
import { startServer } from './server/server.js';

// Load environment variables
config();

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
