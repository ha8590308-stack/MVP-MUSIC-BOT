const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const express = require('express');

// إعداد سيرفر الويب البسيط لضمان بقاء البوت أونلاين على Render 24/7
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is active and running!'));
app.listen(PORT, () => console.log(`Web server is running on port ${PORT}`));

// إعداد عميل ديسكورد والصلاحيات
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// تعريف الأوامر الإنجليزية لتظهر في قائمة ديسكورد لسيرفرك MVP
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
                .setDescription('اختر اللعبة (سرعة، فك، أدمج، روليت)')
                .setRequired(true)
        )
].map(command => command.toJSON());

// التوكن من رندر، ومعرف بوتك الحقيقي MVP Games
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1533411298577088604';
const GAME_CHANNEL_ID = '1530851367558840422'; // تقدر تغيره أو تخليه لو تبي الأوامر بقناة معينة

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

// استقبال الأوامر والرد عليها
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // (اختياري) إذا تبي الأوامر تشتغل بأي قناة شل شرط القناة، أو اتركه زي ما هو
    const { commandName } = interaction;

    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('📖 قائمة المساعدة - سيرفر MVP')
            .setColor(0x0099FF)
            .setDescription('إليك قائمة الأوامر المتاحة للبوت:')
            .addFields(
                { name: '/play [game]', value: 'بدء لعبة جديدة', inline: false },
                { name: '/games', value: 'عرض الألعاب المتوفرة', inline: false },
                { name: '/help', value: 'إظهار قائمة المساعدة', inline: false }
            );
        await interaction.reply({ embeds: [helpEmbed] });
    } 
    else if (commandName === 'games') {
        await interaction.reply('🎮 **الألعاب المتوفرة حالياً:**\n1. أسرع (سرعة البديهة)\n2. فك (فك الكلمات)\n3. أدمج (تجميع الحروف)\n4. روليت (العجلة والتحدي)');
    } 
    else if (commandName === 'play') {
        const gameType = interaction.options.getString('game');
        await interaction.reply(`⏳ تم بدء لعبة **${gameType}** بنجاح! استعدوا في الشات.`);
    }
});

// تشغيل البوت وتسجيل الدخول
client.login(TOKEN);
