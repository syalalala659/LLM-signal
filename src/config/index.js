const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const config = {
  // API Keys
  twelvedata: {
    apiKey: process.env.TWELVEDATA_API_KEY,
    baseUrl: 'https://api.twelvedata.com'
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: 'https://openrouter.ai/api/v1',
    model: process.env.LLM_MODEL || 'openrouter/meta-llama/llama-2-70b-chat'
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
  },

  // Application Settings
  app: {
    intervalMinutes: parseInt(process.env.INTERVAL_MINUTES || '5'),
    logLevel: process.env.LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV || 'development',
    scheduleEnabled: process.env.SCHEDULE_MODE === 'true' || process.env.SCHEDULE_MODE === true,
    useTopCoins: process.env.USE_TOP_COINS === 'true' || process.env.USE_TOP_COINS === true,
    topCoinsLimit: parseInt(process.env.TOP_COINS_LIMIT || '50'),
    topSignalsToSend: parseInt(process.env.TOP_SIGNALS_TO_SEND || '5')
  },

  // Crypto Settings
  crypto: {
    symbols: (process.env.CRYPTO_SYMBOLS || 'BTC/USD,ETH/USD,SOL/USD').split(',').map(s => s.trim()),
  },

  // Technical Indicators
  indicators: {
    rsi: {
      period: parseInt(process.env.RSI_PERIOD || '14'),
      overbought: parseInt(process.env.RSI_OVERBOUGHT || '70'),
      oversold: parseInt(process.env.RSI_OVERSOLD || '30')
    },
    macd: {
      fast: parseInt(process.env.MACD_FAST || '12'),
      slow: parseInt(process.env.MACD_SLOW || '26'),
      signal: parseInt(process.env.MACD_SIGNAL || '9')
    },
    bollingerBands: {
      period: parseInt(process.env.BB_PERIOD || '20'),
      stdDev: parseInt(process.env.BB_STD_DEV || '2')
    }
  },

  // Risk Management
  risk: {
    riskRewardRatio: parseFloat(process.env.RISK_REWARD_RATIO || '2'),
    positionSizePercent: parseFloat(process.env.POS_SIZE_PERCENT || '1')
  }
};

// Validate required environment variables
const requiredVars = [
  'TWELVEDATA_API_KEY',
  'OPENROUTER_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please copy .env.example to .env and fill in the required values.');
  process.exit(1);
}

module.exports = config;
