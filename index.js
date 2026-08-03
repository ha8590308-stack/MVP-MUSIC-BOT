const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is active and running!'));
app.listen(PORT, () => console.log(`Web server is running on port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const userPoints = new Map();
let activeGame = null;

const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('عرض قائمة المساعدة'),
    new SlashCommandBuilder()
        .setName('games')
        .setDescription('عرض الألعاب المتوفرة'),
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('بدء لعبة جديدة')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('اختر اللعبة')
                .setRequired(true)
                .addChoices(
                    { name: 'سرعة', value: 'سرعة' },
                    { name: 'فك', value: 'فك' },
                    { name: 'أدمج', value: 'أدمج' },
                    { name: 'روليت', value: 'روليت' }
                )
        )
        .addIntegerOption(option =>
            option.setName('points')
                .setDescription('عدد النقاط')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('إيقاف اللعبة الحالية'),
    new SlashCommandBuilder()
        .setName('points')
        .setDescription('عرض النقاط')
        .addUserOption(option => 
            option.setName('user').setDescription('العضو').setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName('resetpoints')
        .setDescription('تصفير نقاط عضو')
        .addUserOption(option =>
            option.setName('user').setDescription('العضو').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('resetallpoints')
        .setDescription('تصفير نقاط الجميع')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1533411298577088604';

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ تم تسجيل الدخول باسم: ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✨ تم تحديث الأوامر.');
    } catch (error) {
        console.error('❌ خطأ:', error);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (activeGame && message.content === 'وقف') {
        activeGame = null;
        return message.reply('تم إيقاف اللعبة.');
    }

    if (activeGame && message.content.trim() === activeGame.answer) {
        const userId = message.author.id;
        const currentPoints = userPoints.get(userId) || 0;
        const totalPoints = currentPoints + activeGame.points;
        
        userPoints.set(userId, totalPoints);
        activeGame = null;

        await message.reply(`فاز <@${userId}> وأخذ ${totalPoints} نقطة.`);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('قائمة الأوامر')
            .setColor(0x0099FF)
            .addFields(
                { name: '/play', value: 'بدء لعبة وتحديد النقاط' },
                { name: '/stop', value: 'إيقاف اللعبة' },
                { name: '/games', value: 'عرض الألعاب' },
                { name: '/points', value: 'عرض النقاط' },
                { name: '/resetpoints', value: 'تصفير نقاط شخص' },
                { name: '/resetallpoints', value: 'تصفير الكل' }
            );
        await interaction.reply({ embeds: [helpEmbed] });
    } 
    else if (commandName === 'games') {
        await interaction.reply('الألعاب: سرعة، فك، أدمج، روليت');
    } 
    else if (commandName === 'play') {
        const gameType = interaction.options.getString('game');
        const customPoints = interaction.options.getInteger('points');

        const answers = {
            'سرعة': 'برمجة',
            'فك': 'ديسكورد',
            'أدمج': 'تحدي',
            'روليت': 'فوز'
        };

        activeGame = { type: gameType, answer: answers[gameType], points: customPoints };
        await interaction.reply(`لعبة ${gameType} بدأت! الإجابة المطلوبة: (${answers[gameType]}) - النقاط: ${customPoints}`);
    }
    else if (commandName === 'stop') {
        if (!activeGame) return interaction.reply({ content: 'لا توجد لعبة جارية.', ephemeral: true });
        activeGame = null;
        await interaction.reply('تم إيقاف اللعبة.');
    }
    else if (commandName === 'points') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const points = userPoints.get(targetUser.id) || 0;
        await interaction.reply(`نقاط <@${targetUser.id}>: ${points}`);
    }
    else if (commandName === 'resetpoints') {
        const targetUser = interaction.options.getUser('user');
        userPoints.set(targetUser.id, 0);
        await interaction.reply(`تم تصفير نقاط <@${targetUser.id}>.`);
    }
    else if (commandName === 'resetallpoints') {
        userPoints.clear();
        await interaction.reply('تم تصفير نقاط الجميع.');
    }
});

client.login(TOKEN);
