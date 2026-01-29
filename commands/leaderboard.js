import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js"
import { getDatabase } from "../utils/database.js"
import { logger } from "../utils/logger.js"
import { handleCategoryMenu, createPaginatedEmbeds } from "../utils/pagination.js"

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View various leaderboards and rankings")

export async function execute(interaction) {
  try {
    const serverId = interaction.guildId
    const db = getDatabase(serverId)

    // Create leaderboard menu
    const menuData = {
      title: "🏆 Leaderboard System",
      description: "View various rankings and leaderboards!",
      color: "#4CAF50",
      categories: [
        {
          id: "total",
          name: "Total Donations",
          emoji: "💰",
          description: "Top donors of all time",
          generatePages: async () => await generateTotalLeaderboard(db, interaction.guild)
        },
        {
          id: "monthly",
          name: "Monthly",
          emoji: "📅",
          description: "Top donors this month",
          generatePages: async () => await generateMonthlyLeaderboard(db, interaction.guild)
        },
        {
          id: "weekly",
          name: "Weekly",
          emoji: "📊",
          description: "Top donors this week",
          generatePages: async () => await generateWeeklyLeaderboard(db, interaction.guild)
        },
        {
          id: "entries",
          name: "Draw Entries",
          emoji: "🎫",
          description: "Users with most draw entries",
          generatePages: async () => await generateEntriesLeaderboard(db, interaction.guild)
        },
        {
          id: "achievements",
          name: "Achievements",
          emoji: "🏆",
          description: "Users with most achievements",
          generatePages: async () => await generateAchievementsLeaderboard(db, interaction.guild)
        },
        {
          id: "streaks",
          name: "Streaks",
          emoji: "🔥",
          description: "Longest donation streaks",
          generatePages: async () => await generateStreaksLeaderboard(db, interaction.guild)
        }
      ]
    }

    await handleCategoryMenu(interaction, menuData, "leaderboard")
  } catch (error) {
    logger.error("Error in leaderboard command:", error)
    
    const errorMessage = {
      content: "❌ An error occurred while fetching the leaderboard.",
      flags: MessageFlags.Ephemeral,
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage)
      } else {
        await interaction.reply(errorMessage)
      }
    } catch (followUpError) {
      logger.error("Error sending leaderboard error message:", followUpError)
    }
  }
}

async function generateTotalLeaderboard(db, guild) {
  const users = Object.entries(db.users || {})
    .filter(([userId, userData]) => userData.totalDonated > 0 && !userData.privacyEnabled)
    .sort(([, a], [, b]) => b.totalDonated - a.totalDonated)

  if (users.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🏆 Total Donations Leaderboard")
      .setDescription("❌ No donations found yet.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    users,
    15, // 15 users per page
    ([userId, userData], index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
      return `${medal} <@${userId}> - $${userData.totalDonated.toFixed(2)}`
    },
    {
      title: "🏆 Total Donations Leaderboard",
      description: "Top donors of all time",
      color: "#4CAF50",
      useFields: false,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateMonthlyLeaderboard(db, guild) {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthStartMs = monthStart.getTime()

  const users = Object.entries(db.users || {})
    .map(([userId, userData]) => {
      const monthlyTotal = (userData.donations || [])
        .filter(donation => donation.timestamp >= monthStartMs)
        .reduce((sum, donation) => sum + donation.amount, 0)
      
      return [userId, { ...userData, monthlyTotal }]
    })
    .filter(([userId, userData]) => userData.monthlyTotal > 0 && !userData.privacyEnabled)
    .sort(([, a], [, b]) => b.monthlyTotal - a.monthlyTotal)

  if (users.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("📅 Monthly Donations Leaderboard")
      .setDescription("❌ No donations found this month.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    users,
    15, // 15 users per page
    ([userId, userData], index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
      return `${medal} <@${userId}> - $${userData.monthlyTotal.toFixed(2)}`
    },
    {
      title: "📅 Monthly Donations Leaderboard",
      description: `Top donors for ${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      color: "#2196F3",
      useFields: false,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateWeeklyLeaderboard(db, guild) {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekStartMs = weekStart.getTime()

  const users = Object.entries(db.users || {})
    .map(([userId, userData]) => {
      const weeklyTotal = (userData.donations || [])
        .filter(donation => donation.timestamp >= weekStartMs)
        .reduce((sum, donation) => sum + donation.amount, 0)
      
      return [userId, { ...userData, weeklyTotal }]
    })
    .filter(([userId, userData]) => userData.weeklyTotal > 0 && !userData.privacyEnabled)
    .sort(([, a], [, b]) => b.weeklyTotal - a.weeklyTotal)

  if (users.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("📊 Weekly Donations Leaderboard")
      .setDescription("❌ No donations found this week.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    users,
    15, // 15 users per page
    ([userId, userData], index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
      return `${medal} <@${userId}> - $${userData.weeklyTotal.toFixed(2)}`
    },
    {
      title: "📊 Weekly Donations Leaderboard",
      description: "Top donors for this week",
      color: "#FF9800",
      useFields: false,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateEntriesLeaderboard(db, guild) {
  const users = Object.entries(db.users || {})
    .map(([userId, userData]) => {
      const totalEntries = Object.values(userData.entries || {}).reduce((sum, count) => sum + count, 0)
      return [userId, { ...userData, totalEntries }]
    })
    .filter(([userId, userData]) => userData.totalEntries > 0 && !userData.privacyEnabled)
    .sort(([, a], [, b]) => b.totalEntries - a.totalEntries)

  if (users.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🎫 Draw Entries Leaderboard")
      .setDescription("❌ No entries found yet.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    users,
    15, // 15 users per page
    ([userId, userData], index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
      return `${medal} <@${userId}> - ${userData.totalEntries} entries`
    },
    {
      title: "🎫 Draw Entries Leaderboard",
      description: "Users with the most draw entries",
      color: "#9C27B0",
      useFields: false,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateAchievementsLeaderboard(db, guild) {
  const users = Object.entries(db.users || {})
    .map(([userId, userData]) => {
      const achievementCount = (userData.achievements || []).length
      return [userId, { ...userData, achievementCount }]
    })
    .filter(([userId, userData]) => userData.achievementCount > 0 && !userData.privacyEnabled)
    .sort(([, a], [, b]) => b.achievementCount - a.achievementCount)

  if (users.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🏆 Achievements Leaderboard")
      .setDescription("❌ No achievements earned yet.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    users,
    15, // 15 users per page
    ([userId, userData], index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
      return `${medal} <@${userId}> - ${userData.achievementCount} achievements`
    },
    {
      title: "🏆 Achievements Leaderboard",
      description: "Users with the most achievements",
      color: "#E91E63",
      useFields: false,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateStreaksLeaderboard(db, guild) {
  const users = Object.entries(db.users || {})
    .map(([userId, userData]) => {
      const longestStreak = userData.streak?.longest || 0
      return [userId, { ...userData, longestStreak }]
    })
    .filter(([userId, userData]) => userData.longestStreak > 0 && !userData.privacyEnabled)
    .sort(([, a], [, b]) => b.longestStreak - a.longestStreak)

  if (users.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🔥 Donation Streaks Leaderboard")
      .setDescription("❌ No streaks found yet.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    users,
    15, // 15 users per page
    ([userId, userData], index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
      const currentStreak = userData.streak?.current || 0
      return `${medal} <@${userId}> - ${userData.longestStreak} days (current: ${currentStreak})`
    },
    {
      title: "🔥 Donation Streaks Leaderboard",
      description: "Longest donation streaks",
      color: "#FF5722",
      useFields: false,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}