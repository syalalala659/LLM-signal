const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class OpenRouterClient {
  constructor() {
    this.apiKey = config.openrouter.apiKey;
    this.baseUrl = config.openrouter.baseUrl;
    this.model = config.openrouter.model;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generate trading signal using LLM
   * @param {string} symbol - Trading symbol (e.g., BTC/USD)
   * @param {Object} indicators - Technical indicators analysis
   * @returns {Promise<Object>} Trading signal with entry, TP, SL
   */
  async generateTradingSignal(symbol, indicators) {
    try {
      const prompt = this.buildAnalysisPrompt(symbol, indicators);

      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert crypto trading analyst. Analyze the provided technical indicators and generate a trading signal with specific entry, take profit, and stop loss levels. Respond in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const analysisText = response.data.choices[0].message.content;
      const signal = this.parseSignalResponse(analysisText, symbol, indicators);

      logger.info(`Signal generated for ${symbol}:`, signal);
      return signal;
    } catch (error) {
      logger.error(`Error generating signal for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Build analysis prompt for LLM
   * @param {string} symbol - Trading symbol
   * @param {Object} indicators - Indicators analysis
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(symbol, indicators) {
    const { rsi, macd, bollingerBands, currentPrice, priceChange, priceChangePercent } = indicators;

    return `
Analyze the following technical indicators for ${symbol}:

Current Price: $${currentPrice}
Price Change: ${priceChange} (${priceChangePercent}%)

RSI (14): ${rsi.value} - Status: ${rsi.status}
MACD: Line=${macd.line}, Signal=${macd.signal}, Histogram=${macd.histogram} - Trend: ${macd.trend}
Bollinger Bands: Upper=${bollingerBands.upper}, Middle=${bollingerBands.middle}, Lower=${bollingerBands.lower} - Position: ${bollingerBands.position}

Based on this analysis, provide a trading signal in the following JSON format:
{
  "signal": "LONG" | "SHORT" | "NEUTRAL",
  "confidence": 0-100,
  "entry": number,
  "tp1": number,
  "tp2": number,
  "sl": number,
  "riskRewardRatio": number,
  "analysis": "brief explanation"
}

Only respond with valid JSON.`;
  }

  /**
   * Parse LLM response and extract signal
   * @param {string} response - LLM response text
   * @param {string} symbol - Trading symbol
   * @param {Object} indicators - Indicators for fallback
   * @returns {Object} Parsed signal
   */
  parseSignalResponse(response, symbol, indicators) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('No JSON found in response, using fallback signal');
        return this.generateFallbackSignal(symbol, indicators);
      }

      const signal = JSON.parse(jsonMatch[0]);

      // Validate signal fields
      if (!signal.signal || !['LONG', 'SHORT', 'NEUTRAL'].includes(signal.signal)) {
        signal.signal = 'NEUTRAL';
      }
      if (!signal.confidence || signal.confidence < 0 || signal.confidence > 100) {
        signal.confidence = 50;
      }
      if (!signal.entry) {
        signal.entry = indicators.currentPrice;
      }
      if (!signal.tp1 || !signal.tp2 || !signal.sl) {
        const fallback = this.generateFallbackSignal(symbol, indicators);
        signal.tp1 = signal.tp1 || fallback.tp1;
        signal.tp2 = signal.tp2 || fallback.tp2;
        signal.sl = signal.sl || fallback.sl;
      }

      return signal;
    } catch (error) {
      logger.error('Error parsing signal response:', error.message);
      return this.generateFallbackSignal(symbol, indicators);
    }
  }

  /**
   * Generate fallback signal based on indicators
   * @param {string} symbol - Trading symbol
   * @param {Object} indicators - Technical indicators
   * @returns {Object} Fallback signal
   */
  generateFallbackSignal(symbol, indicators) {
    const { rsi, macd, bollingerBands, currentPrice } = indicators;
    const config = require('../config');
    const rrRatio = config.risk.riskRewardRatio;

    let signal = 'NEUTRAL';
    let confidence = 50;

    // Simple logic: combine RSI, MACD, and BB
    let bullishCount = 0;
    let bearishCount = 0;

    // RSI analysis
    if (rsi.value < 30) {
      bullishCount++; // Oversold, potential bounce
    } else if (rsi.value > 70) {
      bearishCount++; // Overbought, potential pullback
    }

    // MACD analysis
    if (macd.histogram > 0 && macd.trend === 'BULLISH') {
      bullishCount++;
    } else if (macd.histogram < 0 && macd.trend === 'BEARISH') {
      bearishCount++;
    }

    // Bollinger Bands analysis
    if (currentPrice < bollingerBands.lower) {
      bullishCount++;
    } else if (currentPrice > bollingerBands.upper) {
      bearishCount++;
    }

    if (bullishCount > bearishCount) {
      signal = 'LONG';
      confidence = 50 + (bullishCount * 15);
    } else if (bearishCount > bullishCount) {
      signal = 'SHORT';
      confidence = 50 + (bearishCount * 15);
    }

    confidence = Math.min(confidence, 95);

    // Calculate TP and SL
    const volatility = (bollingerBands.upper - bollingerBands.lower) / bollingerBands.middle;
    const atr = volatility * currentPrice; // Approximate ATR

    let tp1, tp2, sl, entry;

    if (signal === 'LONG') {
      entry = currentPrice;
      sl = currentPrice - (atr * 0.5);
      tp1 = currentPrice + (atr * 0.5);
      tp2 = currentPrice + (atr * 1);
    } else if (signal === 'SHORT') {
      entry = currentPrice;
      sl = currentPrice + (atr * 0.5);
      tp1 = currentPrice - (atr * 0.5);
      tp2 = currentPrice - (atr * 1);
    } else {
      entry = currentPrice;
      sl = currentPrice * 0.95;
      tp1 = currentPrice * 1.02;
      tp2 = currentPrice * 1.05;
    }

    const riskAmount = Math.abs(entry - sl);
    const rewardAmount = Math.abs(tp2 - entry);
    const riskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : rrRatio;

    return {
      signal,
      confidence,
      entry: parseFloat(entry.toFixed(2)),
      tp1: parseFloat(tp1.toFixed(2)),
      tp2: parseFloat(tp2.toFixed(2)),
      sl: parseFloat(sl.toFixed(2)),
      riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
      analysis: `${signal} signal based on ${bullishCount > bearishCount ? 'bullish' : bullishCount < bearishCount ? 'bearish' : 'neutral'} indicators`
    };
  }
}

module.exports = new OpenRouterClient();
