import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } from "discord.js"
import { logger } from "./logger.js"

/**
 * Create pagination buttons
 * @param {number} currentPage - Current page number (0-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {string} customId - Custom ID prefix for buttons
 * @returns {ActionRowBuilder} - Action row with pagination buttons
 */
export function createPaginationButtons(currentPage, totalPages, customId) {
  const row = new ActionRowBuilder()

  // Previous button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${customId}_prev`)
      .setLabel("◀️ Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0)
  )

  // Page indicator
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${customId}_page`)
      .setLabel(`${currentPage + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true)
  )

  // Next button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${customId}_next`)
      .setLabel("Next ▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1)
  )

  return row
}

/**
 * Create category selection buttons
 * @param {Array} categories - Array of category objects with {id, name, emoji}
 * @param {string} customId - Custom ID prefix for buttons
 * @returns {ActionRowBuilder[]} - Array of action rows with category buttons
 */
export function createCategoryButtons(categories, customId) {
  const rows = []
  const buttonsPerRow = 5
  
  for (let i = 0; i < categories.length; i += buttonsPerRow) {
    const row = new ActionRowBuilder()
    const categorySlice = categories.slice(i, i + buttonsPerRow)
    
    for (const category of categorySlice) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${customId}_${category.id}`)
          .setLabel(`${category.emoji} ${category.name}`)
          .setStyle(ButtonStyle.Primary)
      )
    }
    
    rows.push(row)
  }
  
  return rows
}

/**
 * Create action buttons for interactive settings
 * @param {Array} actions - Array of action objects with {id, label, style, emoji}
 * @param {string} customId - Custom ID prefix for buttons
 * @returns {ActionRowBuilder} - Action row with action buttons
 */
export function createActionButtons(actions, customId) {
  const row = new ActionRowBuilder()

  for (const action of actions) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${customId}_action_${action.id}`)
        .setLabel(action.label)
        .setStyle(action.style || ButtonStyle.Primary)
        .setEmoji(action.emoji || null)
        .setDisabled(action.disabled || false)
    )
  }

  return row
}

/**
 * Handle pagination interaction
 * @param {Object} interaction - Discord interaction
 * @param {Array} pages - Array of embed pages
 * @param {string} customId - Custom ID prefix
 * @param {number} timeout - Timeout in milliseconds
 */
export async function handlePagination(interaction, pages, customId, timeout = 60000) {
  if (pages.length === 0) {
    return interaction.reply({ content: "❌ No data to display.", ephemeral: true })
  }

  if (pages.length === 1) {
    return interaction.reply({ embeds: [pages[0]] })
  }

  let currentPage = 0
  const totalPages = pages.length

  const row = createPaginationButtons(currentPage, totalPages, customId)
  
  const response = await interaction.reply({
    embeds: [pages[currentPage]],
    components: [row],
    fetchReply: true
  })

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeout
  })

  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      return buttonInteraction.reply({
        content: "❌ You can't use these buttons.",
        ephemeral: true
      })
    }

    const action = buttonInteraction.customId.split('_').pop()

    switch (action) {
      case 'prev':
        currentPage = Math.max(0, currentPage - 1)
        break
      case 'next':
        currentPage = Math.min(totalPages - 1, currentPage + 1)
        break
      default:
        return
    }

    const newRow = createPaginationButtons(currentPage, totalPages, customId)
    
    await buttonInteraction.update({
      embeds: [pages[currentPage]],
      components: [newRow]
    })
  })

  collector.on('end', async () => {
    try {
      const disabledRow = createPaginationButtons(currentPage, totalPages, customId)
      disabledRow.components.forEach(button => button.setDisabled(true))
      
      await response.edit({
        embeds: [pages[currentPage]],
        components: [disabledRow]
      })
    } catch (error) {
      logger.error("Error disabling pagination buttons:", error)
    }
  })
}

/**
 * Create paginated embeds from data array
 * @param {Array} data - Array of data items
 * @param {number} itemsPerPage - Number of items per page
 * @param {Function} formatItem - Function to format each item
 * @param {Object} embedOptions - Base embed options
 * @returns {Array} - Array of embed pages
 */
export function createPaginatedEmbeds(data, itemsPerPage, formatItem, embedOptions) {
  const pages = []
  const totalPages = Math.ceil(data.length / itemsPerPage)

  for (let i = 0; i < totalPages; i++) {
    const start = i * itemsPerPage
    const end = start + itemsPerPage
    const pageData = data.slice(start, end)

    const embed = new EmbedBuilder()
      .setTitle(embedOptions.title || "Data")
      .setColor(embedOptions.color || "#4CAF50")
      .setFooter({ 
        text: `${embedOptions.footerText || "Powered By Aegisum Eco System"} • Page ${i + 1}/${totalPages}` 
      })

    if (embedOptions.description) {
      embed.setDescription(embedOptions.description)
    }

    if (embedOptions.thumbnail) {
      embed.setThumbnail(embedOptions.thumbnail)
    }

    // Format items for this page
    const formattedItems = pageData.map(formatItem)
    
    if (embedOptions.useFields) {
      // Add as fields
      for (const item of formattedItems) {
        embed.addFields(item)
      }
    } else {
      // Add as description content
      const content = formattedItems.join('\n')
      embed.setDescription((embedOptions.description || '') + '\n\n' + content)
    }

    pages.push(embed)
  }

  return pages
}

/**
 * Create a menu system with categories and pagination
 * @param {Object} interaction - Discord interaction
 * @param {Object} menuData - Menu configuration
 * @param {string} customId - Custom ID prefix
 * @param {number} timeout - Timeout in milliseconds
 */
export async function handleCategoryMenu(interaction, menuData, customId, timeout = 60000) {
  const { categories, title, description, color } = menuData

  // Create main menu embed
  const mainEmbed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color || "#4CAF50")
    .setFooter({ text: "Powered By Aegisum Eco System" })

  // Add category overview
  let categoryList = ""
  for (const category of categories) {
    categoryList += `${category.emoji} **${category.name}** - ${category.description}\n`
  }
  mainEmbed.addFields({ name: "📋 Categories", value: categoryList, inline: false })

  // Create category buttons
  const categoryRows = createCategoryButtons(categories, customId)

  const response = await interaction.reply({
    embeds: [mainEmbed],
    components: categoryRows,
    fetchReply: true
  })

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeout
  })

  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      return buttonInteraction.reply({
        content: "❌ You can't use these buttons.",
        ephemeral: true
      })
    }

    const categoryId = buttonInteraction.customId.replace(`${customId}_`, '')
    const category = categories.find(cat => cat.id === categoryId)

    if (!category) return

    // Generate category content
    const categoryData = await category.generatePages()
    
    // Handle both array format (embeds) and object format (embeds + components)
    let categoryPages, categoryComponents = []
    
    if (Array.isArray(categoryData)) {
      categoryPages = categoryData
    } else if (categoryData.embeds) {
      categoryPages = categoryData.embeds
      categoryComponents = categoryData.components || []
    } else {
      return buttonInteraction.reply({
        content: `❌ No data available for ${category.name}.`,
        ephemeral: true
      })
    }
    
    if (categoryPages.length === 0) {
      return buttonInteraction.reply({
        content: `❌ No data available for ${category.name}.`,
        ephemeral: true
      })
    }

    // Handle pagination for this category
    let currentPage = 0
    const totalPages = categoryPages.length

    const updateCategoryView = async (page) => {
      const embed = categoryPages[page]
      const components = [...categoryComponents] // Copy category-specific components

      // Add pagination if multiple pages
      if (totalPages > 1) {
        const paginationRow = createPaginationButtons(page, totalPages, `${customId}_cat`)
        components.push(paginationRow)
      }

      // Add back button
      const backRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`${customId}_back`)
            .setLabel("🔙 Back to Menu")
            .setStyle(ButtonStyle.Secondary)
        )
      components.push(backRow)

      return { embeds: [embed], components }
    }

    await buttonInteraction.update(await updateCategoryView(currentPage))

    // Handle category pagination
    const categoryCollector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: timeout
    })

    categoryCollector.on('collect', async (catInteraction) => {
      if (catInteraction.user.id !== interaction.user.id) {
        return catInteraction.reply({
          content: "❌ You can't use these buttons.",
          ephemeral: true
        })
      }

      const customIdParts = catInteraction.customId.split('_')
      const action = customIdParts[customIdParts.length - 1]
      const actionType = customIdParts[customIdParts.length - 2]

      // Handle action buttons (privacy, draw selection, etc.)
      if (actionType === 'action') {
        await handleActionButton(catInteraction, customId, category, action, interaction.guildId)
        
        // Refresh the category view
        const refreshedData = await category.generatePages()
        let refreshedPages, refreshedComponents = []
        
        if (Array.isArray(refreshedData)) {
          refreshedPages = refreshedData
        } else if (refreshedData.embeds) {
          refreshedPages = refreshedData.embeds
          refreshedComponents = refreshedData.components || []
        }
        
        if (refreshedPages && refreshedPages.length > 0) {
          const embed = refreshedPages[currentPage]
          const components = [...refreshedComponents]
          
          if (refreshedPages.length > 1) {
            const paginationRow = createPaginationButtons(currentPage, refreshedPages.length, `${customId}_cat`)
            components.push(paginationRow)
          }
          
          const backRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`${customId}_back`)
                .setLabel("🔙 Back to Menu")
                .setStyle(ButtonStyle.Secondary)
            )
          components.push(backRow)
          
          await catInteraction.update({ embeds: [embed], components })
        }
        return
      }

      if (action === 'back') {
        // Return to main menu
        await catInteraction.update({
          embeds: [mainEmbed],
          components: categoryRows
        })
        categoryCollector.stop()
        return
      }

      if (action === 'prev') {
        currentPage = Math.max(0, currentPage - 1)
      } else if (action === 'next') {
        currentPage = Math.min(totalPages - 1, currentPage + 1)
      }

      await catInteraction.update(await updateCategoryView(currentPage))
    })
  })

  collector.on('end', async () => {
    try {
      // Disable all buttons
      const disabledRows = categoryRows.map(row => {
        const newRow = new ActionRowBuilder()
        row.components.forEach(button => {
          newRow.addComponents(ButtonBuilder.from(button).setDisabled(true))
        })
        return newRow
      })

      await response.edit({
        embeds: [mainEmbed],
        components: disabledRows
      })
    } catch (error) {
      logger.error("Error disabling category menu buttons:", error)
    }
  })
}

/**
 * Handle action button interactions
 * @param {Object} interaction - Button interaction
 * @param {string} customId - Custom ID prefix
 * @param {Object} category - Category object
 * @param {string} action - Action ID
 * @param {string} guildId - Guild ID
 */
async function handleActionButton(interaction, customId, category, action, guildId) {
  const { getDatabase, saveDatabase } = await import("../utils/database.js")
  
  try {
    const db = getDatabase(guildId)
    const userId = interaction.user.id
    
    // Initialize user data if needed
    if (!db.users[userId]) {
      db.users[userId] = {
        totalDonated: 0,
        entries: {},
        donations: [],
        achievements: [],
        privacyEnabled: false,
        wins: 0,
        streak: { current: 0, longest: 0 }
      }
    }
    
    if (category.id === 'privacy') {
      if (action === 'toggle_privacy') {
        db.users[userId].privacyEnabled = !db.users[userId].privacyEnabled
        saveDatabase(guildId, db)
        
        await interaction.followUp({
          content: `✅ Privacy settings ${db.users[userId].privacyEnabled ? 'enabled' : 'disabled'}!`,
          ephemeral: true
        })
      }
    } else if (category.id === 'select_draw') {
      if (action === 'auto') {
        delete db.users[userId].selectedDraw
        saveDatabase(guildId, db)
        
        await interaction.followUp({
          content: "✅ Draw selection set to automatic!",
          ephemeral: true
        })
      } else {
        // Check if it's a valid draw ID
        if (db.donationDraws[action] && db.donationDraws[action].active) {
          db.users[userId].selectedDraw = action
          saveDatabase(guildId, db)
          
          const drawName = db.donationDraws[action].name
          await interaction.followUp({
            content: `✅ Selected draw: **${drawName}**!`,
            ephemeral: true
          })
        }
      }
    }
  } catch (error) {
    logger.error("Error handling action button:", error)
    logger.error("Error stack:", error.stack)
    logger.error("Action details:", { customId, categoryId: category.id, action, guildId })
    
    try {
      await interaction.followUp({
        content: "❌ An error occurred while processing your request.",
        ephemeral: true
      })
    } catch (followUpError) {
      logger.error("Error sending followUp:", followUpError)
    }
  }
}