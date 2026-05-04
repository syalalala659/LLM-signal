const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const logger = require('../utils/logger');

class TelegramNotifier {
  constructor() {
    this.token = config.telegram.botToken;
    this.chatId = config.telegram.chatId;
    this.bot = new TelegramBot(this.token, { polling: false });
  }

  /**
   * Send trading signal to Telegram
   * @param {string} symbol - Trading symbol
   * @param {Object} signal - Trading signal data
   * @param {Object} indicators - Technical indicators
   */
  async sendSignal(symbol, signal, indicators) {
    try {
      const message = this.formatSignalMessage(symbol, signal, indicators);
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      logger.info(`Signal sent to Telegram for ${symbol}`);
    } catch (error) {
      logger.error(`Error sending signal to Telegram:`, error.message);
    }
  }

  /**
   * Format signal message for Telegram
   * @param {string} symbol - Trading symbol
   * @param {Object} signal - Trading signal
   * @param {Object} indicators - Technical indicators
   * @returns {string} Formatted HTML message
   */
  formatSignalMessage(symbol, signal, indicators) {
    const { rsi, macd, bollingerBands, currentPrice } = indicators;
    const timestamp = new Date().toLocaleString();

    const signalEmoji = signal.signal === 'LONG' ? '🟢' : signal.signal === 'SHORT' ? '🔴' : '⚪';
    const confidenceColor = signal.confidence >= 70 ? '🟢' : signal.confidence >= 50 ? '🟡' : '🔴';

    return `
<b>${signalEmoji} ${signal.signal} SIGNAL - ${symbol}</b>
━━━━━━━━━━━━━━━━━━━━━━
<b>⏰ Time:</b> ${timestamp}

<b>💰 Price Action:</b>
• Current Price: <b>$${currentPrice}</b>
• Change: <b>${indicators.priceChange > 0 ? '+' : ''}${indicators.priceChange} (${indicators.priceChangePercent}%)</b>

<b>📊 Technical Indicators:</b>
• RSI(14): <b>${rsi.value}</b> (${rsi.status})
• MACD: <b>${macd.line}</b> | Signal: <b>${macd.signal}</b> | Histogram: <b>${macd.histogram}</b>
• Bollinger Bands: U:<b>${bollingerBands.upper}</b> M:<b>${bollingerBands.middle}</b> L:<b>${bollingerBands.lower}</b>
  Position: <b>${bollingerBands.position}</b>

<b>🎯 Trading Setup:</b>
• Entry: <b>$${signal.entry}</b>
• Take Profit 1: <b>$${signal.tp1}</b>
• Take Profit 2: <b>$${signal.tp2}</b>
• Stop Loss: <b>$${signal.sl}</b>

<b>📈 Analysis:</b>
• Confidence: ${confidenceColor} <b>${signal.confidence}%</b>
• Risk/Reward Ratio: <b>${signal.riskRewardRatio}:1</b>
• Note: ${signal.analysis}

<i>⚠️ Always do your own research. This is not financial advice.</i>
━━━━━━━━━━━━━━━━━━━━━━
    `;
  }

  /**
   * Send startup notification
   */
  async sendStartupMessage() {
    try {
      const symbols = config.crypto.symbols.join(', ');
      const message = `
<b>✅ AI Trading Signal Agent Started</b>

📍 Monitoring: ${symbols}
⏱️ Interval: ${config.app.intervalMinutes} minutes
🤖 Model: ${config.openrouter.model}

<i>Signals will be sent automatically...</i>
      `;
      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      logger.info('Startup message sent to Telegram');
    } catch (error) {
      logger.error('Error sending startup message:', error.message);
    }
  }

  /**
   * Send error notification
   * @param {string} title - Error title
   * @param {string} message - Error message
   */
  async sendError(title, message) {
    try {
      const errorMessage = `
<b>❌ ${title}</b>

<code>${message}</code>

<i>Check logs for more details.</i>
      `;
      await this.bot.sendMessage(this.chatId, errorMessage, { 
        parse_mode: 'HTML',
        disable_web_page_preview: true 
      });
      logger.error(`Error notification sent: ${title}`);
    } catch (error) {
      logger.error('Error sending error notification:', error.message);
    }
  }

  /**
   * Send market summary
   * @param {Array<Object>} signals - Array of signals for all symbols
   */
  async sendMarketSummary(signals) {
    try {
      const longCount = signals.filter(s => s.signal === 'LONG').length;
      const shortCount = signals.filter(s => s.signal === 'SHORT').length;
      const neutralCount = signals.filter(s => s.signal === 'NEUTRAL').length;
      const avgConfidence = (signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length).toFixed(2);

      const message = `
<b>📊 Market Summary</b>
━━━━━━━━━━━━━━━━━━━━━━
🟢 LONG Signals: <b>${longCount}</b>
🔴 SHORT Signals: <b>${shortCount}</b>
⚪ NEUTRAL Signals: <b>${neutralCount}</b>

📈 Average Confidence: <b>${avgConfidence}%</b>
⏰ Updated: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━
      `;
      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      logger.info('Market summary sent to Telegram');
    } catch (error) {
      logger.error('Error sending market summary:', error.message);
    }
  }
}

module.exports = new TelegramNotifier();
