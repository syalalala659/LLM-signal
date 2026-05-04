const config = require('./config');
const logger = require('./utils/logger');
const tradingAgent = require('./services/tradingAgent');
const scheduler = require('./services/scheduler');

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', async () => {
  logger.info('\n\ud83d\udcdb Received SIGINT signal. Shutting down gracefully...');
  scheduler.stopSchedule();
  await tradingAgent.stop();
  logger.info('\u2705 Application closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n\ud83d\udcdb Received SIGTERM signal. Shutting down gracefully...');
  scheduler.stopSchedule();
  await tradingAgent.stop();
  logger.info('\u2705 Application closed');
  process.exit(0);
});

/**
 * Uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  logger.error('\u274c Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('\u274c Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Main application entry point
 */
async function main() {
  try {
    logger.info('\ud83d\ude80 Starting LLM Signal Trading Agent...');
    logger.info(`Environment: ${config.app.nodeEnv}`);
    logger.info(`Log Level: ${config.app.logLevel}`);
    logger.info(`LLM Model: ${config.openrouter.model}`);

    const scheduleMode = config.app.scheduleEnabled === 'true' || config.app.scheduleEnabled === true;
    
    if (scheduleMode) {
      logger.info('\ud83d\udcca Mode: SCHEDULED (2x daily at specified hours)');
      const scheduleHours = (process.env.SCHEDULE_HOURS || '7,19').split(',').map(h => parseInt(h.trim()));
      logger.info(`Schedule Hours: ${scheduleHours.map(h => `${h.toString().padStart(2, '0')}:00`).join(', ')}`);
    } else {
      logger.info('\ud83d\udcca Mode: INTERVAL-BASED (continuous)');
      logger.info(`Analysis Interval: ${config.app.intervalMinutes} minutes`);
    }

    const useTop100 = config.app.useTop100 === 'true' || config.app.useTop100 === true;
    if (useTop100) {
      logger.info('\ud83d\udd04 Using: Top 100 tokens from CoinGecko');
    } else {
      logger.info(`\ud83d\udd04 Using: Configured symbols (${config.crypto.symbols.length} tokens)`);
    }

    // Initialize scheduler if enabled
    if (scheduleMode) {
      scheduler.initializeSchedule();
    }

    // Start the trading agent
    await tradingAgent.start();

    logger.info('\u2705 Application started successfully');
    logger.info('Press Ctrl+C to stop the application');
  } catch (error) {
    logger.error('\u274c Failed to start application:', error.message);
    process.exit(1);
  }
}

// Start the application
main();
