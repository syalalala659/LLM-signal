const logger = require('../utils/logger');

class TechnicalAnalysis {
  /**
   * Calculate Relative Strength Index (RSI)
   * @param {Array<number>} closes - Array of closing prices
   * @param {number} period - RSI period (default 14)
   * @returns {number} RSI value
   */
  static calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) {
      throw new Error(`Not enough data for RSI calculation. Need ${period + 1}, got ${closes.length}`);
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial gains and losses
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI for remaining data
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }

    const rs = avgGain / avgLoss || 0;
    const rsi = 100 - (100 / (1 + rs));

    return parseFloat(rsi.toFixed(2));
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @param {Array<number>} closes - Array of closing prices
   * @param {number} fast - Fast EMA period (default 12)
   * @param {number} slow - Slow EMA period (default 26)
   * @param {number} signal - Signal line period (default 9)
   * @returns {Object} MACD line, signal line, and histogram
   */
  static calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
    if (closes.length < slow + signal - 1) {
      throw new Error('Not enough data for MACD calculation');
    }

    const fastEMA = this.calculateEMA(closes, fast);
    const slowEMA = this.calculateEMA(closes, slow);
    const macdLine = fastEMA.map((val, i) => val - slowEMA[i]);
    const signalLine = this.calculateEMA(macdLine, signal);
    const histogram = macdLine.map((val, i) => val - (signalLine[i] || 0));

    return {
      macdLine: parseFloat(macdLine[macdLine.length - 1].toFixed(4)),
      signalLine: parseFloat(signalLine[signalLine.length - 1].toFixed(4)),
      histogram: parseFloat(histogram[histogram.length - 1].toFixed(4))
    };
  }

  /**
   * Calculate Bollinger Bands
   * @param {Array<number>} closes - Array of closing prices
   * @param {number} period - SMA period (default 20)
   * @param {number} stdDev - Standard deviation multiplier (default 2)
   * @returns {Object} Upper, middle, and lower bands
   */
  static calculateBollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length < period) {
      throw new Error('Not enough data for Bollinger Bands calculation');
    }

    const recentCloses = closes.slice(-period);
    const sma = recentCloses.reduce((a, b) => a + b, 0) / period;

    const variance = recentCloses.reduce((sum, close) => {
      return sum + Math.pow(close - sma, 2);
    }, 0) / period;

    const standardDeviation = Math.sqrt(variance);

    return {
      upper: parseFloat((sma + stdDev * standardDeviation).toFixed(2)),
      middle: parseFloat(sma.toFixed(2)),
      lower: parseFloat((sma - stdDev * standardDeviation).toFixed(2))
    };
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * @param {Array<number>} data - Array of prices
   * @param {number} period - EMA period
   * @returns {Array<number>} Array of EMA values
   */
  static calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = data[0];
    const emaValues = [ema];

    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
      emaValues.push(ema);
    }

    return emaValues;
  }

  /**
   * Analyze all indicators for a symbol
   * @param {Array<Object>} priceData - Array of OHLCV data
   * @param {Object} config - Configuration for indicators
   * @returns {Object} Comprehensive indicator analysis
   */
  static analyzeIndicators(priceData, config) {
    try {
      const closes = priceData.map(p => p.close);

      const rsi = this.calculateRSI(closes, config.indicators.rsi.period);
      const macd = this.calculateMACD(
        closes,
        config.indicators.macd.fast,
        config.indicators.macd.slow,
        config.indicators.macd.signal
      );
      const bb = this.calculateBollingerBands(
        closes,
        config.indicators.bollingerBands.period,
        config.indicators.bollingerBands.stdDev
      );

      const currentPrice = closes[closes.length - 1];
      const previousPrice = closes[closes.length - 2];

      return {
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        priceChange: parseFloat((currentPrice - previousPrice).toFixed(2)),
        priceChangePercent: parseFloat(((currentPrice - previousPrice) / previousPrice * 100).toFixed(2)),
        rsi: {
          value: rsi,
          status: rsi > config.indicators.rsi.overbought ? 'OVERBOUGHT' : 
                  rsi < config.indicators.rsi.oversold ? 'OVERSOLD' : 'NEUTRAL'
        },
        macd: {
          line: macd.macdLine,
          signal: macd.signalLine,
          histogram: macd.histogram,
          trend: macd.histogram > 0 ? 'BULLISH' : 'BEARISH'
        },
        bollingerBands: {
          upper: bb.upper,
          middle: bb.middle,
          lower: bb.lower,
          position: currentPrice > bb.upper ? 'ABOVE_UPPER' :
                    currentPrice < bb.lower ? 'BELOW_LOWER' : 'WITHIN_BANDS'
        }
      };
    } catch (error) {
      logger.error('Error analyzing indicators:', error.message);
      throw error;
    }
  }
}

module.exports = TechnicalAnalysis;
