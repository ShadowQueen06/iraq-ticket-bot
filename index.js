const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

const commands = [
  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("إرسال لوحة التذاكر")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

client.once("ready", async () => {
  console.log(`${client.user.tag} is online!`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Commands registered!");
});

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "ticket-panel") {
      const embed = new EmbedBuilder()
        .setColor("#C8A24A")
        .setTitle("🎫 نظام التذاكر")
        .setDescription("اضغط الزر بالأسفل لفتح تذكرة دعم.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("open_ticket")
          .setLabel("فتح تذكرة")
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === "open_ticket") {
      const existing = interaction.guild.channels.cache.find(
        ch => ch.name === `ticket-${interaction.user.username.toLowerCase()}`
      );

      if (existing) {
        return interaction.reply({
          content: `عندك تذكرة مفتوحة: ${existing}`,
          ephemeral: true
        });
      }

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
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
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setColor("#C8A24A")
        .setTitle("تم فتح التذكرة")
        .setDescription(`${interaction.user} اكتب طلبك هنا وسيتم الرد عليك.`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("إغلاق التذكرة")
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

    if (interaction.customId === "close_ticket") {
      await interaction.reply("سيتم حذف التذكرة بعد 5 ثواني.");

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
});

client.login(TOKEN);
