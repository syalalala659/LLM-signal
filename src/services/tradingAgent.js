const config = require('../config');
const logger = require('../utils/logger');
const twelvedataClient = require('../api/twelvedata');
const coingeckoClient = require('../api/coingecko');
const TechnicalAnalysis = require('../indicators/technicalAnalysis');
const openrouterClient = require('../llm/openrouter');
const telegramNotifier = require('./telegramNotifier');

class TradingAgent {
  constructor() {
    this.running = false;
    this.lastSignals = {};
    this.interval = null;
    this.currentSymbols = [];
  }

  /**
   * Initialize symbols (load from config or CoinGecko top 100)
   */
  async initializeSymbols() {
    try {
      if (config.app.useTop100 === 'true' || config.app.useTop100 === true) {
        logger.info('\ud83d\udd04 Loading top 100 tokens from CoinGecko...');
        this.currentSymbols = await coingeckoClient.getTop100Symbols(100);
      } else {
        this.currentSymbols = config.crypto.symbols;
        logger.info(`\ud83d\udcab Using configured symbols: ${this.currentSymbols.join(', ')}`);
      }
      logger.info(`\u2705 Initialized ${this.currentSymbols.length} trading symbols`);
    } catch (error) {
      logger.error('Error initializing symbols:', error.message);
      // Fallback to configured symbols
      this.currentSymbols = config.crypto.symbols;
      logger.warn('Fallback to configured symbols due to error');
    }
  }

  /**
   * Start the trading agent (for interval-based mode)
   */
  async start() {
    this.running = true;
    logger.info('\ud83d\ude80 Trading Agent started');
    
    // Initialize symbols
    await this.initializeSymbols();
    
    await telegramNotifier.sendStartupMessage(this.currentSymbols.length);

    // Only run initial analysis and set interval if NOT using schedule mode
    if (config.app.scheduleEnabled !== 'true' && config.app.scheduleEnabled !== true) {
      // Initial run
      await this.runAnalysis();

      // Schedule periodic analysis (for interval mode)
      const intervalMs = config.app.intervalMinutes * 60 * 1000;
      this.interval = setInterval(() => this.runAnalysis(), intervalMs);
      logger.info(`\u23f0 Interval-based analysis scheduled every ${config.app.intervalMinutes} minutes`);
    }
  }

  /**
   * Stop the trading agent
   */
  async stop() {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    logger.info('\ud83d\uded1 Trading Agent stopped');
  }

  /**
   * Run the main analysis loop
   * @param {Array<string>} overrideSymbols - Optional symbols to override config
   */
  async runAnalysis(overrideSymbols = null) {
    try {
      const symbols = overrideSymbols || this.currentSymbols || config.crypto.symbols;
      logger.info(`\ud83d\udcca Running market analysis for ${symbols.length} symbols...`);
      const signals = [];
      const errors = [];
      let successCount = 0;

      // Analyze in batches to avoid API rate limits
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        // Process batch in parallel
        await Promise.all(batch.map(symbol => this.analyzeSymbol(symbol, signals, errors)));
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      successCount = signals.length;
      const failureCount = errors.length;

      logger.info(`\u2705 Analysis completed: ${successCount} successful, ${failureCount} failed`);

      // Send market summary
      if (signals.length > 0) {
        await telegramNotifier.sendMarketSummary(signals);
      }

      if (errors.length > 0) {
        logger.warn(`⚠️ Errors during analysis:`, errors.slice(0, 5));
      }

      return { successCount, failureCount, signals };
    } catch (error) {
      logger.error('Error in analysis loop:', error.message);
      await telegramNotifier.sendError('Analysis Loop Error', error.message);
      return { successCount: 0, failureCount: 1, signals: [] };
    }
  }

  /**
   * Analyze a single symbol
   */
  async analyzeSymbol(symbol, signals, errors) {
    try {
      // Get price data
      const priceData = await twelvedataClient.getPriceData(symbol, 100);
      logger.debug(`Fetched ${priceData.length} candles for ${symbol}`);

      // Analyze indicators
      const indicators = TechnicalAnalysis.analyzeIndicators(priceData, config);
      logger.debug(`Indicators analyzed for ${symbol}`);

      // Generate AI signal
      const signal = await openrouterClient.generateTradingSignal(symbol, indicators);
      logger.debug(`Signal generated for ${symbol}: ${signal.signal}`);

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
      errors.push({ symbol, error: error.message });
      // Don't send individual error for each symbol in batch mode
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
      monitoredSymbols: this.currentSymbols.length,
      symbolsList: this.currentSymbols.slice(0, 10), // Show first 10
      lastSignalsCount: Object.keys(this.lastSignals).length,
      intervalMinutes: config.app.intervalMinutes,
      environment: config.app.nodeEnv,
      useTop100: config.app.useTop100
    };
  }
}

module.exports = new TradingAgent();
