const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const express = require('express');

// إعداد سيرفر الويب لضمان عمل البوت 24 ساعة على Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is active and running!'));
app.listen(PORT, () => console.log(`Web server is running on port ${PORT}`));

// إعداد عميل ديسكورد
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// تعريف الأوامر الإنجليزية لتظهر في قائمة ديسكورد
const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('إظهار قائمة المساعدة والأوامر العامة'),
    new SlashCommandBuilder()
        .setName('games')
        .setDescription('عرض الألعاب المتوفرة في البوت'),
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('بدء لعبة جديدة')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('اختر اللعبة')
                .setRequired(true)
        )
].map(command => command.toJSON());

// التوكن من رندر، والمعرفات المضافة مباشرة
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1530851367558840422';
const GAME_CHANNEL_ID = '1530851367558840422';

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}!`);
    try {
        console.log('🔄 جاري تحديث أوامر الـ Slash Commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('✨ تم تحديث الأوامر بنجاح.');
    } catch (error) {
        console.error('❌ خطأ أثناء تسجيل الأوامر:', error);
    }
});

// استقبال الأوامر والتحقق من القناة
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (GAME_CHANNEL_ID && interaction.channelId !== GAME_CHANNEL_ID) {
        return interaction.reply({
            content: `⚠️ Please use the command in the game channel <#${GAME_CHANNEL_ID}>`,
            ephemeral: true 
        });
    }

    const { commandName } = interaction;

    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('📖 قائمة المساعدة')
            .setColor(0x0099FF)
            .addFields(
                { name: '/play [game]', value: 'بدء لعبة جديدة', inline: false },
                { name: '/games', value: 'عرض الألعاب المتوفرة', inline: false },
                { name: '/help', value: 'إظهار قائمة المساعدة', inline: false }
            );
        await interaction.reply({ embeds: [helpEmbed] });
    } 
    else if (commandName === 'games') {
        await interaction.reply('🎮 **الألعاب المتوفرة:**\n1. أسرع\n2. فك\n3. أدمج\n4. روليت');
    } 
    else if (commandName === 'play') {
        const gameType = interaction.options.getString('game');
        await interaction.reply(`⏳ تم بدء لعبة **${gameType}** بنجاح!`);
    }
});

client.login(TOKEN);
