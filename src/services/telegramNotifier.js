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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
  }

  /**
   * Send startup notification
   * @param {number} symbolCount - Number of symbols being monitored
   */
  async sendStartupMessage(symbolCount = 100) {
    try {
      const scheduleMode = process.env.SCHEDULE_MODE === 'true';
      const scheduleHours = process.env.SCHEDULE_HOURS || '7,19';
      const useTopCoins = process.env.USE_TOP_COINS === 'true';
      const topSignalsToSend = process.env.TOP_SIGNALS_TO_SEND || '5';
      
      let modeInfo = '';
      if (scheduleMode) {
        const hours = scheduleHours.split(',').map(h => `${h.trim()}:00`).join(', ');
        modeInfo = `\n⏰ Mode: Scheduled (2x daily at ${hours})`;
      } else {
        const interval = process.env.INTERVAL_MINUTES || 5;
        modeInfo = `\n⏰ Mode: Continuous (every ${interval} minutes)`;
      }
      
      const tokenInfo = useTopCoins 
        ? `\n🎯 Analyzing: Top ${symbolCount} coins (CoinGecko)` 
        : `\n🎯 Analyzing: ${symbolCount} configured tokens`;
      
      const message = `
<b>✅ AI Trading Signal Agent Started</b>

📊 Monitoring: ${symbolCount} tokens${tokenInfo}${modeInfo}
🔝 Best Signals: Top ${topSignalsToSend} only
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
   * @param {Array<Object>} allSignals - All signals from analysis
   * @param {Array<Object>} topSignals - Top N signals that were sent
   * @param {Object} stats - Signal statistics
   */
  async sendMarketSummary(allSignals, topSignals, stats) {
    try {
      // Format top signals list
      const topSignalsList = topSignals
        .slice(0, 5)
        .map((s, idx) => `${idx + 1}. ${s.signal === 'LONG' ? '🟢' : s.signal === 'SHORT' ? '🔴' : '⚪'} ${s.symbol}: <b>${s.signal}</b> (${s.confidence}%)`)
        .join('\n');

      const message = `
<b>📊 Market Analysis Summary</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Signal Distribution (from ${allSignals.length} analyzed):
🟢 LONG Signals: <b>${stats.long}</b>
🔴 SHORT Signals: <b>${stats.short}</b>
⚪ NEUTRAL Signals: <b>${stats.neutral}</b>

📋 Analysis Stats:
• Total Analyzed: ${allSignals.length} coins
• Avg Confidence: <b>${stats.avgConfidence}%</b>
• Signals Sent: <b>${topSignals.length}</b> (top performers)

🏆 Top Signals Sent:
${topSignalsList}

⏰ Updated: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `;
      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      logger.info('Market summary sent to Telegram');
    } catch (error) {
      logger.error('Error sending market summary:', error.message);
    }
  }
}

module.exports = new TelegramNotifier();
