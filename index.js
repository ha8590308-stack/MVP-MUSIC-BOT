const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const express = require('express');

// إعداد سيرفر الويب البسيط لضمان بقاء البوت أونلاين على Render
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

// إعداد الأوامر باللغة العربية بالكامل
const commands = [
    new SlashCommandBuilder()
        .setName('مساعدة')
        .setDescription('إظهار قائمة المساعدة والأوامر العامة'),
    new SlashCommandBuilder()
        .setName('ألعاب')
        .setDescription('عرض الألعاب المتوفرة في البوت'),
    new SlashCommandBuilder()
        .setName('لعب')
        .setDescription('بدء لعبة جديدة')
        .addStringOption(option =>
            option.setName('نوع_اللعبة')
                .setDescription('اختر اللعبة (سرعة، فك، أدمج، روليت)')
                .setRequired(true)
        )
].map(command => command.toJSON());

// سحب التوكن بأمان من رندر، وثبات الآيدي هنا مباشرة
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1530851367558840422';
const GAME_CHANNEL_ID = '1530851367558840422';

// تسجيل الأوامر عند تشغيل البوت
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

// معالجة الأوامر والتأكد من القناة المخصصة
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (GAME_CHANNEL_ID && interaction.channelId !== GAME_CHANNEL_ID) {
        return interaction.reply({
            content: `⚠️ يرجى استخدام الأوامر داخل قناة الألعاب المخصصة <#${GAME_CHANNEL_ID}>`,
            ephemeral: true 
        });
    }

    const { commandName } = interaction;

    if (commandName === 'مساعدة') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('📖 قائمة المساعدة - الإعدادات العامة')
            .setColor(0x0099FF)
            .setDescription('إليك قائمة الأوامر المتاحة للبوت:')
            .addFields(
                { name: '/لعب [نوع_اللعبة]', value: 'بدء لعبة جديدة', inline: false },
                { name: '/ألعاب', value: 'عرض الألعاب المتوفرة', inline: false },
                { name: '/مساعدة', value: 'إظهار قائمة المساعدة', inline: false }
            );
        await interaction.reply({ embeds: [helpEmbed] });
    } 
    else if (commandName === 'ألعاب') {
        await interaction.reply('🎮 **الألعاب المتوفرة حالياً:**\n1. أسرع (سرعة البديهة)\n2. فك (فك الكلمات)\n3. أدمج (تجميع الحروف)\n4. روليت (لعبة العجلة والتحدي)');
    } 
    else if (commandName === 'لعب') {
        const gameType = interaction.options.getString('نوع_اللعبة');
        
        if (gameType === 'روليت') {
            await interaction.reply('🎡 **بدء لعبة الروليت!** جاري تجهيز العجلة واختيار اللاعبين...');
        } else {
            await interaction.reply(`⏳ تم بدء لعبة **${gameType}**! استعدوا للإجابة في الشات.`);
        }
    }
});

// تسجيل الدخول بالبوت
client.login(TOKEN);
