import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js"
import { getDatabase, saveDatabase } from "../utils/database.js"
import { logger } from "../utils/logger.js"

export const data = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Admin management commands")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("setup")
      .setDescription("Initial bot setup")
      .addRoleOption((option) =>
        option.setName("admin_role").setDescription("Admin role for the bot").setRequired(true),
      )
      .addChannelOption((option) =>
        option.setName("log_channel").setDescription("Channel for bot logs").setRequired(false),
      )
      .addChannelOption((option) =>
        option.setName("notification_channel").setDescription("Channel for notifications").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) => subcommand.setName("dashboard").setDescription("View admin dashboard"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("analytics")
      .setDescription("View detailed server analytics")
      .addStringOption((option) =>
        option
          .setName("type")
          .setDescription("Type of analytics to view")
          .setRequired(false)
          .addChoices(
            { name: "Overview", value: "overview" },
            { name: "Donations", value: "donations" },
            { name: "Draws", value: "draws" },
            { name: "Users", value: "users" },
          ),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create_draw")
      .setDescription("Create a new donation draw")
      .addStringOption((option) => option.setName("name").setDescription("Name of the draw").setRequired(true))
      .addStringOption((option) => option.setName("reward").setDescription("Reward for the winner").setRequired(true))
      .addNumberOption((option) =>
        option.setName("min_amount").setDescription("Minimum donation amount in USD").setRequired(true),
      )
      .addIntegerOption((option) =>
        option.setName("max_entries").setDescription("Maximum number of entries").setRequired(true),
      )
      .addNumberOption((option) =>
        option.setName("max_amount").setDescription("Maximum donation amount in USD").setRequired(false),
      )
      .addBooleanOption((option) => option.setName("vip_only").setDescription("VIP members only").setRequired(false))
      .addBooleanOption((option) =>
        option.setName("manual_entries").setDescription("Manual entry assignment only").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("select_winner")
      .setDescription("Select a winner for a draw")
      .addStringOption((option) => option.setName("draw_id").setDescription("ID of the draw").setRequired(true)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("assign_entries")
      .setDescription("Manually assign entries to users")
      .addStringOption((option) => option.setName("draw_id").setDescription("ID of the draw").setRequired(true))
      .addIntegerOption((option) =>
        option.setName("entries").setDescription("Number of entries to assign").setRequired(true),
      )
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for manual assignment").setRequired(false),
      )
      .addUserOption((option) => option.setName("user").setDescription("Specific user (optional)").setRequired(false))
      .addRoleOption((option) =>
        option.setName("role").setDescription("Assign to all users with this role (optional)").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add_recipient")
      .setDescription("Add a donation recipient")
      .addStringOption((option) =>
        option.setName("recipient").setDescription("Username or identifier of the recipient").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove_recipient")
      .setDescription("Remove a donation recipient")
      .addStringOption((option) =>
        option.setName("recipient").setDescription("Username or identifier of the recipient").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("edit_draw")
      .setDescription("Edit an existing draw")
      .addStringOption((option) => option.setName("draw_id").setDescription("ID of the draw to edit").setRequired(true))
      .addStringOption((option) => option.setName("name").setDescription("New name for the draw").setRequired(false))
      .addStringOption((option) => option.setName("reward").setDescription("New reward").setRequired(false))
      .addNumberOption((option) => option.setName("min_amount").setDescription("New minimum amount").setRequired(false))
      .addNumberOption((option) => option.setName("max_amount").setDescription("New maximum amount").setRequired(false))
      .addIntegerOption((option) => option.setName("max_entries").setDescription("New max entries").setRequired(false))
      .addBooleanOption((option) =>
        option.setName("active").setDescription("Set draw active status").setRequired(false),
      )
      .addBooleanOption((option) =>
        option.setName("manual_entries").setDescription("Manual entry assignment only").setRequired(false),
      )
      .addBooleanOption((option) => option.setName("vip_only").setDescription("VIP members only").setRequired(false)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("blacklist")
      .setDescription("Manage blacklisted users")
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("Action to perform")
          .setRequired(true)
          .addChoices(
            { name: "Add User", value: "add_user" },
            { name: "Remove User", value: "remove_user" },
            { name: "List", value: "list" },
          ),
      )
      .addUserOption((option) =>
        option.setName("user").setDescription("User to blacklist/unblacklist").setRequired(false),
      )
      .addStringOption((option) => option.setName("reason").setDescription("Reason for blacklist").setRequired(false)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("features")
      .setDescription("Toggle bot features")
      .addStringOption((option) =>
        option
          .setName("feature")
          .setDescription("Feature to toggle")
          .setRequired(true)
          .addChoices(
            { name: "VIP Draws", value: "vipDraws" },
            { name: "Achievement System", value: "achievementSystem" },
            { name: "Leaderboards", value: "seasonalLeaderboards" },
            { name: "Draw Notifications", value: "drawNotifications" },
            { name: "Privacy Controls", value: "anonymousMode" },
            { name: "Automated Draws", value: "automatedDraws" },
            { name: "View All", value: "view_all" },
          ),
      )
      .addBooleanOption((option) =>
        option.setName("enabled").setDescription("Enable or disable the feature").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("fix_achievements")
      .setDescription("Fix achievement assignments for all users")
  )

export async function execute(interaction) {
  try {
    const serverId = interaction.guildId
    const db = getDatabase(serverId)
    const subcommand = interaction.options.getSubcommand()

    // Check admin permissions for all subcommands
    const isAdmin = await checkAdminPermissions(interaction, db)
    if (!isAdmin) {
      return interaction.reply({
        content: "❌ You do not have permission to use admin commands.",
        flags: MessageFlags.Ephemeral,
      })
    }

    logger.info(`Admin command executed: ${subcommand} by ${interaction.user.tag}`)

    switch (subcommand) {
      case "setup":
        await handleSetup(interaction, db)
        break
      case "dashboard":
        await handleDashboard(interaction, db)
        break
      case "analytics":
        await handleAnalytics(interaction, db)
        break
      case "create_draw":
        await handleCreateDraw(interaction, db)
        break
      case "select_winner":
        await handleSelectWinner(interaction, db)
        break
      case "assign_entries":
        await handleAssignEntries(interaction, db)
        break
      case "add_recipient":
        await handleAddRecipient(interaction, db)
        break
      case "remove_recipient":
        await handleRemoveRecipient(interaction, db)
        break
      case "edit_draw":
        await handleEditDraw(interaction, db)
        break
      case "blacklist":
        await handleBlacklist(interaction, db)
        break
      case "features":
        await handleFeatures(interaction, db)
        break
      case "fix_achievements":
        await handleFixAchievements(interaction, db)
        break
      default:
        await handleDashboard(interaction, db)
        break
    }
  } catch (error) {
    logger.error("Error in admin command:", error)

    const errorMessage = {
      content: "❌ An error occurred while executing the admin command.",
      ephemeral: true
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

async function handleSetup(interaction, db) {
  const adminRole = interaction.options.getRole("admin_role")
  const logChannel = interaction.options.getChannel("log_channel")
  const notificationChannel = interaction.options.getChannel("notification_channel")

  // Check permissions
  const OWNER_ID = process.env.OWNER_ID || "659745190382141453"
  if (interaction.user.id !== OWNER_ID && !interaction.member.permissions.has("Administrator")) {
    return interaction.reply({
      content: "❌ You need Administrator permissions to run setup.",
      flags: MessageFlags.Ephemeral,
    })
  }

  // Update configuration
  if (!db.config) db.config = {}
  db.config.adminRoleId = adminRole.id
  if (logChannel) db.config.logChannelId = logChannel.id
  if (notificationChannel) db.config.notificationChannelId = notificationChannel.id

  saveDatabase(interaction.guildId, db)

  const embed = new EmbedBuilder()
    .setTitle("✅ Bot Setup Complete")
    .setDescription("The bot has been successfully configured!")
    .setColor("#4CAF50")
    .addFields(
      { name: "👑 Admin Role", value: `<@&${adminRole.id}>`, inline: true },
      { name: "📝 Log Channel", value: logChannel ? `<#${logChannel.id}>` : "Not set", inline: true },
      {
        name: "🔔 Notification Channel",
        value: notificationChannel ? `<#${notificationChannel.id}>` : "Not set",
        inline: true,
      },
    )
    .addFields({
      name: "🎯 Next Steps",
      value: [
        "• Use `/admin create_draw` to create your first draw",
        "• Use `/admin features` to configure features",
        "• Use `/admin add_recipient` to add donation recipients",
        "• Users can now use `/donate` to get started!",
      ].join("\n"),
      inline: false,
    })
    .setFooter({ text: "Powered By Aegisum Eco System" })

  await interaction.reply({ embeds: [embed] })
  logger.info(`Bot setup completed for server ${interaction.guildId} by ${interaction.user.tag}`)
}

async function handleDashboard(interaction, db) {
  const activeDraws = Object.values(db.donationDraws || {}).filter((draw) => draw.active).length
  const totalUsers = Object.keys(db.users || {}).length
  const totalDonations = Object.values(db.users || {}).reduce((sum, user) => sum + (user.totalDonated || 0), 0)

  const embed = new EmbedBuilder()
    .setTitle("⚙️ Admin Dashboard")
    .setDescription("Server management overview")
    .setColor(db.config?.theme?.primary || "#4CAF50")
    .addFields(
      { name: "🎁 Active Draws", value: activeDraws.toString(), inline: true },
      { name: "👥 Total Users", value: totalUsers.toString(), inline: true },
      { name: "💰 Total Donations", value: `$${totalDonations.toFixed(2)}`, inline: true },
    )
    .addFields({
      name: "🛠️ Quick Actions",
      value: [
        "`/admin setup` - Configure bot settings",
        "`/admin create_draw` - Create new draw",
        "`/admin analytics` - View detailed analytics",
        "`/admin features` - Toggle features",
        "`/admin add_recipient` - Add donation recipient",
      ].join("\n"),
      inline: false,
    })
    .setFooter({ text: "Powered By Aegisum Eco System" })
    .setTimestamp()

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
}

async function handleAnalytics(interaction, db) {
  const type = interaction.options.getString("type") || "overview"
  const users = db.users || {}
  const draws = db.donationDraws || {}

  const embed = new EmbedBuilder().setTitle("📊 Server Analytics").setColor(db.config?.theme?.info || "#00BCD4")

  switch (type) {
    case "overview":
      const totalDonations = Object.values(users).reduce((sum, user) => sum + (user.totalDonated || 0), 0)
      const avgDonation = Object.keys(users).length > 0 ? totalDonations / Object.keys(users).length : 0

      embed.addFields(
        { name: "💰 Total Donations", value: `$${totalDonations.toFixed(2)}`, inline: true },
        { name: "📈 Average Donation", value: `$${avgDonation.toFixed(2)}`, inline: true },
        { name: "🎁 Total Draws", value: Object.keys(draws).length.toString(), inline: true },
        {
          name: "✅ Active Draws",
          value: Object.values(draws)
            .filter((d) => d.active)
            .length.toString(),
          inline: true,
        },
        { name: "👥 Active Users", value: Object.keys(users).length.toString(), inline: true },
      )
      break

    case "donations":
      const donations = Object.values(users).flatMap((user) => user.donations || [])
      const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0)
      const avgDonationAmount = donations.length > 0 ? totalAmount / donations.length : 0

      embed.addFields(
        { name: "📊 Total Donations", value: donations.length.toString(), inline: true },
        { name: "💵 Total Amount", value: `$${totalAmount.toFixed(2)}`, inline: true },
        { name: "📈 Average Donation", value: `$${avgDonationAmount.toFixed(2)}`, inline: true },
      )
      break

    case "draws":
      const activeDraws = Object.values(draws).filter((d) => d.active)
      const completedDraws = Object.values(draws).filter((d) => !d.active && d.winner)
      const totalEntries = Object.values(draws).reduce(
        (sum, draw) => sum + Object.values(draw.entries || {}).reduce((s, c) => s + c, 0),
        0,
      )

      embed.addFields(
        { name: "📊 Total Draws", value: Object.keys(draws).length.toString(), inline: true },
        { name: "✅ Active Draws", value: activeDraws.length.toString(), inline: true },
        { name: "🏆 Completed Draws", value: completedDraws.length.toString(), inline: true },
        { name: "🎟️ Total Entries", value: totalEntries.toString(), inline: true },
      )
      break

    case "users":
      const usersWithPrivacy = Object.values(users).filter((user) => user.privacyEnabled).length
      const totalWins = Object.values(users).reduce((sum, user) => sum + (user.wins || 0), 0)

      embed.addFields(
        { name: "📊 Total Users", value: Object.keys(users).length.toString(), inline: true },
        { name: "🏆 Total Wins", value: totalWins.toString(), inline: true },
        { name: "🔒 Privacy Enabled", value: `${usersWithPrivacy}/${Object.keys(users).length}`, inline: true },
      )
      break
  }

  embed.setFooter({ text: "Powered By Aegisum Eco System" }).setTimestamp()
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
}

async function handleCreateDraw(interaction, db) {
  const name = interaction.options.getString("name")
  const reward = interaction.options.getString("reward")
  const minAmount = interaction.options.getNumber("min_amount")
  const maxAmount = interaction.options.getNumber("max_amount") || 1000000
  const maxEntries = interaction.options.getInteger("max_entries")
  const vipOnly = interaction.options.getBoolean("vip_only") || false
  const manualEntries = interaction.options.getBoolean("manual_entries") || false

  const drawId = `draw_${Date.now()}`

  const newDraw = {
    id: drawId,
    name,
    reward,
    minAmount,
    maxAmount,
    maxEntries,
    vipOnly,
    manualEntriesOnly: manualEntries,
    active: true,
    entries: {},
    createdBy: interaction.user.id,
    createdAt: Date.now(),
  }

  if (!db.donationDraws) db.donationDraws = {}
  db.donationDraws[drawId] = newDraw
  saveDatabase(interaction.guildId, db)

  const embed = new EmbedBuilder()
    .setTitle("✅ Draw Created Successfully")
    .setDescription(`**${name}** has been created!`)
    .setColor(db.config?.theme?.success || "#4CAF50")
    .addFields(
      { name: "🆔 Draw ID", value: `\`${drawId}\``, inline: true },
      { name: "🏆 Reward", value: reward, inline: true },
      { name: "💰 Amount Range", value: `$${minAmount} - $${maxAmount}`, inline: true },
      { name: "🎟️ Max Entries", value: maxEntries.toString(), inline: true },
      { name: "⭐ VIP Only", value: vipOnly ? "Yes" : "No", inline: true },
      { name: "🔒 Manual Entries", value: manualEntries ? "Yes" : "No", inline: true },
    )
    .setFooter({ text: "Powered By Aegisum Eco System" })

  await interaction.reply({ embeds: [embed] })
  logger.info(`Draw created: ${drawId} by ${interaction.user.tag}`)
}

async function handleSelectWinner(interaction, db) {
  const drawId = interaction.options.getString("draw_id")
  const draw = db.donationDraws?.[drawId]

  if (!draw) {
    return interaction.reply({ content: "❌ Draw not found.", flags: MessageFlags.Ephemeral })
  }

  if (!draw.active) {
    return interaction.reply({ content: "❌ This draw is not active.", flags: MessageFlags.Ephemeral })
  }

  const entries = draw.entries || {}
  const totalEntries = Object.values(entries).reduce((sum, count) => sum + count, 0)

  if (totalEntries === 0) {
    return interaction.reply({ content: "❌ No entries found for this draw.", flags: MessageFlags.Ephemeral })
  }

  // Create weighted array for selection
  const weightedEntries = []
  for (const [userId, entryCount] of Object.entries(entries)) {
    for (let i = 0; i < entryCount; i++) {
      weightedEntries.push(userId)
    }
  }

  // Select random winner
  const randomIndex = Math.floor(Math.random() * weightedEntries.length)
  const winnerId = weightedEntries[randomIndex]

  // Update database
  draw.active = false
  draw.winner = winnerId
  draw.winnerSelectedAt = Date.now()
  draw.selectedBy = interaction.user.id

  // Update user wins
  if (!db.users) db.users = {}
  if (!db.users[winnerId]) {
    db.users[winnerId] = {
      totalDonated: 0,
      entries: {},
      donations: [],
      achievements: [],
      privacyEnabled: false,
      wins: 0,
    }
  }
  db.users[winnerId].wins = (db.users[winnerId].wins || 0) + 1

  saveDatabase(interaction.guildId, db)

  const embed = new EmbedBuilder()
    .setTitle("🎉 Winner Selected!")
    .setDescription(`**${draw.name}** has a winner!`)
    .setColor(db.config?.theme?.success || "#4CAF50")
    .addFields(
      { name: "🏆 Winner", value: `<@${winnerId}>`, inline: true },
      { name: "🎁 Reward", value: draw.reward, inline: true },
      { name: "🎟️ Total Entries", value: totalEntries.toString(), inline: true },
      {
        name: "📊 Winner's Entries",
        value: `${entries[winnerId]} (${((entries[winnerId] / totalEntries) * 100).toFixed(2)}% chance)`,
        inline: true,
      },
    )
    .setFooter({ text: "Powered By Aegisum Eco System" })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
  logger.info(`Winner selected for draw ${drawId}: ${winnerId}`)
}

async function handleAssignEntries(interaction, db) {
  const user = interaction.options.getUser("user")
  const role = interaction.options.getRole("role")
  const drawId = interaction.options.getString("draw_id")
  const entries = interaction.options.getInteger("entries")
  const reason = interaction.options.getString("reason") || "Manual assignment"

  const draw = db.donationDraws?.[drawId]
  if (!draw) {
    return interaction.reply({ content: "❌ Draw not found.", flags: MessageFlags.Ephemeral })
  }

  if (!draw.active) {
    return interaction.reply({
      content: "❌ Cannot assign entries to an inactive draw.",
      flags: MessageFlags.Ephemeral,
    })
  }

  if (entries <= 0) {
    return interaction.reply({ content: "❌ Number of entries must be positive.", flags: MessageFlags.Ephemeral })
  }

  if (!user && !role) {
    return interaction.reply({ content: "❌ You must specify either a user or a role.", flags: MessageFlags.Ephemeral })
  }

  let targetUsers = []

  if (user) {
    targetUsers = [user]
  } else if (role) {
    // Get all members with the specified role
    try {
      const members = await interaction.guild.members.fetch()
      targetUsers = members.filter((member) => member.roles.cache.has(role.id)).map((member) => member.user)
    } catch (error) {
      logger.error("Error fetching members:", error)
      return interaction.reply({ content: "❌ Error fetching server members.", flags: MessageFlags.Ephemeral })
    }
  }

  if (targetUsers.length === 0) {
    return interaction.reply({ content: "❌ No users found to assign entries to.", flags: MessageFlags.Ephemeral })
  }

  // Check if draw has space
  const currentEntries = Object.values(draw.entries || {}).reduce((sum, count) => sum + count, 0)
  const totalNewEntries = targetUsers.length * entries

  if (currentEntries + totalNewEntries > draw.maxEntries) {
    return interaction.reply({
      content: `❌ Cannot assign ${totalNewEntries} entries. Draw only has ${draw.maxEntries - currentEntries} slots remaining.`,
      flags: MessageFlags.Ephemeral,
    })
  }

  // Initialize database structures
  if (!db.users) db.users = {}
  if (!draw.entries) draw.entries = {}

  let assignedCount = 0

  // Assign entries to each target user
  for (const targetUser of targetUsers) {
    // Check if user is blacklisted
    const isBlacklisted = db.config?.globalBlacklist?.users?.some(entry => entry.id === targetUser.id)
    if (isBlacklisted) {
      logger.info(`Skipping blacklisted user ${targetUser.id} (${targetUser.username}) for entry assignment`)
      continue
    }

    // Initialize user data
    if (!db.users[targetUser.id]) {
      db.users[targetUser.id] = {
        totalDonated: 0,
        entries: {},
        donations: [],
        achievements: [],
        privacyEnabled: false,
        wins: 0,
      }
    }

    // Assign entries
    if (!draw.entries[targetUser.id]) draw.entries[targetUser.id] = 0
    if (!db.users[targetUser.id].entries) db.users[targetUser.id].entries = {}
    if (!db.users[targetUser.id].entries[drawId]) db.users[targetUser.id].entries[drawId] = 0

    draw.entries[targetUser.id] += entries
    db.users[targetUser.id].entries[drawId] += entries
    assignedCount++
  }

  saveDatabase(interaction.guildId, db)

  const embed = new EmbedBuilder()
    .setTitle("✅ Entries Assigned")
    .setDescription(`Successfully assigned **${entries}** entries each to **${assignedCount}** user(s)`)
    .setColor(db.config?.theme?.success || "#4CAF50")
    .addFields(
      { name: "🎁 Draw", value: draw.name, inline: true },
      { name: "🎟️ Entries Per User", value: entries.toString(), inline: true },
      { name: "👥 Users Affected", value: assignedCount.toString(), inline: true },
      { name: "📊 Total Entries Added", value: totalNewEntries.toString(), inline: true },
      { name: "📝 Reason", value: reason, inline: false },
    )

  if (role) {
    embed.addFields({ name: "🏷️ Role", value: `<@&${role.id}>`, inline: true })
  } else if (user) {
    embed.addFields({ name: "👤 User", value: `<@${user.id}>`, inline: true })
  }

  embed.setFooter({ text: "Powered By Aegisum Eco System" })

  await interaction.reply({ embeds: [embed] })
  logger.info(
    `Manual entries assigned: ${entries} each to ${assignedCount} users for draw ${drawId} by ${interaction.user.tag}`,
  )
}

async function handleAddRecipient(interaction, db) {
  const recipient = interaction.options.getString("recipient")

  if (!db.config) db.config = {}
  if (!db.config.allowedRecipients) db.config.allowedRecipients = []

  if (db.config.allowedRecipients.includes(recipient)) {
    return interaction.reply({
      content: `❌ **${recipient}** is already in the allowed recipients list.`,
      flags: MessageFlags.Ephemeral,
    })
  }

  db.config.allowedRecipients.push(recipient)
  saveDatabase(interaction.guildId, db)

  const embed = new EmbedBuilder()
    .setTitle("✅ Recipient Added")
    .setDescription(`**${recipient}** has been added to the allowed recipients list.`)
    .setColor(db.config?.theme?.success || "#4CAF50")
    .addFields({
      name: "📋 Current Recipients",
      value: db.config.allowedRecipients.map((r) => `• ${r}`).join("\n") || "None",
      inline: false,
    })
    .setFooter({ text: "Powered By Aegisum Eco System" })

  await interaction.reply({ embeds: [embed] })
  logger.info(`Recipient added: ${recipient} by ${interaction.user.tag}`)
}

async function handleRemoveRecipient(interaction, db) {
  const recipient = interaction.options.getString("recipient")

  if (!db.config?.allowedRecipients) {
    return interaction.reply({ content: "❌ No recipients configured.", flags: MessageFlags.Ephemeral })
  }

  const index = db.config.allowedRecipients.indexOf(recipient)
  if (index === -1) {
    return interaction.reply({
      content: `❌ **${recipient}** is not in the allowed recipients list.`,
      flags: MessageFlags.Ephemeral,
    })
  }

  db.config.allowedRecipients.splice(index, 1)
  saveDatabase(interaction.guildId, db)

  const embed = new EmbedBuilder()
    .setTitle("✅ Recipient Removed")
    .setDescription(`**${recipient}** has been removed from the allowed recipients list.`)
    .setColor(db.config?.theme?.success || "#4CAF50")
    .addFields({
      name: "📋 Current Recipients",
      value: db.config.allowedRecipients.map((r) => `• ${r}`).join("\n") || "None",
      inline: false,
    })
    .setFooter({ text: "Powered By Aegisum Eco System" })

  await interaction.reply({ embeds: [embed] })
  logger.info(`Recipient removed: ${recipient} by ${interaction.user.tag}`)
}

async function handleEditDraw(interaction, db) {
  const drawId = interaction.options.getString("draw_id")
  const draw = db.donationDraws?.[drawId]

  if (!draw) {
    return interaction.reply({ content: "❌ Draw not found.", flags: MessageFlags.Ephemeral })
  }

  const newName = interaction.options.getString("name")
  const newReward = interaction.options.getString("reward")
  const newMinAmount = interaction.options.getNumber("min_amount")
  const newMaxAmount = interaction.options.getNumber("max_amount")
  const newMaxEntries = interaction.options.getInteger("max_entries")
  const newActive = interaction.options.getBoolean("active")
  const newManualEntries = interaction.options.getBoolean("manual_entries")
  const newVipOnly = interaction.options.getBoolean("vip_only")

  if (newName) draw.name = newName
  if (newReward) draw.reward = newReward
  if (newMinAmount !== null) draw.minAmount = newMinAmount
  if (newMaxAmount !== null) draw.maxAmount = newMaxAmount
  if (newMaxEntries !== null) draw.maxEntries = newMaxEntries
  if (newActive !== null) draw.active = newActive
  if (newManualEntries !== null) draw.manualEntriesOnly = newManualEntries
  if (newVipOnly !== null) draw.vipOnly = newVipOnly

  draw.lastModified = Date.now()
  draw.modifiedBy = interaction.user.id

  saveDatabase(interaction.guildId, db)

  const embed = new EmbedBuilder()
    .setTitle("✅ Draw Updated")
    .setDescription(`**${draw.name}** has been updated successfully!`)
    .setColor(db.config?.theme?.success || "#4CAF50")
    .addFields(
      { name: "🆔 Draw ID", value: `\`${drawId}\``, inline: true },
      { name: "📊 Current Status", value: draw.active ? "🟢 Active" : "🔴 Inactive", inline: true },
      { name: "🔒 Manual Entries", value: draw.manualEntriesOnly ? "Yes" : "No", inline: true },
      { name: "⭐ VIP Only", value: draw.vipOnly ? "Yes" : "No", inline: true },
    )
    .setFooter({ text: "Powered By Aegisum Eco System" })

  await interaction.reply({ embeds: [embed] })
  logger.info(`Draw edited: ${drawId} by ${interaction.user.tag}`)
}

async function handleBlacklist(interaction, db) {
  const action = interaction.options.getString("action")
  const user = interaction.options.getUser("user")
  const reason = interaction.options.getString("reason") || "No reason provided"

  if (!db.config) db.config = {}
  if (!db.config.globalBlacklist) {
    db.config.globalBlacklist = { users: [], roles: [] }
  }

  const embed = new EmbedBuilder()
    .setColor(db.config?.theme?.warning || "#FFC107")
    .setFooter({ text: "Powered By Aegisum Eco System" })

  switch (action) {
    case "add_user":
      if (!user) {
        return interaction.reply({ content: "❌ Please specify a user to blacklist.", flags: MessageFlags.Ephemeral })
      }

      if (db.config.globalBlacklist.users.some((entry) => entry.id === user.id)) {
        return interaction.reply({
          content: `❌ **${user.username}** is already blacklisted.`,
          flags: MessageFlags.Ephemeral,
        })
      }

      db.config.globalBlacklist.users.push({
        id: user.id,
        username: user.username,
        reason,
        addedBy: interaction.user.id,
        addedAt: Date.now(),
      })

      embed
        .setTitle("🚫 User Blacklisted")
        .setDescription(`**${user.username}** has been added to the blacklist.`)
        .setColor(db.config?.theme?.error || "#F44336")
        .addFields({ name: "📝 Reason", value: reason, inline: false })
      break

    case "remove_user":
      if (!user) {
        return interaction.reply({ content: "❌ Please specify a user to unblacklist.", flags: MessageFlags.Ephemeral })
      }

      const userIndex = db.config.globalBlacklist.users.findIndex((entry) => entry.id === user.id)
      if (userIndex === -1) {
        return interaction.reply({
          content: `❌ **${user.username}** is not blacklisted.`,
          flags: MessageFlags.Ephemeral,
        })
      }

      db.config.globalBlacklist.users.splice(userIndex, 1)

      embed
        .setTitle("✅ User Unblacklisted")
        .setDescription(`**${user.username}** has been removed from the blacklist.`)
        .setColor(db.config?.theme?.success || "#4CAF50")
      break

    case "list":
      const blacklistedUsers = db.config.globalBlacklist.users || []

      embed.setTitle("🚫 Blacklist")

      if (blacklistedUsers.length === 0) {
        embed.setDescription("No users are currently blacklisted.")
      } else {
        const userList = blacklistedUsers
          .slice(0, 10)
          .map((entry) => `• <@${entry.id}> - ${entry.reason}`)
          .join("\n")

        embed.addFields({
          name: `👥 Blacklisted Users (${blacklistedUsers.length})`,
          value: userList,
          inline: false,
        })
      }
      break
  }

  saveDatabase(interaction.guildId, db)
  await interaction.reply({ embeds: [embed] })
  logger.info(`Blacklist action: ${action} by ${interaction.user.tag}`)
}

async function handleFeatures(interaction, db) {
  const feature = interaction.options.getString("feature")
  const enabled = interaction.options.getBoolean("enabled")

  if (!db.config) db.config = {}
  if (!db.config.featureToggles) {
    db.config.featureToggles = {
      vipDraws: true,
      achievementSystem: true,
      seasonalLeaderboards: true,
      drawNotifications: true,
      anonymousMode: true,
      automatedDraws: true,
    }
  }

  if (feature === "view_all") {
    const embed = new EmbedBuilder()
      .setTitle("⚙️ Feature Status")
      .setDescription("Current status of all bot features:")
      .setColor(db.config?.theme?.info || "#00BCD4")

    const featureList = Object.entries(db.config.featureToggles)
      .map(([key, enabled]) => {
        const status = enabled ? "🟢" : "🔴"
        const name = getFeatureName(key)
        return `${status} **${name}**`
      })
      .join("\n")

    embed.addFields({
      name: "📊 All Features",
      value: featureList || "No features configured",
      inline: false,
    })

    embed.setFooter({ text: "Powered By Aegisum Eco System" })
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
  }

  if (enabled === null) {
    const currentStatus = db.config.featureToggles[feature] ? "🟢 Enabled" : "🔴 Disabled"
    return interaction.reply({
      content: `**${getFeatureName(feature)}** is currently: ${currentStatus}`,
      flags: MessageFlags.Ephemeral,
    })
  }

  const oldStatus = db.config.featureToggles[feature]
  db.config.featureToggles[feature] = enabled
  saveDatabase(interaction.guildId, db)

  const embed = new EmbedBuilder()
    .setTitle("⚙️ Feature Updated")
    .setDescription(`**${getFeatureName(feature)}** has been ${enabled ? "enabled" : "disabled"}!`)
    .setColor(enabled ? db.config?.theme?.success || "#4CAF50" : db.config?.theme?.error || "#F44336")
    .addFields({
      name: "📊 Status Change",
      value: `${oldStatus ? "🟢 Enabled" : "🔴 Disabled"} → ${enabled ? "🟢 Enabled" : "🔴 Disabled"}`,
      inline: true,
    })
    .setFooter({ text: "Powered By Aegisum Eco System" })

  await interaction.reply({ embeds: [embed] })
  logger.info(`Feature toggled: ${feature} = ${enabled} by ${interaction.user.tag}`)
}

function getFeatureName(key) {
  const names = {
    vipDraws: "VIP Draws",
    achievementSystem: "Achievement System",
    seasonalLeaderboards: "Seasonal Leaderboards",
    drawNotifications: "Draw Notifications",
    anonymousMode: "Privacy Controls",
    automatedDraws: "Automated Draws",
  }
  return names[key] || key
}

async function handleFixAchievements(interaction, db) {
  try {
    // Defer reply as this might take some time
    await interaction.deferReply()
    
    // Get all users with donation history
    const users = db.users || {}
    const userIds = Object.keys(users)
    
    // Track achievements assigned
    let achievementsAssigned = 0
    
    // Define achievements
    const achievements = [
      {
        id: "first_steps",
        name: "First Steps",
        description: "Made your first donation",
        check: (user) => {
          logger.info(`First Steps check: donations=${user.donations?.length || 0}`);
          return user.donations && user.donations.length > 0;
        },
      },
      {
        id: "generous_donor",
        name: "Generous Donor",
        description: "Donated at least $100",
        check: (user) => {
          logger.info(`Generous Donor check: totalDonated=${user.totalDonated || 0}`);
          return user.totalDonated >= 100;
        },
      },
      {
        id: "big_spender",
        name: "Big Spender",
        description: "Donated at least $500",
        check: (user) => {
          logger.info(`Big Spender check: totalDonated=${user.totalDonated || 0}`);
          return user.totalDonated >= 500;
        },
      },
      {
        id: "whale",
        name: "Whale",
        description: "Donated at least $1,000",
        check: (user) => {
          logger.info(`Whale check: totalDonated=${user.totalDonated || 0}`);
          return user.totalDonated >= 1000;
        },
      },
      {
        id: "lucky_winner",
        name: "Lucky Winner",
        description: "Won a donation draw",
        check: (user) => {
          logger.info(`Lucky Winner check: wins=${user.wins || 0}`);
          return user.wins && user.wins > 0;
        },
      },
      {
        id: "streak_master",
        name: "Streak Master",
        description: "Maintained a 7-day donation streak",
        check: (user) => {
          logger.info(`Streak Master check: longest=${user.streak?.longest || 0}`);
          return user.streak && user.streak.longest >= 7;
        },
      }
    ]
    
    // Process each user
    for (const userId of userIds) {
      const user = users[userId]
      
      // Skip users with no donations
      if (!user.donations || user.donations.length === 0) {
        logger.info(`Skipping user ${userId} - No donations`)
        continue
      }
      
      // Initialize achievements array if it doesn't exist
      if (!user.achievements) {
        user.achievements = []
      }
      
      // Initialize streak data if it doesn't exist
      if (!user.streak) {
        user.streak = {
          current: 0,
          longest: 0,
          lastDonation: 0
        }
      }
      
      // Debug log user data
      logger.info(`Processing user ${userId}:`)
      logger.info(`  - Total donated: $${user.totalDonated ? user.totalDonated.toFixed(2) : 0}`)
      logger.info(`  - Donations count: ${user.donations ? user.donations.length : 0}`)
      logger.info(`  - Wins: ${user.wins || 0}`)
      logger.info(`  - Longest streak: ${user.streak?.longest || 0}`)
      logger.info(`  - Current achievements: ${user.achievements.join(', ') || 'None'}`)
      
      // Check each achievement
      for (const achievement of achievements) {
        // Skip if already earned
        if (user.achievements.includes(achievement.id)) {
          logger.info(`User ${userId} already has achievement: ${achievement.name}`)
          continue
        }
        
        // Check if achievement should be awarded
        const qualifies = achievement.check(user)
        logger.info(`Achievement check for ${achievement.id}: ${qualifies ? 'QUALIFIES' : 'DOES NOT QUALIFY'}`)
        
        if (qualifies) {
          user.achievements.push(achievement.id)
          achievementsAssigned++
          logger.info(`🏆 Fixed achievement: ${achievement.name} for user ${userId}`)
        } else {
          logger.info(`User ${userId} does not qualify for achievement: ${achievement.name}`)
          // Log detailed info for debugging
          if (achievement.id === "first_steps") {
            logger.info(`  - Donations: ${user.donations ? user.donations.length : 0}`)
          } else if (achievement.id === "generous_donor" || achievement.id === "big_spender" || achievement.id === "whale") {
            logger.info(`  - Total donated: $${user.totalDonated ? user.totalDonated.toFixed(2) : 0}`)
          } else if (achievement.id === "lucky_winner") {
            logger.info(`  - Wins: ${user.wins || 0}`)
          } else if (achievement.id === "streak_master") {
            logger.info(`  - Longest streak: ${user.streak?.longest || 0}`)
          }
        }
      }
    }
    
    // Save database
    saveDatabase(interaction.guildId, db)
    
    // Send response
    const embed = new EmbedBuilder()
      .setTitle("Achievement Fix")
      .setDescription("Processed users with donation history")
      .setColor(db.config?.theme?.success || "#4CAF50")
      .addFields(
        { name: "Users Processed", value: userIds.length.toString(), inline: true },
        { name: "Achievements Fixed", value: achievementsAssigned.toString(), inline: true }
      )
      .setFooter({ text: "Powered By Aegisum Eco System" })
      .setTimestamp()
    
    await interaction.editReply({ embeds: [embed] })
    logger.info(`Achievement fix completed: ${achievementsAssigned} achievements assigned to ${userIds.length} users by ${interaction.user.tag}`)
  } catch (error) {
    logger.error("Error fixing achievements:", error)
    await interaction.editReply({
      content: "❌ An error occurred while fixing achievements.",
      embeds: []
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
