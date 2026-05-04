const config = require('./config');
const logger = require('./utils/logger');
const tradingAgent = require('./services/tradingAgent');

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', async () => {
  logger.info('\n📛 Received SIGINT signal. Shutting down gracefully...');
  await tradingAgent.stop();
  logger.info('✅ Application closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n📛 Received SIGTERM signal. Shutting down gracefully...');
  await tradingAgent.stop();
  logger.info('✅ Application closed');
  process.exit(0);
});

/**
 * Uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Main application entry point
 */
async function main() {
  try {
    logger.info('🚀 Starting LLM Signal Trading Agent...');
    logger.info(`Environment: ${config.app.nodeEnv}`);
    logger.info(`Log Level: ${config.app.logLevel}`);
    logger.info(`Monitored Symbols: ${config.crypto.symbols.join(', ')}`);
    logger.info(`Analysis Interval: ${config.app.intervalMinutes} minutes`);
    logger.info(`LLM Model: ${config.openrouter.model}`);

    // Start the trading agent
    await tradingAgent.start();

    logger.info('✅ Application started successfully');
    logger.info('Press Ctrl+C to stop the application');
  } catch (error) {
    logger.error('❌ Failed to start application:', error.message);
    process.exit(1);
  }
}

// Start the application
main();
