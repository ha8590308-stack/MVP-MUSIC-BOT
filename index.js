const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

// قائمة شاملة لجميع أعلام دول العالم
const allFlagsList = [
    { name: 'السعودية', flag: '🇸🇦' }, { name: 'الإمارات', flag: '🇦🇪' }, { name: 'الكويت', flag: '🇰🇼' },
    { name: 'قطر', flag: '🇶🇦' }, { name: 'البحرين', flag: '🇧🇭' }, { name: 'عمان', flag: '🇴🇲' },
    { name: 'مصر', flag: '🇪🇬' }, { name: 'المغرب', flag: '🇲🇦' }, { name: 'الجزائر', flag: '🇩🇿' },
    { name: 'العراق', flag: '🇮🇶' }, { name: 'الاردن', flag: '🇯🇴' }, { name: 'سوريا', flag: '🇸🇾' },
    { name: 'لبنان', flag: '🇱🇧' }, { name: 'فلسطين', flag: '🇵🇸' }, { name: 'اليمن', flag: '🇾🇪' },
    { name: 'السودان', flag: '🇸🇩' }, { name: 'ليبيا', flag: '🇱🇾' }, { name: 'تونس', flag: '🇹🇳' },
    { name: 'موريتانيا', flag: '🇲🇷' }, { name: 'الصومال', flag: '🇸🇴' }, { name: 'جيبوتي', flag: '🇩🇯' },
    { name: 'جزر القمر', flag: '🇰🇲' }, { name: 'امريكا', flag: '🇺🇸' }, { name: 'بريطانيا', flag: '🇬🇧' },
    { name: 'فرنسا', flag: '🇫🇷' }, { name: 'المانيا', flag: '🇩🇪' }, { name: 'ايطاليا', flag: '🇮🇹' },
    { name: 'اسبانيا', flag: '🇪🇸' }, { name: 'تركيا', flag: '🇹🇷' }, { name: 'البرتغال', flag: '🇵🇹' },
    { name: 'روسيا', flag: '🇷🇺' }, { name: 'البرازيل', flag: '🇧🇷' }, { name: 'الارجنتين', flag: '🇦🇷' },
    { name: 'اليابان', flag: '🇯🇵' }, { name: 'كوريا الجنوبية', flag: '🇰🇷' }, { name: 'الصين', flag: '🇨🇳' },
    { name: 'الهند', flag: '🇮🇳' }, { name: 'كندا', flag: '🇨🇦' }, { name: 'استراليا', flag: '🇦🇺' },
    { name: 'المكسيك', flag: '🇲🇽' }, { name: 'جنوب افريقيا', flag: '🇿🇦' }, { name: 'ايسلندا', flag: '🇮🇸' },
    { name: 'السويد', flag: '🇸🇪' }, { name: 'النرويج', flag: '🇳🇴' }, { name: 'الدنمارك', flag: '🇩🇰' },
    { name: 'فنلندا', flag: '🇫🇮' }, { name: 'سويسرا', flag: '🇨🇭' }, { name: 'النمسا', flag: '🇦🇹' },
    { name: 'بلجيكا', flag: '🇧🇪' }, { name: 'هولندا', flag: '🇳🇱' }, { name: 'اليونان', flag: '🇬🇷' },
    { name: 'بولندا', flag: '🇵🇱' }, { name: 'اوكرانيا', flag: '🇺🇦' }, { name: 'باكستان', flag: '🇵🇰' },
    { name: 'إيران', flag: '🇮🇷' }, { name: 'إندونيسيا', flag: '🇮🇩' }, { name: 'ماليزيا', flag: '🇲🇾' }
];

let availableFlags = [...allFlagsList]; // قائمة مخصصة للسحب بدون تكرار

function getRandomFlag() {
    if (availableFlags.length === 0) {
        availableFlags = [...allFlagsList]; // إذا خلصت كلها، تعبأ القائمة من جديد
    }
    const randomIndex = Math.floor(Math.random() * availableFlags.length);
    const selectedFlag = availableFlags[randomIndex];
    availableFlags.splice(randomIndex, 1); // حذف العلم عشان ما يتكرر إلا لما تخلص القائمة
    return selectedFlag;
}

const speedWords = ['برمجة', 'ديسكورد', 'سيرفر', 'كمبيوتر', 'ماوس', 'شاشة', 'تحديث', 'كود', 'جيمنق', 'بطولة', 'فوز', 'لعبة'];

const commands = [
    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة المساعدة'),
    new SlashCommandBuilder().setName('games').setDescription('عرض الألعاب المتوفرة'),
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
                    { name: 'أعلام', value: 'أعلام' },
                    { name: 'روليت', value: 'روليت' }
                )
        )
        .addIntegerOption(option =>
            option.setName('points')
                .setDescription('عدد النقاط')
                .setRequired(true)
        ),
    new SlashCommandBuilder().setName('stop').setDescription('إيقاف اللعبة الحالية'),
    new SlashCommandBuilder()
        .setName('points')
        .setDescription('عرض النقاط')
        .addUserOption(option => option.setName('user').setDescription('العضو').setRequired(false)),
    new SlashCommandBuilder()
        .setName('resetpoints')
        .setDescription('تصفير نقاط عضو')
        .addUserOption(option => option.setName('user').setDescription('العضو').setRequired(true))
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

    if (message.content === 'وقف' || message.content === '/stop') {
        activeGame = null;
        return message.reply('تم إيقاف اللعبة.');
    }

    if (activeGame && message.content.trim() === activeGame.answer) {
        const userId = message.author.id;
        const currentPoints = userPoints.get(userId) || 0;
        const totalPoints = currentPoints + activeGame.points;
        
        userPoints.set(userId, totalPoints);

        if (activeGame.type === 'سرعة') {
            await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
            const randomWord = speedWords[Math.floor(Math.random() * speedWords.length)];
            activeGame.answer = randomWord;
            return message.channel.send(`الكلمة التالية:\n\`\`\`fix\n${randomWord}\n\`\`\``);
        }

        if (activeGame.type === 'أعلام') {
            await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
            const randomFlag = getRandomFlag();
            activeGame.answer = randomFlag.name;
            return message.channel.send(`ما هو اسم الدولة لهذا العلم:\n\`\`\`ansi\n\n       ${randomFlag.flag}       \n\n\`\`\``);
        }

        activeGame = null;
        await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
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
                { name: '/points', value: 'عرض النقاط' }
            );
        await interaction.reply({ embeds: [helpEmbed] });
    } 
    else if (commandName === 'games') {
        await interaction.reply(`الألعاب المتوفرة:\n\`سرعة\` | \`فك\` | \`أدمج\` | \`أعلام\` | \`روليت\``);
    } 
    else if (commandName === 'play') {
        const gameType = interaction.options.getString('game');
        const customPoints = interaction.options.getInteger('points');

        if (gameType === 'روليت') {
            const participants = new Set();
            const joinButton = new ButtonBuilder()
                .setCustomId('join_roulette')
                .setLabel('انضمام للعبة 🎮')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(joinButton);
            const msg = await interaction.reply({ 
                content: 'بدأت لعبة الروليت! اضغط على زر انضمام (لديك 10 ثوانٍ):', 
                components: [row], 
                fetchReply: true 
            });

            const collector = msg.createMessageComponentCollector({ time: 10000 });

            collector.on('collect', async i => {
                if (!participants.has(i.user.id)) {
                    participants.add(i.user.id);
                    await i.reply({ content: 'تم انضمامك بنجاح!', ephemeral: true });
                } else {
                    await i.reply({ content: 'أنت منضم مسبقاً!', ephemeral: true });
                }
            });

            collector.on('end', async () => {
                const players = Array.from(participants);
                if (players.length === 0) {
                    return interaction.editReply({ content: 'لم يشارك أحد في الروليت.', components: [] });
                }
                const winnerId = players[Math.floor(Math.random() * players.length)];
                const currentPoints = userPoints.get(winnerId) || 0;
                userPoints.set(winnerId, currentPoints + customPoints);

                await interaction.editReply({ 
                    content: `فاز <@${winnerId}> في الروليت وأخذ ${customPoints} نقطة.`, 
                    components: [] 
                });
            });
            return;
        }

        if (gameType === 'سرعة') {
            const firstWord = speedWords[Math.floor(Math.random() * speedWords.length)];
            activeGame = { type: 'سرعة', answer: firstWord, points: customPoints };
            await interaction.reply(`لعبة السرعة بدأت! الكلمة:\n\`\`\`fix\n${firstWord}\n\`\`\``);
        } 
        else if (gameType === 'فك') {
            activeGame = { type: 'فك', answer: 'ديسكورد', points: customPoints };
            await interaction.reply(`لعبة فك الكلمات بدأت! الكلمة:\n\`\`\`fix\nديسكورد\n\`\`\` - النقاط: ${customPoints}`);
        } 
        else if (gameType === 'أدمج') {
            activeGame = { type: 'أدمج', answer: 'تحدي', points: customPoints };
            await interaction.reply(`لعبة أدمج الحروف بدأت! الحروف:\n\`\`\`fix\nت ح د ي\n\`\`\` - النقاط: ${customPoints}`);
        }
        else if (gameType === 'أعلام') {
            const randomFlag = getRandomFlag();
            activeGame = { type: 'أعلام', answer: randomFlag.name, points: customPoints };
            await interaction.reply(`لعبة الأعلام بدأت! ما هو اسم الدولة لهذا العلم:\n\`\`\`ansi\n\n       ${randomFlag.flag}       \n\n\`\`\``);
        }
    }
    else if (commandName === 'stop') {
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
