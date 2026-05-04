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
    this.totalAnalyzed = 0;
    this.signalStats = {
      long: 0,
      short: 0,
      neutral: 0,
      avgConfidence: 0
    };
  }

  /**
   * Initialize symbols (load from config or CoinGecko top N)
   */
  async initializeSymbols() {
    try {
      if (config.app.useTopCoins === 'true' || config.app.useTopCoins === true) {
        logger.info(`🔄 Loading top ${config.app.topCoinsLimit} coins from CoinGecko...`);
        this.currentSymbols = await coingeckoClient.getTop100Symbols(config.app.topCoinsLimit);
      } else {
        this.currentSymbols = config.crypto.symbols;
        logger.info(`🎯 Using configured symbols: ${this.currentSymbols.join(', ')}`);
      }
      logger.info(`✅ Initialized ${this.currentSymbols.length} trading symbols`);
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
    logger.info('🚀 Trading Agent started');
    
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
      logger.info(`⏰ Interval-based analysis scheduled every ${config.app.intervalMinutes} minutes`);
    }
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
   * @param {Array<string>} overrideSymbols - Optional symbols to override config
   */
  async runAnalysis(overrideSymbols = null) {
    try {
      const symbols = overrideSymbols || this.currentSymbols || config.crypto.symbols;
      logger.info(`📊 Running market analysis for ${symbols.length} symbols...`);
      const signals = [];
      const errors = [];

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

      this.totalAnalyzed = signals.length;
      const successCount = signals.length;
      const failureCount = errors.length;

      logger.info(`✅ Analysis completed: ${successCount} successful, ${failureCount} failed`);

      // Calculate stats before filtering
      this.calculateStats(signals);

      // Filter top signals
      const topSignals = this.getTopSignals(signals, config.app.topSignalsToSend);
      logger.info(`🔝 Top ${topSignals.length} signals selected from ${signals.length} total signals`);

      // Send individual signals
      if (topSignals.length > 0) {
        for (const signal of topSignals) {
          // Find full signal data
          const fullSignal = signals.find(s => s.symbol === signal.symbol);
          if (fullSignal) {
            const priceData = await twelvedataClient.getPriceData(signal.symbol, 100);
            const indicators = TechnicalAnalysis.analyzeIndicators(priceData, config);
            await telegramNotifier.sendSignal(signal.symbol, fullSignal, indicators);
            logger.info(`📤 Sent signal to Telegram for ${signal.symbol}`);
            // Add delay between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Send market summary
      if (signals.length > 0) {
        await telegramNotifier.sendMarketSummary(signals, topSignals, this.signalStats);
      }

      if (errors.length > 0) {
        logger.warn(`⚠️ Errors during analysis:`, errors.slice(0, 5));
      }

      return { successCount, failureCount, topSignalsCount: topSignals.length, signals };
    } catch (error) {
      logger.error('Error in analysis loop:', error.message);
      await telegramNotifier.sendError('Analysis Loop Error', error.message);
      return { successCount: 0, failureCount: 1, topSignalsCount: 0, signals: [] };
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

      // Store signal
      this.lastSignals[symbol] = signal;
      signals.push({ symbol, indicators, ...signal });
    } catch (error) {
      logger.error(`Error analyzing ${symbol}:`, error.message);
      errors.push({ symbol, error: error.message });
    }
  }

  /**
   * Calculate signal statistics
   */
  calculateStats(signals) {
    this.signalStats = {
      long: signals.filter(s => s.signal === 'LONG').length,
      short: signals.filter(s => s.signal === 'SHORT').length,
      neutral: signals.filter(s => s.signal === 'NEUTRAL').length,
      avgConfidence: signals.length > 0 
        ? (signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length).toFixed(2)
        : 0
    };
  }

  /**
   * Get top N signals sorted by confidence
   */
  getTopSignals(signals, topN) {
    return signals
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, topN);
  }

  /**
   * Check if signal is different from last one (avoid spam)
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
      symbolsList: this.currentSymbols.slice(0, 10),
      lastSignalsCount: Object.keys(this.lastSignals).length,
      totalAnalyzed: this.totalAnalyzed,
      signalStats: this.signalStats,
      topSignalsToSend: config.app.topSignalsToSend,
      intervalMinutes: config.app.intervalMinutes,
      environment: config.app.nodeEnv,
      useTopCoins: config.app.useTopCoins
    };
  }
}

module.exports = new TradingAgent();
