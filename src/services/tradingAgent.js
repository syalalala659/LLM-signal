const config = require('../config');
const logger = require('../utils/logger');
const twelvedataClient = require('../api/twelvedata');
const TechnicalAnalysis = require('../indicators/technicalAnalysis');
const openrouterClient = require('../llm/openrouter');
const telegramNotifier = require('./telegramNotifier');

class TradingAgent {
  constructor() {
    this.running = false;
    this.lastSignals = {};
  }

  /**
   * Start the trading agent
   */
  async start() {
    this.running = true;
    logger.info('🚀 Trading Agent started');
    await telegramNotifier.sendStartupMessage();

    // Initial run
    await this.runAnalysis();

    // Schedule periodic analysis
    const intervalMs = config.app.intervalMinutes * 60 * 1000;
    this.interval = setInterval(() => this.runAnalysis(), intervalMs);
  }

  /**
   * Stop the trading agent
   */
  async stop() {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    logger.info('🛑 Trading Agent stopped');
  }

  /**
   * Run the main analysis loop
   */
  async runAnalysis() {
    try {
      logger.info('📊 Running market analysis...');
      const signals = [];

      for (const symbol of config.crypto.symbols) {
        try {
          // Get price data
          const priceData = await twelvedataClient.getPriceData(symbol, 100);
          logger.debug(`Fetched ${priceData.length} candles for ${symbol}`);

          // Analyze indicators
          const indicators = TechnicalAnalysis.analyzeIndicators(priceData, config);
          logger.debug(`Indicators analyzed for ${symbol}:`, indicators);

          // Generate AI signal
          const signal = await openrouterClient.generateTradingSignal(symbol, indicators);
          logger.debug(`Signal generated for ${symbol}:`, signal);

          // Check if signal is different from last one (to avoid spam)
          const shouldNotify = this.shouldNotifySignal(symbol, signal);

          if (shouldNotify) {
            // Send to Telegram
            await telegramNotifier.sendSignal(symbol, signal, indicators);
            logger.info(`✅ Signal sent for ${symbol}: ${signal.signal}`);
          }

          // Store signal
          this.lastSignals[symbol] = signal;
          signals.push({ symbol, ...signal });
        } catch (error) {
          logger.error(`Error analyzing ${symbol}:`, error.message);
          await telegramNotifier.sendError(`Error analyzing ${symbol}`, error.message);
        }
      }

      // Send market summary periodically
      if (signals.length > 0 && signals.length === config.crypto.symbols.length) {
        await telegramNotifier.sendMarketSummary(signals);
      }
    } catch (error) {
      logger.error('Error in analysis loop:', error.message);
      await telegramNotifier.sendError('Analysis Loop Error', error.message);
    }
  }

  /**
   * Check if signal should be notified (avoid spam)
   * @param {string} symbol - Trading symbol
   * @param {Object} newSignal - New signal
   * @returns {boolean} Whether to notify
   */
  shouldNotifySignal(symbol, newSignal) {
    // Always notify if no previous signal
    if (!this.lastSignals[symbol]) {
      return true;
    }

    const lastSignal = this.lastSignals[symbol];

    // Notify if signal changed
    if (lastSignal.signal !== newSignal.signal) {
      return true;
    }

    // Notify if confidence increased significantly
    if (newSignal.confidence - lastSignal.confidence >= 15) {
      return true;
    }

    // Otherwise, don't spam
    return false;
  }

  /**
   * Get current status
   * @returns {Object} Agent status
   */
  getStatus() {
    return {
      running: this.running,
      lastSignals: this.lastSignals,
      monitoredSymbols: config.crypto.symbols,
      intervalMinutes: config.app.intervalMinutes,
      environment: config.app.nodeEnv
    };
  }
}

module.exports = new TradingAgent();
