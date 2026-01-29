// config.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bot configuration
export const CONFIG = {
  // Core settings
  BOT_TOKEN: process.env.BOT_TOKEN || process.env.DISCORD_TOKEN,
  OWNER_ID: process.env.OWNER_ID || '659745190382141453',
  SERVER_IDS: process.env.SERVER_IDS ? process.env.SERVER_IDS.split(',') : [],
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || null,
  TIP_BOT_ID: '617037497574359050', // tip.cc bot ID
  BOT_VERSION: '2.1.0',
  DATA_DIR: path.join(__dirname, 'data'),
  
  // Default settings
  DEFAULT_ACCEPTED_CRYPTOCURRENCIES: [
    'AEGS', 'LTC', 'SOL', 'USDT', 'BTC', 'XRP', 'DOGE', 'SHIB', 'SHIC',
    'BNB', 'USDC', 'ETH', 'XLA', 'ADA', 'AVAX', 'TON', 'TRON', 'PEP', 'BONC'
  ],
  
  // Donor role configuration
  DONOR_ROLES: {
    onyx_donor: { minAmount: 500, id: '1357183499185950882', name: 'Onyx Donor' },
    diamond_donor: { minAmount: 251, maxAmount: 500, id: '1341176124020883496', name: 'Diamond Donor' },
    platinum_donor: { minAmount: 101, maxAmount: 250, id: '1341175847280971907', name: 'Platinum Donor' },
    gold_donor: { minAmount: 51, maxAmount: 100, id: '1341175703659348059', name: 'Gold Donor' },
    silver_donor: { minAmount: 26, maxAmount: 50, id: '1341175633866391684', name: 'Silver Donor' },
    bronze_donor: { minAmount: 5, maxAmount: 25, id: '1341175531932221471', name: 'Bronze Donor' }
  },
  
  // Draw categories
  DRAW_CATEGORIES: {
    monthly: 'Monthly Draws',
    special: 'Special Events',
    community: 'Community Goals',
    milestone: 'Milestone Rewards',
    seasonal: 'Seasonal Events',
    vip: 'VIP Exclusive',
    daily: 'Daily Draws',
    weekly: 'Weekly Draws'
  },
  
  // Command cooldowns (in seconds)
  COOLDOWNS: {
    default: 3,
    leaderboard: 10,
    draw: 5,
    admin: 2
  },
  
  // Pagination settings
  PAGINATION: {
    itemsPerPage: 10,
    timeout: 60000 // 1 minute
  }
};

// Export default achievement definitions
export const ACHIEVEMENTS = {
  first_steps: {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Made your first donation',
    icon: '🌱',
    requirement: (userData) => userData.totalDonated >= 0.01
  },
  generous_donor: {
    id: 'generous_donor',
    name: 'Generous Donor',
    description: 'Donated at least $100',
    icon: '💰',
    requirement: (userData) => userData.totalDonated >= 100
  },
  big_spender: {
    id: 'big_spender',
    name: 'Big Spender',
    description: 'Donated at least $500',
    icon: '💎',
    requirement: (userData) => userData.totalDonated >= 500
  },
  whale: {
    id: 'whale',
    name: 'Whale',
    description: 'Donated at least $1,000',
    icon: '🐋',
    requirement: (userData) => userData.totalDonated >= 1000
  },
  lucky_winner: {
    id: 'lucky_winner',
    name: 'Lucky Winner',
    description: 'Won a donation draw',
    icon: '🍀',
    requirement: (userData) => userData.wins && userData.wins > 0
  },
  streak_master: {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintained a 7-day donation streak',
    icon: '🔥',
    requirement: (userData) => userData.longestStreak >= 7
  },
  community_pillar: {
    id: 'community_pillar',
    name: 'Community Pillar',
    description: 'Referred at least 3 other donors',
    icon: '🏛️',
    requirement: (userData) => userData.referrals && userData.referrals.referred && userData.referrals.referred.length >= 3
  }
};

// Default feature toggles
export const DEFAULT_FEATURE_TOGGLES = {
  vipDraws: true,
  streakBonuses: true,
  referralSystem: true,
  milestoneRewards: true,
  luckyNumbers: true,
  multiWinnerDraws: true,
  personalDashboard: true,
  drawNotifications: true,
  donationStreaks: true,
  achievementSystem: true,
  seasonalLeaderboards: true,
  advancedAnalytics: true,
  automatedDraws: true,
  drawTemplates: true,
  bulkUserManagement: true,
  customEmbedThemes: true,
  dailyWeeklyChallenges: true,
  donationMultipliers: true,
  communityGoals: true,
  seasonalEvents: true,
  donorSpotlight: true,
  blacklistSystem: true,
  antifraudDetection: true,
  cooldownPeriods: true,
  adminActionLogging: true,
  roleBasedPermissions: true,
  backupAutomation: true,
  anonymousMode: true,
  scheduledDraws: true,
  interactiveDashboard: true,
  paginatedLists: true,
  localizationSupport: false,
  metricsTracking: true,
  cachingSystem: true,
  transactionSystem: true,
  commandCooldowns: true,
  embedThemes: true,
  loggingSystem: true,
  enhancedErrorHandling: true,
  contextSensitiveHelp: true
};

// Default theme colors
export const DEFAULT_THEME = {
  primary: '#4CAF50',
  secondary: '#2196F3',
  accent: '#FF9800',
  error: '#F44336',
  warning: '#FFC107',
  info: '#00BCD4',
  success: '#8BC34A',
  vip: '#9C27B0',
  special: '#E91E63'
};
