import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js"
import { getDatabase, saveDatabase } from "../utils/database.js"
import { logger } from "../utils/logger.js"
import { handleCategoryMenu, createActionButtons } from "../utils/pagination.js"

export const data = new SlashCommandBuilder()
  .setName("lucky")
  .setDescription("Lucky number games and management")

export async function execute(interaction) {
  try {
    const serverId = interaction.guildId
    const db = getDatabase(serverId)
    const subcommand = interaction.options.getSubcommand()

    switch (subcommand) {
      case "set":
        await handleSetLuckyNumbers(interaction, db)
        break
      case "view":
        await handleViewLuckyNumbers(interaction, db)
        break
      case "clear":
        await handleClearLuckyNumbers(interaction, db)
        break
      default:
        await interaction.reply({
          content: "❌ Unknown subcommand.",
          flags: MessageFlags.Ephemeral,
        })
    }
  } catch (error) {
    logger.error("Error in lucky command:", error)
    
    const errorMessage = {
      content: "❌ An error occurred while managing lucky numbers.",
      flags: MessageFlags.Ephemeral,
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage)
      } else {
        await interaction.reply(errorMessage)
      }
    } catch (followUpError) {
      logger.error("Error sending lucky error message:", followUpError)
    }
  }
}

async function handleSetLuckyNumbers(interaction, db) {
  const numbersString = interaction.options.getString("numbers")
  const userId = interaction.user.id

  // Parse and validate numbers
  const numbers = numbersString.split(",").map(n => n.trim()).map(Number)
  
  // Validation
  if (numbers.some(isNaN)) {
    return interaction.reply({
      content: "❌ All values must be valid numbers.",
      flags: MessageFlags.Ephemeral,
    })
  }

  if (numbers.some(n => n < 1 || n > 50)) {
    return interaction.reply({
      content: "❌ All numbers must be between 1 and 50.",
      flags: MessageFlags.Ephemeral,
    })
  }

  if (numbers.length > 10) {
    return interaction.reply({
      content: "❌ You can only set up to 10 lucky numbers.",
      flags: MessageFlags.Ephemeral,
    })
  }

  if (new Set(numbers).size !== numbers.length) {
    return interaction.reply({
      content: "❌ All numbers must be unique.",
      flags: MessageFlags.Ephemeral,
    })
  }

  // Initialize user data if needed
  if (!db.users[userId]) {
    db.users[userId] = {
      totalDonated: 0,
      entries: {},
      donations: [],
      achievements: [],
      privacyEnabled: false,
      wins: 0,
      referrals: { referred: [], referredBy: null },
      luckyNumbers: [],
      milestones: [],
      streaks: { current: 0, longest: 0, lastDonation: null }
    }
  }

  // Set lucky numbers
  db.users[userId].luckyNumbers = numbers.sort((a, b) => a - b)
  saveDatabase(interaction.guildId, db)

  const embed = new EmbedBuilder()
    .setTitle("🍀 Lucky Numbers Set")
    .setDescription("Your lucky numbers have been updated!")
    .setColor(db.config?.theme?.success || "#4CAF50")
    .addFields({
      name: "🎲 Your Lucky Numbers",
      value: numbers.sort((a, b) => a - b).join(", "),
      inline: false,
    })
    .addFields({
      name: "💡 How It Works",
      value: "Lucky numbers may give you bonus entries or special advantages in certain draws!",
      inline: false,
    })
    .setFooter({ text: "Powered By Aegisum Eco System" })

  await interaction.reply({ embeds: [embed] })
  logger.info(`Lucky numbers set: ${numbers.join(", ")} by ${interaction.user.tag}`)
}

async function handleViewLuckyNumbers(interaction, db) {
  const userId = interaction.user.id
  const userData = db.users?.[userId]

  if (!userData?.luckyNumbers || userData.luckyNumbers.length === 0) {
    return interaction.reply({
      content: "❌ You haven't set any lucky numbers yet. Use `/lucky set` to set them!",
      flags: MessageFlags.Ephemeral,
    })
  }

  const embed = new EmbedBuilder()
    .setTitle("🍀 Your Lucky Numbers")
    .setDescription("Here are your current lucky numbers")
    .setColor(db.config?.theme?.info || "#00BCD4")
    .addFields({
      name: "🎲 Numbers",
      value: userData.luckyNumbers.join(", "),
      inline: false,
    })
    .addFields({
      name: "📊 Statistics",
      value: `Total: ${userData.luckyNumbers.length}/10\nRange: ${Math.min(...userData.luckyNumbers)} - ${Math.max(...userData.luckyNumbers)}`,
      inline: false,
    })
    .setFooter({ text: "Use /lucky set to change • Powered By Aegisum Eco System" })

  await interaction.reply({ embeds: [embed] })
}

async function handleClearLuckyNumbers(interaction, db) {
  const userId = interaction.user.id

  if (!db.users[userId]) {
    return interaction.reply({
      content: "❌ You don't have any lucky numbers to clear.",
      flags: MessageFlags.Ephemeral,
    })
  }

  db.users[userId].luckyNumbers = []
  saveDatabase(interaction.guildId, db)

  const embed = new EmbedBuilder()
    .setTitle("🗑️ Lucky Numbers Cleared")
    .setDescription("Your lucky numbers have been cleared.")
    .setColor(db.config?.theme?.warning || "#FFC107")
    .addFields({
      name: "💡 Set New Numbers",
      value: "Use `/lucky set numbers:1,7,13,21,42` to set new lucky numbers.",
      inline: false,
    })
    .setFooter({ text: "Powered By Aegisum Eco System" })

  await interaction.reply({ embeds: [embed] })
  logger.info(`Lucky numbers cleared by ${interaction.user.tag}`)
}