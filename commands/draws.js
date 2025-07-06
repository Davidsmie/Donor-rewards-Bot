import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js"
import { getDatabase } from "../utils/database.js"
import { logger } from "../utils/logger.js"
import { handleCategoryMenu, createPaginatedEmbeds, handlePagination } from "../utils/pagination.js"

export const data = new SlashCommandBuilder()
  .setName("draws")
  .setDescription("View draws, leaderboards, and information")
  .addStringOption((option) => 
    option.setName("draw_id").setDescription("Specific draw ID to view info for").setRequired(false)
  )

export async function execute(interaction) {
  try {
    const serverId = interaction.guildId
    const db = getDatabase(serverId)
    const drawId = interaction.options.getString("draw_id")

    logger.info(`Draws command executed by ${interaction.user.tag}`)

    // If specific draw ID provided, show info for that draw
    if (drawId) {
      await handleSpecificDrawInfo(interaction, db, drawId)
      return
    }

    // Create draws menu
    const menuData = {
      title: "🎁 Draw System",
      description: "View active draws, leaderboards, and draw information!",
      color: "#4CAF50",
      categories: [
        {
          id: "active",
          name: "Active Draws",
          emoji: "🎁",
          description: "View all active donation draws",
          generatePages: async () => await generateActiveDrawsPages(db)
        },
        {
          id: "leaderboards",
          name: "Leaderboards",
          emoji: "🏆",
          description: "View entry leaderboards for all draws",
          generatePages: async () => await generateLeaderboardPages(db, interaction.guild)
        },
        {
          id: "inactive",
          name: "Completed",
          emoji: "✅",
          description: "View completed/inactive draws",
          generatePages: async () => await generateInactiveDrawsPages(db)
        },
        {
          id: "ids",
          name: "Draw IDs",
          emoji: "🆔",
          description: "Quick reference for all draw IDs",
          generatePages: async () => await generateDrawIdsPages(db)
        }
      ]
    }

    await handleCategoryMenu(interaction, menuData, "draws")
  } catch (error) {
    logger.error("Error in draws command:", error)

    const errorMessage = {
      content: "❌ An error occurred while executing the draws command.",
      flags: MessageFlags.Ephemeral,
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage)
      } else {
        await interaction.reply(errorMessage)
      }
    } catch (followUpError) {
      logger.error("Error sending draws error message:", followUpError)
    }
  }
}

async function generateActiveDrawsPages(db) {
  const activeDraws = Object.entries(db.donationDraws || {})
    .filter(([_, draw]) => draw.active)
    .sort((a, b) => a[1].minAmount - b[1].minAmount)

  if (activeDraws.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🎁 Active Draws")
      .setDescription("❌ There are no active draws at the moment.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    activeDraws,
    3, // 3 draws per page
    ([drawId, draw]) => {
      const currentEntries = Object.values(draw.entries || {}).reduce((sum, count) => sum + count, 0)
      const maxAmount = draw.maxAmount >= 1000000 ? "No limit" : `$${draw.maxAmount}`

      let statusIcons = ""
      if (draw.manualEntriesOnly) statusIcons += "🔒 "
      if (draw.vipOnly) statusIcons += "⭐ "

      const fieldValue = [
        `💰 **Range:** $${draw.minAmount} - ${maxAmount}`,
        `🎟️ **Entries:** ${currentEntries}/${draw.maxEntries}`,
        `🏆 **Reward:** ${draw.reward}`,
        `📊 **Progress:** ${Math.round((currentEntries / draw.maxEntries) * 100)}%`,
        statusIcons ? `ℹ️ **Status:** ${statusIcons}` : "",
      ]
        .filter(Boolean)
        .join("\n")

      return {
        name: `${draw.name} (ID: \`${drawId}\`)`,
        value: fieldValue,
        inline: false
      }
    },
    {
      title: "🎁 Active Donation Draws",
      description: "Here are all the active donation draws:\n\n💡 Use `/donate` for instructions on how to enter these draws!",
      color: "#4CAF50",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function handleSpecificDrawInfo(interaction, db, drawId) {
  const draw = db.donationDraws?.[drawId]

  if (!draw) {
    return interaction.reply({
      content: "❌ Draw not found. Use `/draws` to see available draws.",
      flags: MessageFlags.Ephemeral,
    })
  }

  const currentEntries = Object.values(draw.entries || {}).reduce((sum, count) => sum + count, 0)
  const maxAmount = draw.maxAmount >= 1000000 ? "No limit" : `$${draw.maxAmount}`

  const embed = new EmbedBuilder()
    .setTitle(`🎁 ${draw.name}`)
    .setDescription(`Detailed information about draw: **\`${drawId}\`**`)
    .setColor(draw.active ? "#4CAF50" : "#F44336")
    .addFields(
      { name: "🆔 Draw ID", value: `\`${drawId}\``, inline: true },
      { name: "📊 Status", value: draw.active ? "🟢 Active" : "🔴 Inactive", inline: true },
      { name: "🏆 Reward", value: draw.reward, inline: true },
      { name: "💰 Min Amount", value: `$${draw.minAmount}`, inline: true },
      { name: "💎 Max Amount", value: maxAmount, inline: true },
      { name: "🎟️ Entries", value: `${currentEntries}/${draw.maxEntries}`, inline: true },
      { name: "📈 Progress", value: `${Math.round((currentEntries / draw.maxEntries) * 100)}%`, inline: true },
      { name: "⭐ VIP Only", value: draw.vipOnly ? "Yes" : "No", inline: true },
      { name: "🔒 Manual Entries", value: draw.manualEntriesOnly ? "Yes" : "No", inline: true },
    )

  if (draw.createdAt) {
    embed.addFields({
      name: "📅 Created",
      value: new Date(draw.createdAt).toLocaleDateString(),
      inline: true,
    })
  }

  if (draw.winner) {
    embed.addFields({
      name: "🏆 Winner",
      value: `<@${draw.winner}>`,
      inline: true,
    })
  }

  embed.setFooter({ text: "Powered By Aegisum Eco System" })
  await interaction.reply({ embeds: [embed] })
}

async function generateLeaderboardPages(db, guild) {
  const draws = Object.entries(db.donationDraws || {})
    .filter(([_, draw]) => draw.active)

  if (draws.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🏆 Draw Leaderboards")
      .setDescription("❌ No active draws found.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = []

  for (const [drawId, draw] of draws) {
    const entries = draw.entries || {}
    const sortedEntries = Object.entries(entries)
      .filter(([userId]) => !db.users?.[userId]?.privacyEnabled)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15) // Top 15 per draw

    if (sortedEntries.length === 0) {
      continue // Skip draws with no public entries
    }

    const totalEntries = Object.values(entries).reduce((sum, count) => sum + count, 0)

    const embed = new EmbedBuilder()
      .setTitle(`🎟️ ${draw.name} Leaderboard`)
      .setDescription(`Total entries: ${totalEntries}/${draw.maxEntries}`)
      .setColor("#4CAF50")

    const leaderboardText = sortedEntries
      .map(([userId, entryCount], index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
        const percentage = ((entryCount / totalEntries) * 100).toFixed(1)
        return `${medal} <@${userId}> - ${entryCount} entries (${percentage}%)`
      })
      .join("\n")

    embed.addFields({
      name: "📊 Top Entries",
      value: leaderboardText,
      inline: false,
    })

    embed.addFields(
      { name: "🏆 Reward", value: draw.reward, inline: true },
      { name: "💰 Range", value: `$${draw.minAmount} - $${draw.maxAmount >= 1000000 ? "No limit" : "$" + draw.maxAmount}`, inline: true },
      { name: "📊 Status", value: draw.active ? "🟢 Active" : "🔴 Inactive", inline: true },
    )

    embed.setFooter({ text: "Powered By Aegisum Eco System" })
    pages.push(embed)
  }

  if (pages.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🏆 Draw Leaderboards")
      .setDescription("❌ No public entries found for any active draws.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  return pages
}

async function generateInactiveDrawsPages(db) {
  const inactiveDraws = Object.entries(db.donationDraws || {})
    .filter(([_, draw]) => !draw.active)
    .sort((a, b) => (b[1].winnerSelectedAt || b[1].createdAt || 0) - (a[1].winnerSelectedAt || a[1].createdAt || 0))

  if (inactiveDraws.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("✅ Completed Draws")
      .setDescription("❌ No completed draws found.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const pages = createPaginatedEmbeds(
    inactiveDraws,
    5, // 5 draws per page
    ([drawId, draw]) => {
      const currentEntries = Object.values(draw.entries || {}).reduce((sum, count) => sum + count, 0)
      const maxAmount = draw.maxAmount >= 1000000 ? "No limit" : `$${draw.maxAmount}`

      let fieldValue = [
        `💰 **Range:** $${draw.minAmount} - ${maxAmount}`,
        `🎟️ **Entries:** ${currentEntries}/${draw.maxEntries}`,
        `🏆 **Reward:** ${draw.reward}`,
      ]

      if (draw.winner) {
        fieldValue.push(`👑 **Winner:** <@${draw.winner}>`)
      }

      if (draw.winnerSelectedAt) {
        fieldValue.push(`📅 **Completed:** ${new Date(draw.winnerSelectedAt).toLocaleDateString()}`)
      }

      return {
        name: `${draw.name} (ID: \`${drawId}\`)`,
        value: fieldValue.join("\n"),
        inline: false
      }
    },
    {
      title: "✅ Completed Draws",
      description: "Here are the completed/inactive draws:",
      color: "#9E9E9E",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateDrawIdsPages(db) {
  const draws = Object.entries(db.donationDraws || {})

  if (draws.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🆔 Draw IDs Reference")
      .setDescription("❌ No draws have been created yet.")
      .setColor("#F44336")
      .setFooter({ text: "Powered By Aegisum Eco System" })
    return [embed]
  }

  const activeDraws = draws.filter(([, draw]) => draw.active)
  const inactiveDraws = draws.filter(([, draw]) => !draw.active)

  const embed = new EmbedBuilder()
    .setTitle("🆔 Draw IDs Reference")
    .setDescription("Quick reference for all draw IDs:")
    .setColor("#00BCD4")

  if (activeDraws.length > 0) {
    const activeList = activeDraws
      .map(([drawId, draw]) => `• \`${drawId}\` - ${draw.name}`)
      .join("\n")

    embed.addFields({
      name: "🟢 Active Draws",
      value: activeList,
      inline: false,
    })
  }

  if (inactiveDraws.length > 0) {
    const inactiveList = inactiveDraws
      .slice(0, 10) // Limit to prevent embed overflow
      .map(([drawId, draw]) => `• \`${drawId}\` - ${draw.name}`)
      .join("\n")

    embed.addFields({
      name: "🔴 Inactive Draws",
      value: inactiveList,
      inline: false,
    })

    if (inactiveDraws.length > 10) {
      embed.addFields({
        name: "📝 Note",
        value: `Showing first 10 inactive draws. Total: ${inactiveDraws.length}`,
        inline: false,
      })
    }
  }

  embed.addFields({
    name: "💡 Usage",
    value: [
      "• Copy the draw ID (including backticks)",
      "• Use with `/draws draw_id:DRAW_ID` for specific info",
      "• Use with `/donate draw_id:DRAW_ID`",
    ].join("\n"),
    inline: false,
  })

  embed.setFooter({ text: "Powered By Aegisum Eco System" })
  return [embed]
}
