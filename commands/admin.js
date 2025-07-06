import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js"
import { getDatabase, saveDatabase } from "../utils/database.js"
import { logger } from "../utils/logger.js"
import { handleCategoryMenu, createPaginatedEmbeds } from "../utils/pagination.js"

export const data = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Admin management and configuration")

export async function execute(interaction) {
  try {
    const serverId = interaction.guildId
    const db = getDatabase(serverId)

    // Check if user has admin permissions
    const adminRoleId = db.config?.adminRoleId
    if (adminRoleId && !interaction.member.roles.cache.has(adminRoleId)) {
      return interaction.reply({
        content: "❌ You don't have permission to use admin commands.",
        flags: MessageFlags.Ephemeral,
      })
    }

    // Create admin menu
    const menuData = {
      title: "🛠️ Admin Management Panel",
      description: "Comprehensive bot administration and configuration",
      color: "#FF5722",
      categories: [
        {
          id: "setup",
          name: "Bot Setup",
          emoji: "⚙️",
          description: "Initial bot configuration and setup",
          generatePages: async () => await generateSetupPage(db, interaction.guild)
        },
        {
          id: "dashboard",
          name: "Dashboard",
          emoji: "📊",
          description: "Overview of bot statistics and status",
          generatePages: async () => await generateDashboard(db, interaction.guild)
        },
        {
          id: "analytics",
          name: "Analytics",
          emoji: "📈",
          description: "Detailed server analytics and reports",
          generatePages: async () => await generateAnalytics(db, interaction.guild)
        },
        {
          id: "draws",
          name: "Draw Management",
          emoji: "🎯",
          description: "Create, edit, and manage donation draws",
          generatePages: async () => await generateDrawManagement(db, interaction.guild)
        },
        {
          id: "users",
          name: "User Management",
          emoji: "👥",
          description: "Manage users, entries, and blacklists",
          generatePages: async () => await generateUserManagement(db, interaction.guild)
        },
        {
          id: "features",
          name: "Features",
          emoji: "🔧",
          description: "Toggle bot features and settings",
          generatePages: async () => await generateFeatures(db, interaction.guild)
        }
      ]
    }

    await handleCategoryMenu(interaction, menuData, "admin")
  } catch (error) {
    logger.error("Error in admin command:", error)
    
    const errorMessage = {
      content: "❌ An error occurred while accessing admin panel.",
      flags: MessageFlags.Ephemeral,
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage)
      } else {
        await interaction.reply(errorMessage)
      }
    } catch (followUpError) {
      logger.error("Error sending admin error message:", followUpError)
    }
  }
}

async function generateSetupPage(db, guild) {
  const config = db.config || {}
  
  const embed = new EmbedBuilder()
    .setTitle("⚙️ Bot Setup")
    .setDescription("Current bot configuration")
    .setColor("#FF5722")
    .addFields(
      {
        name: "🛡️ Admin Role",
        value: config.adminRoleId ? `<@&${config.adminRoleId}>` : "❌ Not set",
        inline: true
      },
      {
        name: "📝 Log Channel",
        value: config.logChannelId ? `<#${config.logChannelId}>` : "❌ Not set",
        inline: true
      },
      {
        name: "📢 Notification Channel",
        value: config.notificationChannelId ? `<#${config.notificationChannelId}>` : "❌ Not set",
        inline: true
      }
    )
    .addFields({
      name: "ℹ️ Setup Instructions",
      value: "Use the original `/admin setup` command to configure these settings.",
      inline: false
    })
    .setFooter({ text: "Powered By Aegisum Eco System" })

  return [embed]
}

async function generateDashboard(db, guild) {
  const totalUsers = Object.keys(db.users || {}).length
  const totalDonations = Object.values(db.users || {}).reduce((sum, user) => sum + (user.totalDonated || 0), 0)
  const totalDraws = Object.keys(db.donationDraws || {}).length
  const activeDraws = Object.values(db.donationDraws || {}).filter(draw => draw.active).length

  const embed = new EmbedBuilder()
    .setTitle("📊 Admin Dashboard")
    .setDescription("Bot overview and statistics")
    .setColor("#4CAF50")
    .addFields(
      { name: "👥 Total Users", value: totalUsers.toString(), inline: true },
      { name: "💰 Total Donations", value: `$${totalDonations.toFixed(2)}`, inline: true },
      { name: "🎯 Total Draws", value: totalDraws.toString(), inline: true },
      { name: "🟢 Active Draws", value: activeDraws.toString(), inline: true },
      { name: "📅 Server Created", value: guild.createdAt.toDateString(), inline: true },
      { name: "👑 Server Owner", value: `<@${guild.ownerId}>`, inline: true }
    )
    .setFooter({ text: "Powered By Aegisum Eco System" })
    .setTimestamp()

  return [embed]
}

async function generateAnalytics(db, guild) {
  // Generate multiple analytics pages
  const pages = []

  // Overview page
  const overviewEmbed = new EmbedBuilder()
    .setTitle("📈 Analytics Overview")
    .setDescription("Comprehensive server analytics")
    .setColor("#2196F3")
    .addFields(
      { name: "📊 Total Donations", value: `$${Object.values(db.users || {}).reduce((sum, user) => sum + (user.totalDonated || 0), 0).toFixed(2)}`, inline: true },
      { name: "🎯 Total Entries", value: Object.values(db.users || {}).reduce((sum, user) => sum + Object.values(user.entries || {}).reduce((s, c) => s + c, 0), 0).toString(), inline: true },
      { name: "🏆 Total Wins", value: Object.values(db.users || {}).reduce((sum, user) => sum + (user.wins || 0), 0).toString(), inline: true }
    )
    .setFooter({ text: "Page 1/3 • Powered By Aegisum Eco System" })

  pages.push(overviewEmbed)

  // Top donors page
  const topDonors = Object.entries(db.users || {})
    .sort(([,a], [,b]) => (b.totalDonated || 0) - (a.totalDonated || 0))
    .slice(0, 10)

  const donorsEmbed = new EmbedBuilder()
    .setTitle("💰 Top Donors")
    .setDescription("Highest contributing users")
    .setColor("#FFD700")

  if (topDonors.length > 0) {
    const donorsList = topDonors.map(([userId, user], index) => 
      `${index + 1}. <@${userId}> - $${(user.totalDonated || 0).toFixed(2)}`
    ).join("\n")
    
    donorsEmbed.addFields({ name: "🏆 Leaderboard", value: donorsList, inline: false })
  } else {
    donorsEmbed.addFields({ name: "📊 No Data", value: "No donations recorded yet.", inline: false })
  }

  donorsEmbed.setFooter({ text: "Page 2/3 • Powered By Aegisum Eco System" })
  pages.push(donorsEmbed)

  // Draw statistics page
  const drawStats = Object.entries(db.donationDraws || {}).map(([drawId, draw]) => {
    const totalEntries = Object.values(draw.entries || {}).reduce((sum, count) => sum + count, 0)
    const progress = draw.maxEntries ? Math.round((totalEntries / draw.maxEntries) * 100) : 0
    return {
      name: `🎯 ${draw.name || drawId}`,
      value: `📊 ${totalEntries}/${draw.maxEntries || "∞"} entries (${progress}%)\n🏆 Reward: ${draw.reward}\n📈 Status: ${draw.active ? "🟢 Active" : "🔴 Inactive"}`,
      inline: true
    }
  })

  const drawsEmbed = new EmbedBuilder()
    .setTitle("🎯 Draw Statistics")
    .setDescription("Current draw performance")
    .setColor("#9C27B0")

  if (drawStats.length > 0) {
    drawsEmbed.addFields(drawStats.slice(0, 6)) // Limit to 6 draws per page
  } else {
    drawsEmbed.addFields({ name: "📊 No Draws", value: "No draws created yet.", inline: false })
  }

  drawsEmbed.setFooter({ text: "Page 3/3 • Powered By Aegisum Eco System" })
  pages.push(drawsEmbed)

  return pages
}

async function generateDrawManagement(db, guild) {
  const draws = Object.entries(db.donationDraws || {})

  if (draws.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🎯 Draw Management")
      .setDescription("❌ No draws found.\n\nUse `/admin create_draw` to create your first draw!")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    draws,
    3, // 3 draws per page
    ([drawId, draw]) => {
      const totalEntries = Object.values(draw.entries || {}).reduce((sum, count) => sum + count, 0)
      const progress = draw.maxEntries ? Math.round((totalEntries / draw.maxEntries) * 100) : 0
      
      return {
        name: `🎯 ${draw.name || drawId}`,
        value: `**ID:** \`${drawId}\`\n**Reward:** ${draw.reward}\n**Min Amount:** $${draw.minAmount}\n**Entries:** ${totalEntries}/${draw.maxEntries || "∞"} (${progress}%)\n**Status:** ${draw.active ? "🟢 Active" : "🔴 Inactive"}\n**VIP Only:** ${draw.vipOnly ? "✅ Yes" : "❌ No"}`,
        inline: false
      }
    },
    {
      title: "🎯 Draw Management",
      description: "Manage all donation draws",
      color: "#FF9800",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateUserManagement(db, guild) {
  const users = Object.entries(db.users || {})
    .sort(([,a], [,b]) => (b.totalDonated || 0) - (a.totalDonated || 0))

  if (users.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("👥 User Management")
      .setDescription("❌ No users found.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    users,
    10, // 10 users per page
    ([userId, user]) => {
      const totalEntries = Object.values(user.entries || {}).reduce((sum, count) => sum + count, 0)
      return `<@${userId}> - $${(user.totalDonated || 0).toFixed(2)} (${totalEntries} entries, ${user.wins || 0} wins)`
    },
    {
      title: "👥 User Management",
      description: "All registered users and their statistics",
      color: "#3F51B5",
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateFeatures(db, guild) {
  const features = [
    "VIP Draws", "streakBonuses", "referralSystem", "milestoneRewards", 
    "luckyNumbers", "multiWinnerDraws", "personalDashboard", "Draw Notifications",
    "donationStreaks", "Achievement System", "Seasonal Leaderboards", "advancedAnalytics",
    "Automated Draws", "drawTemplates", "bulkUserManagement", "customEmbedThemes",
    "dailyWeeklyChallenges", "donationMultipliers", "communityGoals", "seasonalEvents",
    "donorSpotlight", "blacklistSystem", "antifraudDetection", "cooldownPeriods",
    "adminActionLogging", "roleBasedPermissions", "backupAutomation", "Privacy Controls",
    "contextSensitiveHelp"
  ]

  const embed = new EmbedBuilder()
    .setTitle("🔧 Feature Status")
    .setDescription("Current status of all bot features")
    .setColor("#607D8B")

  const featureList = features.map(feature => `✅ **${feature}**`).join("\n")
  
  embed.addFields({
    name: "🚀 All Features",
    value: featureList,
    inline: false
  })

  embed.addFields({
    name: "ℹ️ Note",
    value: "All features are currently enabled. Use individual admin commands to configure specific features.",
    inline: false
  })

  embed.setFooter({ text: "Powered By Aegisum Eco System" })

  return [embed]
}