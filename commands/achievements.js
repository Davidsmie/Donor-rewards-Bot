import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js"
import { getDatabase } from "../utils/database.js"
import { logger } from "../utils/logger.js"
import { ACHIEVEMENTS, DEFAULT_THEME } from "../config.js"
import { handleCategoryMenu, createPaginatedEmbeds, handlePagination } from "../utils/pagination.js"

export const data = new SlashCommandBuilder()
  .setName("achievements")
  .setDescription("View achievements and progress")
  .addUserOption(option =>
    option.setName("target").setDescription("User to view achievements for").setRequired(false)
  )

export async function execute(interaction) {
  try {
    const serverId = interaction.guildId
    const db = getDatabase(serverId)
    const targetUser = interaction.options.getUser("target") || interaction.user

    // Create achievement menu
    const menuData = {
      title: "🏆 Achievement System",
      description: "View available achievements, your progress, and earned achievements!",
      color: DEFAULT_THEME?.accent || "#FF9800",
      categories: [
        {
          id: "list",
          name: "Available",
          emoji: "📋",
          description: "View all available achievements",
          generatePages: async () => await generateAchievementList(db)
        },
        {
          id: "progress",
          name: "Progress",
          emoji: "📊",
          description: "View your achievement progress",
          generatePages: async () => await generateProgressPages(db, interaction.user.id)
        },
        {
          id: "earned",
          name: "Earned",
          emoji: "🏆",
          description: `View ${targetUser.id === interaction.user.id ? 'your' : targetUser.username + "'s"} earned achievements`,
          generatePages: async () => await generateEarnedPages(db, targetUser)
        }
      ]
    }

    await handleCategoryMenu(interaction, menuData, "achievements")
  } catch (error) {
    logger.error("Error in achievements command:", error)
    
    const errorMessage = {
      content: "❌ An error occurred while executing the achievements command.",
      flags: MessageFlags.Ephemeral,
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage)
      } else {
        await interaction.reply(errorMessage)
      }
    } catch (followUpError) {
      logger.error("Error sending achievements error message:", followUpError)
    }
  }
}

async function generateAchievementList(db) {
  const achievementData = Object.entries(ACHIEVEMENTS).map(([id, achievement]) => ({
    id,
    ...achievement
  }))

  const pages = createPaginatedEmbeds(
    achievementData,
    6, // 6 achievements per page
    (achievement) => ({
      name: `${achievement.icon} ${achievement.name}`,
      value: achievement.description,
      inline: true
    }),
    {
      title: "🏆 Available Achievements",
      description: "Complete these challenges to earn achievements!",
      color: DEFAULT_THEME?.info || "#00BCD4",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateEarnedPages(db, targetUser) {
  const userData = db.users?.[targetUser.id]
  
  if (!userData) {
    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${targetUser.username}'s Achievements`)
      .setDescription("❌ This user has no donation history yet.")
      .setColor(DEFAULT_THEME?.error || "#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const userAchievements = userData.achievements || []
  const totalAchievements = Object.keys(ACHIEVEMENTS).length

  if (userAchievements.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${targetUser.username}'s Achievements`)
      .setDescription(`0 of ${totalAchievements} achievements earned`)
      .setColor(DEFAULT_THEME?.warning || "#FFC107")
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields({
        name: "No Achievements Yet",
        value: "Make donations to earn achievements!",
        inline: false
      })
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const earnedAchievements = userAchievements
    .map(id => ACHIEVEMENTS[id])
    .filter(achievement => achievement)

  const pages = createPaginatedEmbeds(
    earnedAchievements,
    6, // 6 achievements per page
    (achievement) => ({
      name: `${achievement.icon} ${achievement.name}`,
      value: achievement.description,
      inline: true
    }),
    {
      title: `🏆 ${targetUser.username}'s Achievements`,
      description: `${userAchievements.length} of ${totalAchievements} achievements earned`,
      color: DEFAULT_THEME?.accent || "#FF9800",
      thumbnail: targetUser.displayAvatarURL(),
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateProgressPages(db, userId) {
  const userData = db.users?.[userId]

  if (!userData) {
    const embed = new EmbedBuilder()
      .setTitle("📊 Achievement Progress")
      .setDescription("❌ You have no donation history yet. Make a donation to get started!")
      .setColor(DEFAULT_THEME?.error || "#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const progressData = Object.entries(ACHIEVEMENTS).map(([id, achievement]) => {
    const hasAchievement = userData.achievements?.includes(id)
    const status = hasAchievement ? "✅" : "❌"
    
    let progress = ""
    if (!hasAchievement) {
      // Add specific progress info based on achievement type
      if (id === "generous_donor") {
        progress = ` ($${userData.totalDonated.toFixed(2)}/$100)`
      } else if (id === "big_spender") {
        progress = ` ($${userData.totalDonated.toFixed(2)}/$500)`
      } else if (id === "whale") {
        progress = ` ($${userData.totalDonated.toFixed(2)}/$1000)`
      } else if (id === "streak_master") {
        progress = ` (${userData.streak?.longest || 0}/7 days)`
      } else if (id === "community_pillar") {
        const referrals = userData.referrals?.referred?.length || 0
        progress = ` (${referrals}/3 referrals)`
      }
    }

    return {
      status,
      achievement,
      progress
    }
  })

  const pages = createPaginatedEmbeds(
    progressData,
    6, // 6 achievements per page
    (item) => ({
      name: `${item.status} ${item.achievement.icon} ${item.achievement.name}`,
      value: `${item.achievement.description}${item.progress}`,
      inline: true
    }),
    {
      title: "📊 Achievement Progress",
      description: "Your progress towards earning achievements",
      color: DEFAULT_THEME?.accent || "#FF9800",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}