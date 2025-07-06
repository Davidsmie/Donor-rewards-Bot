import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"
import { getDatabase } from "../utils/database.js"
import { logger } from "../utils/logger.js"
import { handleCategoryMenu, createPaginatedEmbeds } from "../utils/pagination.js"

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Show comprehensive help information")
  .addStringOption(option =>
    option
      .setName("type")
      .setDescription("Type of help to show")
      .setRequired(false)
      .addChoices(
        { name: "User Commands", value: "user" },
        { name: "Admin Commands", value: "admin" }
      )
  )

export async function execute(interaction) {
  try {
    const serverId = interaction.guildId
    const db = getDatabase(serverId)
    const type = interaction.options.getString("type")
    
    // Check if user has admin permissions
    const isAdmin = await checkAdminPermissions(interaction, db)
    
    // If specific type requested, show that directly
    if (type === "admin" && !isAdmin) {
      return interaction.reply({
        content: "❌ You don't have permission to view admin commands.",
        ephemeral: true
      })
    }
    
    if (type === "admin") {
      await showAdminHelp(interaction, db)
      return
    }
    
    if (type === "user") {
      await showUserHelp(interaction, db)
      return
    }

    // Create help menu
    const categories = [
      {
        id: "essential",
        name: "Essential",
        emoji: "🚀",
        description: "Core commands for donations and draws",
        generatePages: async () => await generateEssentialHelp(db)
      },
      {
        id: "user",
        name: "User Profile",
        emoji: "👤",
        description: "Profile, entries, and privacy commands",
        generatePages: async () => await generateUserHelp(db)
      },
      {
        id: "games",
        name: "Games & Fun",
        emoji: "🎮",
        description: "Lucky numbers, achievements, and leaderboards",
        generatePages: async () => await generateGamesHelp(db)
      },
      {
        id: "draws",
        name: "Draws",
        emoji: "🎁",
        description: "Draw information and leaderboards",
        generatePages: async () => await generateDrawsHelp(db)
      }
    ]

    // Add admin category if user has permissions
    if (isAdmin) {
      categories.push({
        id: "admin",
        name: "Admin",
        emoji: "⚙️",
        description: "Administrative commands and tools",
        generatePages: async () => await generateAdminHelp(db)
      })
    }

    const menuData = {
      title: "🆘 Help - Donor Rewards Bot",
      description: "Complete command reference for the Donor Rewards Bot\n\n💡 **Quick Start:** Use `/donate` to get started with donations!",
      color: "#00BCD4",
      categories
    }

    await handleCategoryMenu(interaction, menuData, "help")
  } catch (error) {
    logger.error("Error in help command:", error)
    await interaction.reply({
      content: "❌ An error occurred while fetching help information.",
      ephemeral: true
    })
  }
}

async function checkAdminPermissions(interaction, db) {
  const OWNER_ID = process.env.OWNER_ID || "659745190382141453"
  if (interaction.user.id === OWNER_ID) return true
  if (!db.config?.adminRoleId) return false

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id)
    return member.roles.cache.has(db.config.adminRoleId)
  } catch (error) {
    logger.error("Error checking admin permissions:", error)
    return false
  }
}

async function generateEssentialHelp(db) {
  const commands = [
    {
      name: "/donate",
      description: "Get donation instructions and accepted cryptocurrencies. Shows how to donate using tip.cc and which recipients are allowed."
    },
    {
      name: "/draws",
      description: "View active draws, leaderboards, and draw information. Interactive menu to explore all draw-related features."
    },
    {
      name: "/user entries",
      description: "Check your current draw entries across all active draws. Shows how many entries you have and potential rewards."
    },
    {
      name: "/user profile [target]",
      description: "View detailed donation profile including total donated, achievements, and donation history."
    },
    {
      name: "/price [symbol]",
      description: "Check current cryptocurrency prices. Supports all accepted donation currencies."
    },
    {
      name: "/ping",
      description: "Check bot status and response time. Useful for troubleshooting connection issues."
    }
  ]

  const pages = createPaginatedEmbeds(
    commands,
    4, // 4 commands per page
    (command) => ({
      name: `\`${command.name}\``,
      value: command.description,
      inline: false
    }),
    {
      title: "🚀 Essential Commands",
      description: "Core commands to get started with the Donor Rewards Bot",
      color: "#4CAF50",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateUserHelp(db) {
  const commands = [
    {
      name: "/user profile [target]",
      description: "View detailed donation profile including total donated, achievements earned, and donation history."
    },
    {
      name: "/user entries",
      description: "Check your current draw entries across all active draws. Shows entries and potential rewards."
    },
    {
      name: "/user donor_roles",
      description: "View donor role requirements and your progress towards the next role tier."
    },
    {
      name: "/user select_draw [draw_id]",
      description: "Choose which draw your future donations will count towards. Use 'auto' for automatic selection."
    },
    {
      name: "/user privacy [setting]",
      description: "Manage your privacy settings. Control who can see your donation history and profile."
    },
    {
      name: "/user achievements [target]",
      description: "View your achievements or another user's achievements with progress tracking."
    }
  ]

  const pages = createPaginatedEmbeds(
    commands,
    4, // 4 commands per page
    (command) => ({
      name: `\`${command.name}\``,
      value: command.description,
      inline: false
    }),
    {
      title: "👤 User Profile Commands",
      description: "Commands to manage your profile, entries, and privacy settings",
      color: "#2196F3",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateGamesHelp(db) {
  const commands = [
    {
      name: "/achievements",
      description: "Interactive achievement system. View available achievements, your progress, and earned achievements."
    },
    {
      name: "/leaderboard",
      description: "View various leaderboards including total donations, monthly, weekly, entries, achievements, and streaks."
    },
    {
      name: "/lucky",
      description: "Play the lucky number game. Choose your lucky numbers and win bonus entries if they match."
    },
    {
      name: "/milestones",
      description: "View donation milestones and rewards for reaching certain donation amounts."
    },
    {
      name: "/referral",
      description: "Manage your referrals. Earn bonus entries when people you refer make donations."
    }
  ]

  const pages = createPaginatedEmbeds(
    commands,
    4, // 4 commands per page
    (command) => ({
      name: `\`${command.name}\``,
      value: command.description,
      inline: false
    }),
    {
      title: "🎮 Games & Fun Commands",
      description: "Interactive games and activities to earn more entries and rewards",
      color: "#FF9800",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateDrawsHelp(db) {
  const commands = [
    {
      name: "/draws",
      description: "Interactive draw system. View active draws, leaderboards, completed draws, and draw IDs."
    },
    {
      name: "/draws [draw_id]",
      description: "Get detailed information about a specific draw by providing its ID."
    }
  ]

  const pages = createPaginatedEmbeds(
    commands,
    4, // 4 commands per page
    (command) => ({
      name: `\`${command.name}\``,
      value: command.description,
      inline: false
    }),
    {
      title: "🎁 Draw Commands",
      description: "Commands to view and interact with donation draws",
      color: "#9C27B0",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function generateAdminHelp(db) {
  const commands = [
    {
      name: "/admin setup",
      description: "Initial bot configuration wizard. Set up admin roles, channels, and basic settings."
    },
    {
      name: "/admin create_draw",
      description: "Create new donation draws with custom requirements, rewards, and entry limits."
    },
    {
      name: "/admin select_winner [draw_id]",
      description: "Select winners for completed draws using weighted random selection."
    },
    {
      name: "/admin assign_entries",
      description: "Manually assign entries to users or roles. Respects blacklist settings."
    },
    {
      name: "/admin analytics [type]",
      description: "View detailed server analytics including donations, users, and draw statistics."
    },
    {
      name: "/admin blacklist",
      description: "Manage blacklisted users. Add, remove, or list blacklisted users."
    },
    {
      name: "/admin add_recipient",
      description: "Add allowed donation recipients. Users can only donate to these recipients."
    },
    {
      name: "/admin features",
      description: "Toggle bot features on/off. Control which features are available to users."
    },
    {
      name: "/admin dashboard",
      description: "View comprehensive admin dashboard with server overview and statistics."
    },
    {
      name: "/admin fix_achievements",
      description: "Fix achievement assignments for all users. Useful after achievement updates."
    }
  ]

  const pages = createPaginatedEmbeds(
    commands,
    5, // 5 commands per page
    (command) => ({
      name: `\`${command.name}\``,
      value: command.description,
      inline: false
    }),
    {
      title: "⚙️ Admin Commands",
      description: "Administrative commands for bot management and configuration\n\n⚠️ **Note:** These commands require admin permissions.",
      color: "#F44336",
      useFields: true,
      footerText: "Powered By Aegisum Eco System"
    }
  )

  return pages
}

async function showUserHelp(interaction, db) {
  const pages = await generateUserHelp(db)
  await handlePagination(interaction, pages, "help_user")
}

async function showAdminHelp(interaction, db) {
  const pages = await generateAdminHelp(db)
  await handlePagination(interaction, pages, "help_admin")
}
