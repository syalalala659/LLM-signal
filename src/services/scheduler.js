const cron = require('node-cron');
const logger = require('../utils/logger');
const config = require('../config');
const tradingAgent = require('./tradingAgent');
const telegramNotifier = require('./telegramNotifier');

class ScheduleManager {
  constructor() {
    this.jobs = [];
    this.enabled = config.app.scheduleEnabled === 'true' || config.app.scheduleEnabled === true;
    this.scheduleHours = (process.env.SCHEDULE_HOURS || '7,19').split(',').map(h => parseInt(h.trim()));
  }

  /**
   * Initialize scheduled jobs
   */
  initializeSchedule() {
    if (!this.enabled) {
      logger.info('⏰ Schedule mode is DISABLED - using continuous interval mode');
      return;
    }

    logger.info(`⏰ Schedule mode is ENABLED - signals will run at: ${this.scheduleHours.map(h => `${h.toString().padStart(2, '0')}:00`).join(', ')}`);

    this.scheduleHours.forEach(hour => {
      // Create cron pattern for specific hour (minute 0, every hour specified)
      const cronPattern = `0 ${hour} * * *`; // At 00 minutes of specified hour, every day
      
      const job = cron.schedule(cronPattern, async () => {
        logger.info(`\ud83d\udd� Scheduled analysis triggered at ${hour}:00`);
        await this.executeScheduledAnalysis();
      });

      this.jobs.push({ hour, job });
      logger.info(`✅ Scheduled job created for ${hour}:00 daily`);
    });
  }

  /**
   * Execute scheduled analysis
   */
  async executeScheduledAnalysis() {
    try {
      logger.info('\ud83d\udd50 Starting scheduled trading analysis...');
      await tradingAgent.runAnalysis();
      logger.info('\u2705 Scheduled analysis completed');
    } catch (error) {
      logger.error('Error in scheduled analysis:', error.message);
      await telegramNotifier.sendError('Scheduled Analysis Error', error.message);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopSchedule() {
    this.jobs.forEach(({ hour, job }) => {
      job.stop();
      logger.info(`Stopped schedule for ${hour}:00`);
    });
    this.jobs = [];
  }

  /**
   * Get schedule status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      scheduleHours: this.scheduleHours,
      activeJobs: this.jobs.length
    };
  }
}

module.exports = new ScheduleManager();
