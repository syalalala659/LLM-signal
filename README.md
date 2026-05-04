# LLM Signal - AI Crypto Trading Signal Agent 🚀

Automated cryptocurrency trading signal generator using AI (LLM), technical indicators, and market data API.

## 🎯 Features

✅ **Real-time Market Data**
- Live price tracking for BTC, ETH, SOL
- Data from TwelveData API (800 calls/day free)

✅ **Technical Indicators**
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands

✅ **AI-Powered Signal Generation**
- OpenRouter LLM integration (Meta Llama 2 70B)
- Intelligent analysis of multiple indicators
- Confidence scoring

✅ **Trading Signals**
- LONG / SHORT / NEUTRAL signals
- Entry points with TP1, TP2, and Stop Loss
- Risk/Reward ratio calculation

✅ **Telegram Integration**
- Real-time signal notifications
- Market summary reports
- Error alerts

✅ **Production Ready**
- Graceful error handling
- Professional logging (Winston)
- VPS deployment ready
- PM2 compatible

## 📋 Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0
- API Keys:
  - **TwelveData**: https://twelvedata.com (free tier available)
  - **OpenRouter**: https://openrouter.ai (free tier or paid)
  - **Telegram**: Create bot via @BotFather on Telegram

## 🚀 Installation

### 1. Clone Repository
```bash
git clone https://github.com/syalalala659/LLM-signal.git
cd LLM-signal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
# Copy example config
cp .env.example .env

# Edit .env with your API keys
vim .env
```

### 4. Configuration

Edit `.env` file with your credentials:

```env
# TwelveData API (Get from https://twelvedata.com)
TWELVEDATA_API_KEY=your_key_here

# OpenRouter API (Get from https://openrouter.ai)
OPENROUTER_API_KEY=your_key_here
LLM_MODEL=openrouter/meta-llama/llama-2-70b-chat

# Telegram Bot (Create via @BotFather)
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
TELEGRAM_CHAT_ID=123456789

# Application Settings
INTERVAL_MINUTES=5
LOG_LEVEL=info
NODE_ENV=production
```

## 🏃 Running the Application

### Local Development
```bash
npm start
```

### With Auto-Restart (Development)
```bash
npm run dev
```

### Production with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/index.js --name "crypto-agent"

# View logs
pm2 logs crypto-agent

# Make it auto-restart on system reboot
pm2 startup
pm2 save
```

## 📊 How It Works

### Analysis Flow

1. **Fetch Market Data**: Get last 100 candles from TwelveData API
2. **Calculate Indicators**: 
   - RSI (14-period)
   - MACD (12,26,9)
   - Bollinger Bands (20-period, 2 std dev)
3. **AI Analysis**: Send indicators to OpenRouter LLM
4. **Generate Signal**: LLM returns structured trading signal
5. **Send Notification**: Forward signal to Telegram
6. **Log Results**: Store all data for monitoring

### Signal Structure

```json
{
  "signal": "LONG",
  "confidence": 75,
  "entry": 45250.50,
  "tp1": 45500.00,
  "tp2": 45750.00,
  "sl": 45000.00,
  "riskRewardRatio": 2.5,
  "analysis": "Bullish divergence on MACD with RSI oversold"
}
```

## 📁 Project Structure

```
LLM-signal/
├── src/
│   ├── config/
│   │   └── index.js           # Configuration loader
│   ├── api/
│   │   └── twelvedata.js      # TwelveData API client
│   ├── indicators/
│   │   └── technicalAnalysis.js # Indicator calculations
│   ├── llm/
│   │   └── openrouter.js      # OpenRouter LLM integration
│   ├── services/
│   │   ├── tradingAgent.js    # Main orchestrator
│   │   └── telegramNotifier.js # Telegram notifications
│   ├── utils/
│   │   └── logger.js          # Winston logger
│   └── index.js               # Entry point
├── logs/                       # Log files (created at runtime)
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies
└── README.md                  # This file
```

## 🔧 Configuration Options

### Technical Indicators

```env
# RSI Configuration
RSI_PERIOD=14
RSI_OVERBOUGHT=70
RSI_OVERSOLD=30

# MACD Configuration
MACD_FAST=12
MACD_SLOW=26
MACD_SIGNAL=9

# Bollinger Bands Configuration
BB_PERIOD=20
BB_STD_DEV=2
```

### Risk Management

```env
# Risk/Reward Ratio for signal calculation
RISK_REWARD_RATIO=2

# Position size as percentage
POS_SIZE_PERCENT=1
```

## 📱 Telegram Setup

### Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/start` and follow instructions
3. Send `/newbot` to create new bot
4. Get your bot token
5. Send `/mybots` to select your bot, then `/setcommands`

### Get Your Chat ID

1. Add bot to a chat group or direct message
2. Send any message
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for `"chat": {"id": YOUR_CHAT_ID}`

## 📝 Logging

Logs are stored in `logs/` directory:

- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output - Real-time logs

Adjust log level in `.env`:
```env
LOG_LEVEL=debug    # Verbose logging
LOG_LEVEL=info     # Normal logging
LOG_LEVEL=warn     # Warning and errors only
LOG_LEVEL=error    # Errors only
```

## 🐛 Troubleshooting

### Issue: "Missing required environment variables"
**Solution**: Make sure `.env` file exists and has all required keys
```bash
cp .env.example .env
# Edit .env with your credentials
```

### Issue: "TwelveData API Error - 401 Unauthorized"
**Solution**: Check your `TWELVEDATA_API_KEY` in `.env`
```bash
# Verify your API key at https://twelvedata.com
```

### Issue: "Telegram: 401 Unauthorized"
**Solution**: Verify bot token and chat ID
```bash
# Test bot token:
curl https://api.telegram.org/bot<TOKEN>/getMe
```

### Issue: "OpenRouter: 429 Too Many Requests"
**Solution**: 
- Increase `INTERVAL_MINUTES` in `.env`
- Or upgrade OpenRouter account

### Issue: "Not enough data for RSI calculation"
**Solution**: Normally auto-resolved after first run. Reduce `RSI_PERIOD` if persists.

## 🚀 VPS Deployment

### AWS EC2 / DigitalOcean / Linode Setup

```bash
# 1. SSH into VPS
ssh root@your_vps_ip

# 2. Update system
sudo apt update && sudo apt upgrade -y

# 3. Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Install Git
sudo apt install -y git

# 5. Clone repository
git clone https://github.com/syalalala659/LLM-signal.git
cd LLM-signal

# 6. Install dependencies
npm install

# 7. Setup environment
cp .env.example .env
vim .env  # Edit with your credentials

# 8. Install PM2 globally
sudo npm install -g pm2

# 9. Start application
pm2 start src/index.js --name "crypto-agent"
pm2 startup
pm2 save

# 10. View logs
pm2 logs crypto-agent
```

## 📊 Monitoring

### Check Status
```bash
pm2 status
pm2 logs crypto-agent
pm2 plus  # Real-time monitoring dashboard
```

### Restart Application
```bash
pm2 restart crypto-agent
```

### Stop Application
```bash
pm2 stop crypto-agent
```

## 💰 API Costs

### TwelveData
- Free tier: 800 API calls/day
- Our usage: ~30 calls/day (3 symbols × 10 calls)
- ✅ Free tier is sufficient

### OpenRouter
- Pay-per-use model
- ~$0.01-0.05 per analysis
- With 5-minute intervals: ~$2-5 per month

### Telegram
- ✅ Free (bot API)

## 🔒 Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Use environment variables in production

2. **Rotate API keys regularly**
   - Store in secure vaults
   - Don't share keys

3. **Use restricted API permissions**
   - TwelveData: Read-only access
   - OpenRouter: Limited rate limits

4. **Monitor logs for suspicious activity**
   - Check `logs/error.log`
   - Set up alerts

## 📈 Performance Tips

1. **Increase interval for lower cost**
   ```env
   INTERVAL_MINUTES=15  # Instead of 5
   ```

2. **Monitor API rate limits**
   - Check dashboard at TwelveData
   - Adjust interval if approaching limits

3. **Use cheaper LLM model**
   ```env
   LLM_MODEL=openrouter/mistral/mistral-7b-instruct
   ```

4. **Enable production logging**
   ```env
   LOG_LEVEL=warn
   ```

## 🤝 Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

**This is for educational purposes only.**

- Not financial advice
- Signals are algorithmic, not guaranteed
- Always do your own research
- Trading crypto involves risk
- Start with small position sizes
- Never invest money you can't afford to lose

## 🆘 Support

If you have issues:

1. Check [Troubleshooting](#-troubleshooting) section
2. Review logs: `pm2 logs crypto-agent`
3. Check `.env` configuration
4. Open GitHub issue with:
   - Error message
   - `node --version`
   - Steps to reproduce

## 🎉 Features Coming Soon

- [ ] Multiple trading pairs
- [ ] Backtesting module
- [ ] Strategy optimization
- [ ] Web dashboard
- [ ] WebSocket for real-time updates
- [ ] Position tracking
- [ ] Performance metrics
- [ ] Email notifications
- [ ] Discord integration
- [ ] Database persistence

---

**Made with ❤️ for crypto traders**

Give it a ⭐ if you find it useful!
