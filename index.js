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

// بنك أعلام دول العالم
const allFlagsList = [
    { name: 'السعودية', code: 'sa' }, { name: 'الإمارات', code: 'ae' }, { name: 'الكويت', code: 'kw' },
    { name: 'قطر', code: 'qa' }, { name: 'البحرين', code: 'bh' }, { name: 'عمان', code: 'om' },
    { name: 'مصر', code: 'eg' }, { name: 'المغرب', code: 'ma' }, { name: 'الجزائر', code: 'dz' },
    { name: 'العراق', code: 'iq' }, { name: 'الاردن', code: 'jo' }, { name: 'سوريا', code: 'sy' },
    { name: 'لبنان', code: 'lb' }, { name: 'فلسطين', code: 'ps' }, { name: 'اليمن', code: 'ye' },
    { name: 'السودان', code: 'sd' }, { name: 'ليبيا', code: 'ly' }, { name: 'تونس', code: 'tn' },
    { name: 'موريتانيا', code: 'mr' }, { name: 'الصومال', code: 'so' }, { name: 'جيبوتي', code: 'dj' },
    { name: 'جزر القمر', code: 'km' }, { name: 'امريكا', code: 'us' }, { name: 'بريطانيا', code: 'gb' },
    { name: 'فرنسا', code: 'fr' }, { name: 'المانيا', code: 'de' }, { name: 'ايطاليا', code: 'it' },
    { name: 'اسبانيا', code: 'es' }, { name: 'تركيا', code: 'tr' }, { name: 'البرتغال', code: 'pt' },
    { name: 'روسيا', code: 'ru' }, { name: 'البرازيل', code: 'br' }, { name: 'الارجنتين', code: 'ar' },
    { name: 'اليابان', code: 'jp' }, { name: 'كوريا الجنوبية', code: 'kr' }, { name: 'الصين', code: 'cn' },
    { name: 'الهند', code: 'in' }, { name: 'كندا', code: 'ca' }, { name: 'استراليا', code: 'au' },
    { name: 'المكسيك', code: 'mx' }, { name: 'جنوب افريقيا', code: 'za' }, { name: 'ايسلندا', code: 'is' },
    { name: 'السويد', code: 'se' }, { name: 'النرويج', code: 'no' }, { name: 'الدنمارك', code: 'dk' },
    { name: 'فنلندا', code: 'fi' }, { name: 'سويسرا', code: 'ch' }, { name: 'النمسا', code: 'at' },
    { name: 'بلجيكا', code: 'be' }, { name: 'هولندا', code: 'nl' }, { name: 'اليونان', code: 'gr' },
    { name: 'بولندا', code: 'pl' }, { name: 'اوكرانيا', code: 'ua' }, { name: 'باكستان', code: 'pk' },
    { name: 'إيران', code: 'ir' }, { name: 'إندونيسيا', code: 'id' }, { name: 'ماليزيا', code: 'my' },
    { name: 'منغوليا', code: 'mn' }
];

let availableFlags = [...allFlagsList];
function getRandomFlag() {
    if (availableFlags.length === 0) availableFlags = [...allFlagsList];
    const index = Math.floor(Math.random() * availableFlags.length);
    return availableFlags.splice(index, 1)[0];
}

// بنك كلمات لعبة السرعة
const speedWords = ['برمجة', 'ديسكورد', 'سيرفر', 'كمبيوتر', 'ماوس', 'شاشة', 'تحديث', 'كود', 'جيمنق', 'بطولة', 'فوز', 'لعبة', 'حاسب', 'شبكة', 'تطبيق'];

// بنك كلمات لعبة فك (يعرض الكلمة سليمة، والإجابة المطلوبة حروفها مفرقة)
const unfuckBank = [
    { word: 'ديسكورد', spaced: 'د ي س ك و ر د' },
    { word: 'تحدي', spaced: 'ت ح د ي' },
    { word: 'برمجة', spaced: 'ب ر م ج ة' },
    { word: 'كمبيوتر', spaced: 'ك م ب ي و ت ر' },
    { word: 'بطولة', spaced: 'ب ط و ل ة' },
    { word: 'سيرفر', spaced: 'س ي ر ف ر' },
    { word: 'محترف', spaced: 'م ح ت ر ف' },
    { word: 'ديوانية', spaced: 'د ي و ا ن ي ة' }
];

// بنك لعبة أدمج الحروف (العكس: يعرض الحروف مفرقة، والإجابة كلمة متلاصقة)
const mergeBank = [
    { original: 'ديسكورد', merged: 'د ي س ك و ر د' },
    { original: 'تحدي', merged: 'ت ح د ي' },
    { original: 'برمجة', merged: 'ب ر م ج ة' },
    { original: 'كمبيوتر', merged: 'ك م ب ي و ت ر' },
    { original: 'بطولة', merged: 'ب ط و ل ة' },
    { original: 'سيرفر', merged: 'س ي ر ف ر' }
];

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

// دالة إرسال علم جديد مع مؤقت 15 ثانية
async function sendNextFlag(channel, points) {
    if (!activeGame || activeGame.type !== 'أعلام') return;
    if (activeGame.timer) clearTimeout(activeGame.timer);

    const randomFlag = getRandomFlag();
    activeGame.answer = randomFlag.name;

    const flagEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('أعلام')
        .setDescription('أسرع شخص يخمن اسم العلم الموجود تحت يفوز في اللعبة')
        .setImage(`https://flagcdn.com/w640/${randomFlag.code}.png`);

    const sentMessage = await channel.send({ embeds: [flagEmbed] });
    activeGame.messageId = sentMessage.id;

    activeGame.timer = setTimeout(async () => {
        if (!activeGame || activeGame.type !== 'أعلام') return;
        await channel.send(`⏰ انتهى الوقت! لم يقدم أحد الإجابة الصحيحة. الإجابة كانت: **${randomFlag.name}**`);
        sendNextFlag(channel, points);
    }, 15000);
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === 'وقف' || message.content === '/stop') {
        if (activeGame && activeGame.timer) clearTimeout(activeGame.timer);
        activeGame = null;
        return message.reply('تم إيقاف اللعبة.');
    }

    if (activeGame) {
        let userAns = message.content.trim().replace(/\s+/g, '').replace(/أ|إ|آ/g, 'ا');
        let correctAns = activeGame.answer.trim().replace(/\s+/g, '').replace(/أ|إ|آ/g, 'ا');

        if (userAns === correctAns) {
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

            if (activeGame.type === 'فك') {
                await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
                const randomItem = unfuckBank[Math.floor(Math.random() * unfuckBank.length)];
                activeGame.answer = randomItem.spaced; // الإجابة المطلوبة هي الحروف مفرقة
                return message.channel.send(`لعبة فك الكلمات بدأت! فكك الكلمة:\n\`\`\`fix\n${randomItem.word}\n\`\`\` - النقاط: ${activeGame.points}`);
            }

            if (activeGame.type === 'أدمج') {
                await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
                const randomItem = mergeBank[Math.floor(Math.random() * mergeBank.length)];
                activeGame.answer = randomItem.original;
                return message.channel.send(`لعبة أدمج الحروف بدأت! الحروف:\n\`\`\`fix\n${randomItem.merged}\n\`\`\` - النقاط: ${activeGame.points}`);
            }

            if (activeGame.type === 'أعلام') {
                if (activeGame.timer) clearTimeout(activeGame.timer);
                await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
                return sendNextFlag(message.channel, activeGame.points);
            }
        }
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

        if (activeGame && activeGame.timer) clearTimeout(activeGame.timer);

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
            const randomItem = unfuckBank[Math.floor(Math.random() * unfuckBank.length)];
            activeGame = { type: 'فك', answer: randomItem.spaced, points: customPoints };
            await interaction.reply(`لعبة فك الكلمات بدأت! فكك الكلمة:\n\`\`\`fix\n${randomItem.word}\n\`\`\` - النقاط: ${customPoints}`);
        } 
        else if (gameType === 'أدمج') {
            const randomItem = mergeBank[Math.floor(Math.random() * mergeBank.length)];
            activeGame = { type: 'أدمج', answer: randomItem.original, points: customPoints };
            await interaction.reply(`لعبة أدمج الحروف بدأت! الحروف:\n\`\`\`fix\n${randomItem.merged}\n\`\`\` - النقاط: ${customPoints}`);
        }
        else if (gameType === 'أعلام') {
            activeGame = { type: 'أعلام', points: customPoints };
            await interaction.reply('🎮 سيتم بدء أعلام...');
            await sendNextFlag(interaction.channel, customPoints);
        }
    }
    else if (commandName === 'stop') {
        if (activeGame && activeGame.timer) clearTimeout(activeGame.timer);
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
