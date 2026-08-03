const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');

// إعداد سيرفر الويب للبقاء أونلاين 24/7 على Render
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

// قاعدة بيانات بسيطة لتخزين النقاط (مؤقتة في الذاكرة)
// المفتاح: userId، القيمة: عدد النقاط
const userPoints = new Map();

// تخزين اللعبة النشطة في الشات حالياً لمنع تداخل الإجابات
let activeGame = null; // { type, answer, points }

// قائمة الأوامر مع إعداد خيارات اللعبة المحددة
const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('إظهار قائمة المساعدة والأوامر العامة'),
    new SlashCommandBuilder()
        .setName('games')
        .setDescription('عرض الألعاب المتوفرة في البوت'),
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('بدء لعبة جديدة واختيارها من القائمة')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('اختر اللعبة من القائمة')
                .setRequired(true)
                .addChoices(
                    { name: 'أسرع (سرعة البديهة)', value: 'سرعة' },
                    { name: 'فك (فك الكلمات)', value: 'فك' },
                    { name: 'أدمج (تجميع الحروف)', value: 'أدمج' },
                    { name: 'روليت (العجلة والتحدي)', value: 'روليت' }
                )
        ),
    new SlashCommandBuilder()
        .setName('points')
        .setDescription('عرض نقاطك أو نقاط شخص آخر')
        .addUserOption(option => 
            option.setName('user').setDescription('اختر العضو لعرض نقاطه').setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName('resetpoints')
        .setDescription('تصفير نقاط شخص محدد (خاص بالإدارة)')
        .addUserOption(option =>
            option.setName('user').setDescription('العضو المراد تصفير نقاطه').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('resetallpoints')
        .setDescription('تصفير نقاط كل أعضاء السيرفر (خاص بالإدارة)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1533411298577088604';

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}!`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✨ تم تحديث الأوامر بنجاح.');
    } catch (error) {
        console.error('❌ خطأ أثناء تسجيل الأوامر:', error);
    }
});

// نظام التفاعل والتحقق من الإجابات في الشات
client.on('messageCreate', async message => {
    if (message.author.bot || !activeGame) return;

    // التحقق من إجابة اللاعب على اللعبة النشطة
    if (message.content.trim() === activeGame.answer) {
        const userId = message.author.id;
        const currentPoints = userPoints.get(userId) || 0;
        const earnedPoints = activeGame.points;
        const totalPoints = currentPoints + earnedPoints;
        
        userPoints.set(userId, totalPoints);
        
        const winningGame = activeGame.type;
        activeGame = null; // إنهاء اللعبة الحالية حتى يتم بدء لعبة جديدة

        await message.reply(`🎉 **كفو يا <@${userId}>!** أسرع واحد جاوب صح في لعبة **${winningGame}**!\n🏆 تمت إضافة **${earnedPoints} نقاط** لرصيدك. مجموع نقاطك الآن: **${totalPoints}** 🌟`);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('📖 قائمة المساعدة وأوامر الألعاب - MVP')
            .setColor(0x0099FF)
            .addFields(
                { name: '/play', value: 'اختيار وبدء لعبة جديدة من القائمة المنسدلة', inline: false },
                { name: '/games', value: 'عرض قائمة الألعاب المتوفرة', inline: false },
                { name: '/points', value: 'عرض رصيدك من النقاط أو نقاط صديقك', inline: false },
                { name: '/resetpoints [@user]', value: 'تصفير نقاط عضو معين (للإدارة)', inline: false },
                { name: '/resetallpoints', value: 'تصفير نقاط السيرفر بالكامل (للإدارة)', inline: false }
            );
        await interaction.reply({ embeds: [helpEmbed] });
    } 
    else if (commandName === 'games') {
        await interaction.reply('🎮 **الألعاب المتوفرة حالياً:**\n1️⃣ **سرعة:** أجب على السؤال بأسرع ما يمكن.\n2️⃣ **فك:** عدل الحروف المبعثرة للكلمة الصحيحة.\n3️⃣ **أدمج:** اجمع الحروف لتكوين الكلمة المطلوبة.\n4️⃣ **روليت:** تحدي الحظ واختيار النقاط.');
    } 
    else if (commandName === 'play') {
        const gameType = interaction.options.getString('game');

        if (gameType === 'سرعة') {
            activeGame = { type: 'سرعة', answer: 'برمجة', points: 15 };
            await interaction.reply(`⚡ **بدأت لعبة سرعة البديهة!**\nالسؤال: اكتب كلمة **( برمجة )** بأسرع ما يمكن في الشات والنقاط المرصودة: **15 نقطة**! ⏱️`);
        } 
        else if (gameType === 'فك') {
            activeGame = { type: 'فك', answer: 'ديسكورد', points: 20 };
            await interaction.reply(`🔤 **بدأت لعبة فك الكلمات!**\nفكك الحروف التالية واكتب الكلمة الصحيحة في الشات: **د ي س ك و ر د** (النقاط: **20**) 🧩`);
        } 
        else if (gameType === 'أدمج') {
            activeGame = { type: 'أدمج', answer: 'تحدي', points: 15 };
            await interaction.reply(`🔗 **بدأت لعبة أدمج الحروف!**\nاجمع الحروف واكتبها بالشات: **ت ح د ي** (النقاط: **15**) 🎯`);
        } 
        else if (gameType === 'روليت') {
            activeGame = { type: 'روليت', answer: 'فوز', points: 30 };
            await interaction.reply(`🎡 **بدأت لعبة الروليت الكبرى!**\nأسرع شخص يكتب كلمة **( فوز )** بياخذ الجائزة الكبرى: **30 نقطة**! 🔥`);
        }
    }
    else if (commandName === 'points') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const points = userPoints.get(targetUser.id) || 0;
        await interaction.reply(`📊 رصيد نقاط العضو <@${targetUser.id}> هو: **${points} نقطة** 🌟`);
    }
    else if (commandName === 'resetpoints') {
        const targetUser = interaction.options.getUser('user');
        userPoints.set(targetUser.id, 0);
        await interaction.reply(`🗑️ تم تصفير نقاط العضو <@${targetUser.id}> بنجاح وأصبحت **0**.`);
    }
    else if (commandName === 'resetallpoints') {
        userPoints.clear();
        await interaction.reply(`🧹 تم تصفير نقاط **جميع الأعضاء** في السيرفر بنجاح!`);
    }
});

client.login(TOKEN);
