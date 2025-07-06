import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js"
import { getDatabase } from "../utils/database.js"
import { logger } from "../utils/logger.js"
import { CONFIG, ACHIEVEMENTS } from "../config.js"
import { handleCategoryMenu, createPaginatedEmbeds, createActionButtons } from "../utils/pagination.js"
import { saveDatabase } from "../utils/database.js"

export const data = new SlashCommandBuilder()
  .setName("user")
  .setDescription("User profile and settings management")
  .addUserOption(option =>
    option.setName("target").setDescription("User to view (for profile/achievements)").setRequired(false)
  )

export async function execute(interaction) {
  try {
    const serverId = interaction.guildId
    const db = getDatabase(serverId)
    const targetUser = interaction.options.getUser("target") || interaction.user

    // Create user menu
    const menuData = {
      title: "👤 User Profile & Settings",
      description: `Manage your profile, entries, and settings!\n\n**Viewing:** ${targetUser.tag}`,
      color: "#2196F3",
      categories: [
        {
          id: "profile",
          name: "Profile",
          emoji: "👤",
          description: "View donation profile and statistics",
          generatePages: async () => await generateUserProfile(db, targetUser, interaction.guild)
        },
        {
          id: "entries",
          name: "Draw Entries",
          emoji: "🎟️",
          description: "View current draw entries",
          generatePages: async () => await generateUserEntries(db, targetUser, interaction.guild)
        },
        {
          id: "achievements",
          name: "Achievements",
          emoji: "🏆",
          description: "View earned achievements",
          generatePages: async () => await generateUserAchievements(db, targetUser, interaction.guild)
        },
        {
          id: "donor_roles",
          name: "Donor Roles",
          emoji: "⭐",
          description: "View donor role progress",
          generatePages: async () => await generateDonorRoles(db, targetUser, interaction.guild)
        },
        {
          id: "privacy",
          name: "Privacy Settings",
          emoji: "🔒",
          description: "Manage privacy settings",
          generatePages: async () => await generatePrivacySettings(db, targetUser, interaction.guild)
        },
        {
          id: "select_draw",
          name: "Select Draw",
          emoji: "🎯",
          description: "Choose draw for future donations",
          generatePages: async () => await generateDrawSelection(db, targetUser, interaction.guild)
        }
      ]
    }

    await handleCategoryMenu(interaction, menuData, "user")
  } catch (error) {
    logger.error("Error in user command:", error)
    
    const errorMessage = {
      content: "❌ An error occurred while fetching user information.",
      flags: MessageFlags.Ephemeral,
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage)
      } else {
        await interaction.reply(errorMessage)
      }
    } catch (followUpError) {
      logger.error("Error sending user error message:", followUpError)
    }
  }
}

async function generateUserProfile(db, user, guild) {
  const userData = db.users?.[user.id] || {
    totalDonated: 0,
    entries: {},
    donations: [],
    achievements: [],
    wins: 0,
    streak: { current: 0, longest: 0 }
  }

  const totalEntries = Object.values(userData.entries || {}).reduce((sum, count) => sum + count, 0)

  const embed = new EmbedBuilder()
    .setTitle(`${user.tag}'s Profile`)
    .setDescription("Donation profile and statistics")
    .setColor("#2196F3")
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: "💰 Total Donated", value: `$${userData.totalDonated.toFixed(2)}`, inline: true },
      { name: "🎟️ Total Entries", value: totalEntries.toString(), inline: true },
      { name: "🏆 Wins", value: userData.wins.toString(), inline: true },
      { name: "🔥 Current Streak", value: `${userData.streak?.current || 0} days`, inline: true },
      { name: "📈 Longest Streak", value: `${userData.streak?.longest || 0} days`, inline: true },
      { name: "🏅 Achievements", value: `${userData.achievements?.length || 0}/7`, inline: true }
    )
    .setFooter({ text: "Powered By Aegisum Eco System" })
    .setTimestamp()

  return [embed]
}

async function generateUserEntries(db, user, guild) {
  const userData = db.users?.[user.id] || { entries: {} }
  const userEntries = userData.entries || {}

  if (Object.keys(userEntries).length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🎟️ Your Draw Entries")
      .setDescription("❌ You don't have any draw entries yet.\n\nMake a donation to get started!")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const entries = Object.entries(userEntries)
    .filter(([drawId, count]) => count > 0 && db.donationDraws?.[drawId]?.active)
    .map(([drawId, count]) => {
      const draw = db.donationDraws[drawId]
      return {
        name: `${draw?.name || drawId}`,
        value: `🎟️ **${count}** entries\n🏆 **Reward:** ${draw?.reward || "Unknown"}\n📊 **Status:** ${draw?.active ? "🟢 Active" : "🔴 Inactive"}`,
        inline: true
      }
    })

  if (entries.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🎟️ Your Draw Entries")
      .setDescription("❌ No active draw entries found.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    entries,
    6, // 6 draws per page
    (entry) => entry,
    {
      title: "🎟️ Your Draw Entries",
      description: "Current entries in active draws",
      color: "#4CAF50",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateUserAchievements(db, user, guild) {
  const userData = db.users?.[user.id] || { achievements: [] }
  const userAchievements = userData.achievements || []

  const allAchievements = [
    { id: "first_steps", name: "First Steps", description: "Made your first donation", emoji: "🎯" },
    { id: "generous_donor", name: "Generous Donor", description: "Donated at least $100", emoji: "💰" },
    { id: "big_spender", name: "Big Spender", description: "Donated at least $500", emoji: "💎" },
    { id: "whale", name: "Whale", description: "Donated at least $1,000", emoji: "🐋" },
    { id: "lucky_winner", name: "Lucky Winner", description: "Won a donation draw", emoji: "🍀" },
    { id: "streak_master", name: "Streak Master", description: "Maintained a 7-day donation streak", emoji: "🔥" },
    { id: "community_pillar", name: "Community Pillar", description: "Referred at least 3 other donors", emoji: "🏛️" }
  ]

  const earnedAchievements = allAchievements.filter(achievement => 
    userAchievements.includes(achievement.id)
  )

  if (earnedAchievements.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${user.tag}'s Achievements`)
      .setDescription("❌ No achievements earned yet.\n\nMake donations to earn achievements!")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    earnedAchievements,
    5, // 5 achievements per page
    (achievement) => ({
      name: `${achievement.emoji} ${achievement.name}`,
      value: achievement.description,
      inline: false
    }),
    {
      title: `🏆 ${user.tag}'s Achievements`,
      description: `${earnedAchievements.length} of ${allAchievements.length} achievements earned`,
      color: "#FFD700",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateDonorRoles(db, user, guild) {
  const userData = db.users?.[user.id] || { totalDonated: 0 }
  const totalDonated = userData.totalDonated

  const donorRoles = [
    { name: "Bronze Donor", min: 5, max: 25, color: "#CD7F32" },
    { name: "Silver Donor", min: 26, max: 50, color: "#C0C0C0" },
    { name: "Gold Donor", min: 51, max: 100, color: "#FFD700" },
    { name: "Platinum Donor", min: 101, max: 250, color: "#E5E4E2" },
    { name: "Diamond Donor", min: 251, max: 500, color: "#B9F2FF" },
    { name: "Onyx Donor", min: 500, max: Infinity, color: "#353839" }
  ]

  let currentRole = null
  let nextRole = null

  for (let i = 0; i < donorRoles.length; i++) {
    const role = donorRoles[i]
    if (totalDonated >= role.min && totalDonated <= role.max) {
      currentRole = role
      nextRole = donorRoles[i + 1] || null
      break
    }
  }

  if (!currentRole && totalDonated < donorRoles[0].min) {
    nextRole = donorRoles[0]
  }

  const embed = new EmbedBuilder()
    .setTitle("⭐ Donor Roles")
    .setDescription(`You have donated a total of **$${totalDonated.toFixed(2)}**`)
    .setColor(currentRole?.color || "#9E9E9E")

  if (currentRole) {
    embed.addFields({
      name: "🎖️ Current Role",
      value: `**${currentRole.name}**\nRequired: $${currentRole.min}+`,
      inline: true
    })
  }

  if (nextRole) {
    const needed = nextRole.min - totalDonated
    embed.addFields({
      name: "🎯 Next Role",
      value: `**${nextRole.name}**\nNeed: $${needed.toFixed(2)} more`,
      inline: true
    })
  }

  // Add all roles
  const rolesText = donorRoles.map(role => {
    const status = totalDonated >= role.min ? "✅" : "❌"
    const range = role.max === Infinity ? `$${role.min}+` : `$${role.min} - $${role.max}`
    return `${status} **${role.name}** - ${range}`
  }).join("\n")

  embed.addFields({
    name: "📋 All Donor Roles",
    value: rolesText,
    inline: false
  })

  embed.setFooter({ text: "Powered By Aegisum Eco System" })

  return [embed]
}

async function generatePrivacySettings(db, user, guild) {
  const userData = db.users?.[user.id] || { privacyEnabled: false }

  const embed = new EmbedBuilder()
    .setTitle("🔒 Privacy Settings")
    .setDescription("Your current privacy settings:")
    .setColor("#9C27B0")
    .addFields(
      {
        name: "👁️ Hide Profile",
        value: userData.privacyEnabled ? "🟢 Enabled" : "🔴 Disabled",
        inline: true
      },
      {
        name: "💰 Hide Donations",
        value: userData.privacyEnabled ? "🟢 Enabled" : "🔴 Disabled",
        inline: true
      },
      {
        name: "🏆 Hide Achievements",
        value: userData.privacyEnabled ? "🟢 Enabled" : "🔴 Disabled",
        inline: true
      }
    )
    .addFields({
      name: "ℹ️ Click buttons below to toggle settings",
      value: "Changes are saved automatically",
      inline: false
    })
    .setFooter({ text: "Powered By Aegisum Eco System" })

  // Add action buttons for privacy settings
  const actions = [
    {
      id: "toggle_privacy",
      label: userData.privacyEnabled ? "Disable Privacy" : "Enable Privacy",
      style: userData.privacyEnabled ? 4 : 3, // Red if enabled, Green if disabled
      emoji: userData.privacyEnabled ? "🔓" : "🔒"
    }
  ]

  const actionRow = createActionButtons(actions, "user_privacy")
  
  return { embeds: [embed], components: [actionRow] }
}

async function generateDrawSelection(db, user, guild) {
  const userData = db.users?.[user.id] || {}
  const selectedDraw = userData.selectedDraw

  const activeDraws = Object.entries(db.donationDraws || {})
    .filter(([_, draw]) => draw.active)

  if (activeDraws.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🎯 Draw Selection")
      .setDescription("❌ No active draws available.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return { embeds: [embed], components: [] }
  }

  const embed = new EmbedBuilder()
    .setTitle("🎯 Draw Selection")
    .setDescription("Choose which draw your future donations will count towards")
    .setColor("#FF9800")

  if (selectedDraw && db.donationDraws[selectedDraw]) {
    const draw = db.donationDraws[selectedDraw]
    embed.addFields({
      name: "🎯 Currently Selected",
      value: `**${draw.name}**\nMin Amount: $${draw.minAmount}\nReward: ${draw.reward}`,
      inline: false
    })
  } else {
    embed.addFields({
      name: "🎯 Currently Selected",
      value: "**Automatic Selection**\nDraws are selected based on donation amount",
      inline: false
    })
  }

  const drawsText = activeDraws.map(([drawId, draw]) => {
    const selected = selectedDraw === drawId ? "🎯" : "⚪"
    return `${selected} **${draw.name}**\n💰 Min: $${draw.minAmount} | 🏆 Reward: ${draw.reward}`
  }).join("\n\n")

  embed.addFields({
    name: "📋 Available Draws",
    value: drawsText,
    inline: false
  })

  embed.addFields({
    name: "ℹ️ Click buttons below to select a draw",
    value: "Changes are saved automatically",
    inline: false
  })

  embed.setFooter({ text: "Powered By Aegisum Eco System" })

  // Create action buttons for each draw + auto option
  const actions = [
    {
      id: "auto",
      label: "Automatic",
      style: !selectedDraw ? 3 : 2, // Green if selected, Gray if not
      emoji: "🔄"
    }
  ]

  // Add buttons for each active draw (limit to 4 to fit in one row)
  activeDraws.slice(0, 3).forEach(([drawId, draw]) => {
    actions.push({
      id: drawId,
      label: draw.name.substring(0, 20), // Limit label length
      style: selectedDraw === drawId ? 3 : 2, // Green if selected, Gray if not
      emoji: selectedDraw === drawId ? "🎯" : "⚪"
    })
  })

  const actionRow = createActionButtons(actions, "user_draw")
  
  return { embeds: [embed], components: [actionRow] }
}
