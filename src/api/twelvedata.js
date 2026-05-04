const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class TwelveDataClient {
  constructor() {
    this.apiKey = config.twelvedata.apiKey;
    this.baseUrl = config.twelvedata.baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
  }

  /**
   * Get latest price for a symbol
   * @param {string} symbol - Symbol (e.g., 'BTC/USD')
   * @param {number} limit - Number of candles to fetch
   * @returns {Promise<Array>} Array of price data
   */
  async getPriceData(symbol, limit = 100) {
    try {
      const [base, quote] = symbol.split('/');
      const apiSymbol = `${base}${quote}`; // Convert BTC/USD to BTCUSD

      const response = await this.client.get('/time_series', {
        params: {
          symbol: apiSymbol,
          interval: '5min',
          outputsize: limit,
          apikey: this.apiKey
        }
      });

      if (response.data.status !== 'ok') {
        throw new Error(response.data.message || 'API Error');
      }

      return response.data.values.map(v => ({
        timestamp: v.datetime,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseFloat(v.volume || 0)
      }));
    } catch (error) {
      logger.error(`Error fetching price data for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get latest quote for a symbol
   * @param {string} symbol - Symbol (e.g., 'BTC/USD')
   * @returns {Promise<Object>} Quote data
   */
  async getQuote(symbol) {
    try {
      const [base, quote] = symbol.split('/');
      const apiSymbol = `${base}${quote}`;

      const response = await this.client.get('/quote', {
        params: {
          symbol: apiSymbol,
          apikey: this.apiKey
        }
      });

      if (response.data.status !== 'ok') {
        throw new Error(response.data.message || 'API Error');
      }

      const data = response.data.data;
      return {
        symbol: symbol,
        price: parseFloat(data.last_price),
        bid: parseFloat(data.bid),
        ask: parseFloat(data.ask),
        timestamp: data.timestamp,
        change: parseFloat(data.change),
        changePercent: parseFloat(data.change_percent)
      };
    } catch (error) {
      logger.error(`Error fetching quote for ${symbol}:`, error.message);
      throw error;
    }
  }
}

module.exports = new TwelveDataClient();
