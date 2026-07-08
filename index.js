const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const config = require("./config");

const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let ticketNumber = 1;

const commands = [
  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("إرسال لوحة التذاكر")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

client.once("ready", async () => {
  console.log(`${client.user.tag} is online!`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Ticket commands registered!");
});

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== "ticket-panel") return;

    if (interaction.channel.id !== config.panelChannelId) {
      return interaction.reply({
        content: "هذا الأمر يشتغل فقط في شات التكتات.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#C8A24A")
      .setTitle(`🎫 ${config.serverName}`)
      .setDescription("اختر نوع التذكرة من القائمة بالأسفل.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("اختر نوع التذكرة")
      .addOptions(
        Object.entries(config.ticketTypes).map(([key, type]) => ({
          label: type.label,
          value: key,
          emoji: type.emoji,
          description: `فتح تذكرة ${type.label}`
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId !== "ticket_select") return;

    const typeKey = interaction.values[0];
    const type = config.ticketTypes[typeKey];

    const existing = interaction.guild.channels.cache.find(ch =>
      ch.topic === `ticket-owner:${interaction.user.id}`
    );

    if (existing) {
      return interaction.reply({
        content: `عندك تذكرة مفتوحة: ${existing}`,
        ephemeral: true
      });
    }

    const number = String(ticketNumber++).padStart(4, "0");

    const channel = await interaction.guild.channels.create({
      name: `${type.channelPrefix}-${number}`,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      topic: `ticket-owner:${interaction.user.id}`,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ReadMessageHistory
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor("#C8A24A")
      .setTitle("🎫 تذكرة جديدة")
      .setDescription(
`👤 العضو:
${interaction.user}

📂 النوع:
${type.emoji} ${type.label}

🆔 رقم التذكرة:
#${number}

يرجى انتظار أحد أعضاء الإدارة.`
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_ticket")
        .setLabel("استلام")
        .setEmoji("👑")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("إغلاق")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("delete_ticket")
        .setLabel("حذف")
        .setEmoji("🗑️")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `${interaction.user}`,
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content: `تم فتح تذكرتك: ${channel}`,
      ephemeral: true
    });
  }

  if (interaction.isButton()) {
    if (interaction.customId === "claim_ticket") {
      return interaction.reply(`👑 تم استلام التذكرة بواسطة ${interaction.user}`);
    }

    if (interaction.customId === "close_ticket") {
      await interaction.channel.permissionOverwrites.edit(
        interaction.channel.topic.replace("ticket-owner:", ""),
        { SendMessages: false }
      );

      return interaction.reply("🔒 تم إغلاق التذكرة.");
    }

    if (interaction.customId === "delete_ticket") {
      await interaction.reply("🗑️ سيتم حذف التذكرة بعد 5 ثواني.");

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
});

client.login(TOKEN);
