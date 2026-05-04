const axios = require('axios');
const logger = require('../utils/logger');

class CoinGeckoClient {
  constructor() {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
  }

  /**
   * Get top 100 cryptocurrencies by market cap
   * @param {number} perPage - Results per page (max 250)
   * @returns {Promise<Array>} Array of top cryptocurrencies
   */
  async getTop100Tokens(perPage = 100) {
    try {
      const response = await this.client.get('/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: perPage,
          page: 1,
          sparkline: false
        }
      });

      return response.data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        marketCap: coin.market_cap,
        marketCapRank: coin.market_cap_rank,
        currentPrice: coin.current_price,
        priceChangePercent24h: coin.price_change_percentage_24h,
        totalVolume: coin.total_volume
      }));
    } catch (error) {
      logger.error('Error fetching top 100 tokens from CoinGecko:', error.message);
      throw error;
    }
  }

  /**
   * Convert coin list to trading symbols for TwelveData (top 100)
   * @param {number} limit - Number of top tokens (default 100)
   * @returns {Promise<Array>} Array of trading symbols (SYMBOL/USD)
   */
  async getTop100Symbols(limit = 100) {
    try {
      const tokens = await this.getTop100Tokens(limit);
      
      // Map to TwelveData format and filter common ones
      const symbols = tokens.map(token => `${token.symbol}/USD`);
      
      logger.info(`\ud83d\udd04 Loaded ${symbols.length} top tokens from CoinGecko`);
      logger.debug('Top tokens:', symbols.slice(0, 10));
      
      return symbols;
    } catch (error) {
      logger.error('Error converting tokens to symbols:', error.message);
      throw error;
    }
  }

  /**
   * Get detailed info for specific coins
   * @param {Array<string>} coinIds - Array of coin IDs
   * @returns {Promise<Array>} Detailed coin information
   */
  async getCoinDetails(coinIds) {
    try {
      const response = await this.client.get('/coins/markets', {
        params: {
          ids: coinIds.join(','),
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 250,
          sparkline: true,
          price_change_percentage: '24h'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching coin details:', error.message);
      throw error;
    }
  }
}

module.exports = new CoinGeckoClient();
