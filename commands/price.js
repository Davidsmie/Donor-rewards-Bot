import { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"
import { getDatabase } from "../utils/database.js"
import { logger } from "../utils/logger.js"
import fetch from "node-fetch"

export const data = new SlashCommandBuilder()
  .setName("price")
  .setDescription("Show current cryptocurrency prices")
  .addStringOption((option) =>
    option
      .setName("symbol")
      .setDescription("Cryptocurrency symbol (e.g., BTC, ETH, AEGS)")
      .setRequired(false)
  )

export async function execute(interaction) {
  try {
    const serverId = interaction.guildId
    const db = getDatabase(serverId)
    const symbol = interaction.options.getString("symbol")?.toUpperCase()

    // Defer reply as this might take some time
    await interaction.deferReply()

    if (symbol) {
      // Show price for a specific cryptocurrency
      await showSinglePrice(interaction, db, symbol)
    } else {
      // Show prices for all accepted cryptocurrencies
      await showAllPrices(interaction, db)
    }
  } catch (error) {
    logger.error("Error in price command:", error)
    
    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred while fetching cryptocurrency prices.",
          embeds: []
        })
      } else {
        await interaction.reply({
          content: "❌ An error occurred while fetching cryptocurrency prices.",
          flags: MessageFlags.Ephemeral
        })
      }
    } catch (followUpError) {
      logger.error("Error sending price error message:", followUpError)
    }
  }
}

async function showSinglePrice(interaction, db, symbol) {
  // Get price data
  const priceData = await getCryptoPrice(symbol)
  
  if (!priceData) {
    await interaction.editReply({
      content: `❌ Could not fetch price data for ${symbol}. Please check the symbol and try again.`,
      embeds: []
    })
    return
  }
  
  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(`${priceData.name} (${symbol}) Price`)
    .setDescription(`Current price information for ${priceData.name}`)
    .setColor(priceData.priceChange24h >= 0 ? "#4CAF50" : "#F44336")
    .addFields(
      { 
        name: "Current Price", 
        value: `$${formatPrice(priceData.price)}`, 
        inline: true 
      },
      { 
        name: "24h Change", 
        value: `${getPriceChangeEmoji(priceData.priceChange24h)} ${priceData.priceChange24h.toFixed(2)}%`, 
        inline: true 
      },
      { 
        name: "24h Volume", 
        value: `$${formatNumber(priceData.volume24h)}`, 
        inline: true 
      },
      { 
        name: "Market Cap", 
        value: `$${formatNumber(priceData.marketCap)}`, 
        inline: true 
      },
      { 
        name: "Circulating Supply", 
        value: `${formatNumber(priceData.circulatingSupply)} ${symbol}`, 
        inline: true 
      }
    )
    .setFooter({ text: "Powered By Aegisum Eco System • Prices update every minute" })
    .setTimestamp()
  
  // Add thumbnail if available
  if (priceData.logoUrl) {
    embed.setThumbnail(priceData.logoUrl)
  }
  
  // Add navigation buttons for other coins
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`price_prev_${symbol}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬅️"),
    new ButtonBuilder()
      .setCustomId(`price_next_${symbol}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("➡️"),
    new ButtonBuilder()
      .setCustomId(`price_all`)
      .setLabel("View All")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔍")
  )
  
  await interaction.editReply({ 
    embeds: [embed],
    components: [row]
  })
  
  // Set up a collector for button interactions
  const filter = i => i.user.id === interaction.user.id && 
                     (i.customId.startsWith('price_prev_') || 
                      i.customId.startsWith('price_next_') || 
                      i.customId === 'price_all')
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter, 
    time: 300000 // 5 minutes
  })
  
  collector.on('collect', async i => {
    try {
      if (i.customId === 'price_all') {
        await i.deferUpdate()
        await showAllPrices(i, db)
      } else if (i.customId.startsWith('price_prev_') || i.customId.startsWith('price_next_')) {
        const currentSymbol = i.customId.split('_')[2]
        const acceptedCurrencies = db.config?.acceptedCryptocurrencies || [
          "AEGS", "BTC", "ETH", "USDT", "SOL", "XRP", "DOGE", "SHIB", "BNB", "LTC"
        ]
        
        let currentIndex = acceptedCurrencies.findIndex(s => s === currentSymbol)
        if (currentIndex === -1) currentIndex = 0
        
        let newIndex
        if (i.customId.startsWith('price_prev_')) {
          newIndex = (currentIndex - 1 + acceptedCurrencies.length) % acceptedCurrencies.length
        } else {
          newIndex = (currentIndex + 1) % acceptedCurrencies.length
        }
        
        const newSymbol = acceptedCurrencies[newIndex]
        await i.deferUpdate()
        await showSinglePrice(i, db, newSymbol)
      }
    } catch (error) {
      logger.error("Error handling price button interaction:", error)
      await i.reply({ 
        content: "❌ An error occurred. Please try again.", 
        ephemeral: true 
      }).catch(e => {})
    }
  })
  
  collector.on('end', async () => {
    try {
      // Remove the buttons when the collector ends
      await interaction.editReply({ components: [] }).catch(e => {})
    } catch (error) {
      logger.error("Error removing price buttons:", error)
    }
  })
}

async function showAllPrices(interaction, db) {
  // Get accepted cryptocurrencies from database
  const acceptedCurrencies = db.config?.acceptedCryptocurrencies || [
    "AEGS", "BTC", "ETH", "USDT", "SOL", "XRP", "DOGE", "SHIB", "BNB", "LTC", "USDC", "ADA", "AVAX", "TON", "TRON", "BONC", "PEPE", "PEP"
  ]
  
  // Fetch prices for all currencies
  const pricePromises = acceptedCurrencies.map(symbol => getCryptoPrice(symbol))
  const priceResults = await Promise.all(pricePromises)
  
  // Filter out failed requests
  const prices = priceResults.filter(price => price !== null)
  
  if (prices.length === 0) {
    await interaction.editReply({
      content: "❌ Could not fetch price data for any cryptocurrencies. Please try again later.",
      embeds: [],
      components: []
    })
    return
  }
  
  // Sort prices by market cap (descending)
  prices.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
  
  // Create embed
  const embed = new EmbedBuilder()
    .setTitle("📊 Cryptocurrency Prices")
    .setDescription("Current prices for accepted cryptocurrencies")
    .setColor(db.config?.theme?.info || "#00BCD4")
    .setFooter({ text: "Powered By Aegisum Eco System • Prices update every minute" })
    .setTimestamp()
  
  // Add fields for each cryptocurrency with better formatting
  for (const price of prices) {
    const priceChangeEmoji = getPriceChangeEmoji(price.priceChange24h)
    const formattedPrice = formatPrice(price.price)
    
    embed.addFields({
      name: `${price.name} (${price.symbol})`,
      value: `$${formattedPrice}\n${priceChangeEmoji} ${price.priceChange24h.toFixed(2)}%`,
      inline: true
    })
  }
  
  // Add buttons for individual coins
  const row = new ActionRowBuilder()
  
  // Add buttons for top 3 coins
  for (let i = 0; i < Math.min(3, prices.length); i++) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`price_view_${prices[i].symbol}`)
        .setLabel(prices[i].symbol)
        .setStyle(ButtonStyle.Primary)
    )
  }
  
  // Add a button for AEGS if not in top 3
  const aegsIndex = prices.findIndex(p => p.symbol === 'AEGS')
  if (aegsIndex >= 3) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`price_view_AEGS`)
        .setLabel('AEGS')
        .setStyle(ButtonStyle.Success)
    )
  }
  
  await interaction.editReply({ 
    embeds: [embed],
    components: [row]
  })
  
  // Set up a collector for button interactions
  const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('price_view_')
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter, 
    time: 300000 // 5 minutes
  })
  
  collector.on('collect', async i => {
    try {
      const symbol = i.customId.split('_')[2]
      await i.deferUpdate()
      await showSinglePrice(i, db, symbol)
    } catch (error) {
      logger.error("Error handling price button interaction:", error)
      await i.reply({ 
        content: "❌ An error occurred. Please try again.", 
        ephemeral: true 
      }).catch(e => {})
    }
  })
  
  collector.on('end', async () => {
    try {
      // Remove the buttons when the collector ends
      await interaction.editReply({ components: [] }).catch(e => {})
    } catch (error) {
      logger.error("Error removing price buttons:", error)
    }
  })
}

async function getCryptoPrice(symbol) {
  try {
    // Normalize symbol
    const normalizedSymbol = symbol.toUpperCase()
    
    // Try Aegisum API first for AEGS
    if (normalizedSymbol === 'AEGS') {
      const aegsPrice = await getAegisumPrice(normalizedSymbol)
      if (aegsPrice) return aegsPrice
    }
    
    // Try CoinGecko API
    const geckoPrice = await getCoinGeckoPrice(normalizedSymbol)
    if (geckoPrice) return geckoPrice
    
    // Try CoinPaprika API
    const paprikaPrice = await getCoinPaprikaPrice(normalizedSymbol)
    if (paprikaPrice) return paprikaPrice
    
    // Try CoinMarketCap API as fallback
    const cmcPrice = await getCoinMarketCapPrice(normalizedSymbol)
    if (cmcPrice) return cmcPrice
    
    // If all APIs fail, log warning
    logger.warn(`❌ Could not fetch price for ${normalizedSymbol} from any API`)
    return null
  } catch (error) {
    logger.error(`Error in getCryptoPrice for ${symbol}:`, error)
    return null
  }
}

async function getAegisumPrice(symbol) {
  try {
    if (symbol !== 'AEGS') return null
    
    const response = await fetch('https://aegisum.com/api/coins/aegs/')
    
    if (!response.ok) {
      logger.warn(`Aegisum API returned status ${response.status} for ${symbol}`)
      return null
    }
    
    const data = await response.json()
    
    if (data && data.price) {
      return {
        symbol: 'AEGS',
        name: 'Aegisum',
        price: parseFloat(data.price),
        priceChange24h: parseFloat(data.priceChange24h) || 0,
        volume24h: parseFloat(data.volume24h) || 0,
        marketCap: parseFloat(data.marketCap) || 0,
        circulatingSupply: parseFloat(data.circulatingSupply) || 0,
        logoUrl: data.logoUrl || 'https://aegisum.com/aegs.png'
      }
    }
    
    return null
  } catch (error) {
    logger.error(`Error fetching Aegisum price for ${symbol}:`, error)
    return null
  }
}

async function getCoinGeckoPrice(symbol) {
  try {
    // Map of common symbols to CoinGecko IDs
    const symbolToId = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'SOL': 'solana',
      'XRP': 'ripple',
      'DOGE': 'dogecoin',
      'SHIB': 'shiba-inu',
      'BNB': 'binancecoin',
      'LTC': 'litecoin',
      'USDC': 'usd-coin',
      'ADA': 'cardano',
      'AVAX': 'avalanche-2',
      'TON': 'the-open-network',
      'TRON': 'tron',
      'BONC': 'bonk',
      'PEPE': 'pepe',
      'PEP': 'pepecoin-2'
    }
    
    const coinId = symbolToId[symbol]
    if (!coinId) return null
    
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`)
    
    if (!response.ok) {
      logger.warn(`CoinGecko API returned status ${response.status} for ${symbol}`)
      return null
    }
    
    const data = await response.json()
    
    if (data && data.market_data && data.market_data.current_price) {
      return {
        symbol: symbol,
        name: data.name,
        price: data.market_data.current_price.usd,
        priceChange24h: data.market_data.price_change_percentage_24h || 0,
        volume24h: data.market_data.total_volume.usd || 0,
        marketCap: data.market_data.market_cap.usd || 0,
        circulatingSupply: data.market_data.circulating_supply || 0,
        logoUrl: data.image?.small
      }
    }
    
    return null
  } catch (error) {
    logger.error(`Error fetching CoinGecko price for ${symbol}:`, error)
    return null
  }
}

async function getCoinPaprikaPrice(symbol) {
  try {
    // Map of common symbols to CoinPaprika IDs
    const symbolToId = {
      'BTC': 'btc-bitcoin',
      'ETH': 'eth-ethereum',
      'USDT': 'usdt-tether',
      'SOL': 'sol-solana',
      'XRP': 'xrp-xrp',
      'DOGE': 'doge-dogecoin',
      'SHIB': 'shib-shiba-inu',
      'BNB': 'bnb-binance-coin',
      'LTC': 'ltc-litecoin',
      'USDC': 'usdc-usd-coin',
      'ADA': 'ada-cardano',
      'AVAX': 'avax-avalanche',
      'TON': 'ton-the-open-network',
      'TRON': 'trx-tron',
      'AEGS': 'aegs-aegisum',
      'SHIC': 'shic-shibacoin',
      'SHIBACOIN': 'shic-shibacoin'
    }
    
    const coinId = symbolToId[symbol]
    if (!coinId) return null
    
    const response = await fetch(`https://api.coinpaprika.com/v1/tickers/${coinId}`)
    
    if (!response.ok) {
      logger.warn(`CoinPaprika API returned status ${response.status} for ${symbol}`)
      return null
    }
    
    const data = await response.json()
    
    if (data && data.quotes && data.quotes.USD) {
      return {
        symbol: symbol,
        name: data.name,
        price: data.quotes.USD.price,
        priceChange24h: data.quotes.USD.percent_change_24h || 0,
        volume24h: data.quotes.USD.volume_24h || 0,
        marketCap: data.quotes.USD.market_cap || 0,
        circulatingSupply: data.circulating_supply || 0,
        logoUrl: null // CoinPaprika API doesn't provide logo URLs in this endpoint
      }
    }
    
    return null
  } catch (error) {
    logger.error(`Error fetching CoinPaprika price for ${symbol}:`, error)
    return null
  }
}

async function getCoinMarketCapPrice(symbol) {
  try {
    const apiKey = process.env.COINMARKETCAP_API_KEY
    if (!apiKey) return null

    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
        },
      },
    )

    if (!response.ok) {
      logger.warn(`CoinMarketCap API returned status ${response.status} for ${symbol}`)
      return null
    }

    const data = await response.json()
    const coinData = data.data?.[symbol]
    
    if (coinData) {
      return {
        symbol: symbol,
        name: coinData.name,
        price: coinData.quote.USD.price,
        priceChange24h: coinData.quote.USD.percent_change_24h || 0,
        volume24h: coinData.quote.USD.volume_24h || 0,
        marketCap: coinData.quote.USD.market_cap || 0,
        circulatingSupply: coinData.circulating_supply || 0,
        logoUrl: null // CMC API doesn't provide logo URLs in this endpoint
      }
    }

    return null
  } catch (error) {
    logger.error(`Error fetching CoinMarketCap price for ${symbol}:`, error)
    return null
  }
}

function formatPrice(price) {
  if (price === undefined || price === null) return "N/A"
  
  if (price >= 1000) {
    return price.toFixed(2)
  } else if (price >= 1) {
    return price.toFixed(4)
  } else if (price >= 0.01) {
    return price.toFixed(6)
  } else {
    return price.toFixed(8)
  }
}

function formatNumber(num) {
  if (num === undefined || num === null) return "N/A"
  
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`
  } else {
    return num.toFixed(2)
  }
}

function getPriceChangeEmoji(priceChange) {
  if (priceChange > 5) return "🟢"  // Strong positive
  if (priceChange > 0) return "🟩"  // Positive
  if (priceChange === 0) return "⬜" // Neutral
  if (priceChange > -5) return "🟥" // Negative
  return "🔴"                       // Strong negative
}