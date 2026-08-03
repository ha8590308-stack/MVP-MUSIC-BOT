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
let allowedRoleId = null; // تخزين رول التحكم

// ==================== بنوك البيانات ====================

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

const expandedWords = [
    'برمجة', 'ديسكورد', 'سيرفر', 'كمبيوتر', 'ماوس', 'شاشة', 'تحديث', 'كود', 'جيمنق', 'بطولة', 
    'فوز', 'لعبة', 'حاسب', 'شبكة', 'تطبيق', 'مطور', 'قناة', 'رومات', 'تفاعل', 'شات', 
    'سماعة', 'لوحة', 'مفاتيح', 'صوت', 'تحكم', 'مشرف', 'عضو', 'مسابقة',
    'تقنية', 'هاتف', 'متصفح', 'تخزين', 'معالج', 'بطاقة', 'رسومات', 'تنزيل', 'اتصال', 'حماية',
    'منتصر', 'محترف', 'تطبيقات', 'ديوانية', 'سعودية', 'رياضيات', 'فيزياء', 'تاريخ', 'مستقبل', 'فضاء'
];

let availableFlags = [];
let availableWords = [];

function getUniqueFlag() {
    if (availableFlags.length === 0) availableFlags = [...allFlagsList];
    const index = Math.floor(Math.random() * availableFlags.length);
    return availableFlags.splice(index, 1)[0];
}

function getUniqueWord() {
    if (availableWords.length === 0) availableWords = [...expandedWords];
    const index = Math.floor(Math.random() * availableWords.length);
    return availableWords.splice(index, 1)[0];
}

function makeSpaced(word) {
    return word.split('').join(' ');
}

// دالة فحص صلاحيات التحكم (الأدمن + الرول المخصص)
function isStaff(member) {
    if (!member) return false;
    const hasAdmin = member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageMessages);
    const hasCustomRole = allowedRoleId && member.roles.cache.has(allowedRoleId);
    return hasAdmin || hasCustomRole;
}

// ==================== تعريف الأوامر بالكامل ====================

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
        .setName('addpoints')
        .setDescription('إضافة نقاط لعضو معين (للمشرفين أو رول التحكم)')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('العضو المراد إضافة النقاط له')
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('points')
                .setDescription('عدد النقاط المراد إضافتها')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('resetpoints')
        .setDescription('تصفير نقاط عضو')
        .addUserOption(option => option.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder()
        .setName('resetallpoints')
        .setDescription('تصفير نقاط الجميع'),
    new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('تحديد الرول المسموح له بالتحكم الكامل بالبوت والألعاب (للأدمن فقط)')
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('اختر الرول')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1533411298577088604';
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ تم تسجيل الدخول باسم: ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✨ تم تحديث الأوامر بنجاح.');
    } catch (error) {
        console.error('❌ خطأ في تحديث الأوامر:', error);
    }
});

// مؤقت الألعاب النصية (30 ثانية)
function setGameTimeout(channel) {
    if (activeGame && activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
    
    activeGame.timeoutTimer = setTimeout(async () => {
        if (!activeGame) return;
        activeGame.missedCount = (activeGame.missedCount || 0) + 1;

        if (activeGame.missedCount >= 2) {
            await channel.send(`⏰ انتهى الوقت! لم يتفاعل أحد مرتين متتاليتين، تم إيقاف اللعبة.`);
            activeGame = null;
        } else {
            await channel.send(`⏰ انتهى الوقت! لم يقدم أحد الإجابة، جاري إرسال كلمة أخرى...`);
            const nextWord = getUniqueWord();
            
            if (activeGame.type === 'سرعة') {
                activeGame.answer = nextWord;
                setGameTimeout(channel);
                const embed = new EmbedBuilder()
                    .setColor(0x112233)
                    .setTitle('سرعة')
                    .setDescription(`أسرع شخص يكتب الكلمة الموجودة تحت يفوز في اللعبة\n\n# ${nextWord}\n\n*(النقاط: ${activeGame.points})*`);
                return channel.send({ embeds: [embed] });
            } else if (activeGame.type === 'فك') {
                activeGame.answer = makeSpaced(nextWord);
                setGameTimeout(channel);
                const embed = new EmbedBuilder()
                    .setColor(0x112233)
                    .setTitle('فك الكلمات')
                    .setDescription(`أسرع شخص يفكك الكلمة التالية:\n\n# ${nextWord}\n\n*(النقاط: ${activeGame.points})*`);
                return channel.send({ embeds: [embed] });
            } else if (activeGame.type === 'أدمج') {
                activeGame.answer = nextWord;
                setGameTimeout(channel);
                const embed = new EmbedBuilder()
                    .setColor(0x112233)
                    .setTitle('أدمج الحروف')
                    .setDescription(`أسرع شخص يدمج الحروف لتصبح كلمة:\n\n# ${makeSpaced(nextWord)}\n\n*(النقاط: ${activeGame.points})*`);
                return channel.send({ embeds: [embed] });
            }
        }
    }, 30000);
}

// مؤقت الأعلام (30 ثانية)
async function sendNextFlag(channel) {
    if (!activeGame || activeGame.type !== 'أعلام') return;
    if (activeGame.timer) clearTimeout(activeGame.timer);

    const randomFlag = getUniqueFlag();
    activeGame.answer = randomFlag.name;

    const flagEmbed = new EmbedBuilder()
        .setColor(0x112233)
        .setTitle('🎮 لعبة الأعلام')
        .setDescription('**أسرع شخص يخمن اسم العلم الموجود بالأسفل!**')
        .setImage(`https://flagcdn.com/w640/${randomFlag.code}.png`);

    const sentMessage = await channel.send({ embeds: [flagEmbed] });
    activeGame.messageId = sentMessage.id;

    activeGame.timer = setTimeout(async () => {
        if (!activeGame || activeGame.type !== 'أعلام') return;
        activeGame.missedCount = (activeGame.missedCount || 0) + 1;

        if (activeGame.missedCount >= 2) {
            await channel.send(`⏰ انتهى الوقت! لم يقدم أحد الإجابة الصحيحة مرتين متتاليتين. الإجابة كانت: **${randomFlag.name}**\nتم إيقاف اللعبة.`);
            activeGame = null;
        } else {
            await channel.send(`⏰ انتهى الوقت! لم يقدم أحد الإجابة الصحيحة. الإجابة كانت: **${randomFlag.name}**\nجاري إرسال علم جديد...`);
            sendNextFlag(channel);
        }
    }, 30000);
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // أمر "وقف" بالشات (محمي للمشرفين أو رول التحكم)
    if (message.content === 'وقف') {
        if (!isStaff(message.member)) {
            return message.reply({ content: '❌ هذا الأمر مخصص للمشرفين أو رول التحكم المخصص فقط!', ephemeral: true });
        }
        if (activeGame) {
            if (activeGame.timer) clearTimeout(activeGame.timer);
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
        }
        activeGame = null;
        return message.reply('تم إيقاف اللعبة.');
    }

    // أمر "توب" بالشات (بثيم وألوان السيرفر الفضائية والتروويز المأخوذة من الشعار، مع الأطر المنفصلة)
    if (message.content === 'توب') {
        if (userPoints.size === 0) {
            return message.reply('لا توجد أي نقاط مسجلة حتى الآن!');
        }

        const sortedUsers = Array.from(userPoints.entries())
            .sort((a, b) => b[1] - a[1]);

        let description = '';
        sortedUsers.forEach(([userId, points], index) => {
            let rankEmoji = `#${index + 1}`;
            if (index === 0) rankEmoji = '🥇';
            else if (index === 1) rankEmoji = '🥈';
            else if (index === 2) rankEmoji = '🥉';

            // تصميم الأطر لكل شخصية بنفس الستايل المطلوب
            description += `╭ ${rankEmoji} ── <@${userId}>\n╰ 💎 الرصيد: **${points}** نقطة\n\n`;
        });

        const guildName = message.guild ? message.guild.name : 'MVP';
        const guildIcon = message.guild ? message.guild.iconURL({ dynamic: true, size: 1024 }) : null;

        const topEmbed = new EmbedBuilder()
            .setColor(0x0D2B3F) // لون داكن مستوحى من خلفية الفضاء وثيم السيرفر
            .setAuthor({ 
                name: `🌌 ${guildName} 🌌`, 
                iconURL: guildIcon 
            })
            .setTitle('🏆 قـائمـة صـداره الـترتيـب')
            .setDescription(description)
            .setFooter({ text: 'MVP System • ثيم السيرفر الرسمي' })
            .setTimestamp();

        return message.reply({ embeds: [topEmbed] });
    }

    if (activeGame) {
        let userAns = message.content.trim().replace(/\s+/g, '').replace(/أ|إ|آ/g, 'ا');
        let correctAns = activeGame.answer.trim().replace(/\s+/g, '').replace(/أ|إ|آ/g, 'ا');

        if (userAns === correctAns) {
            activeGame.missedCount = 0;

            const userId = message.author.id;
            const currentPoints = userPoints.get(userId) || 0;
            const totalPoints = currentPoints + activeGame.points;
            userPoints.set(userId, totalPoints);

            if (activeGame.type === 'سرعة') {
                await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
                const nextWord = getUniqueWord();
                activeGame.answer = nextWord;
                setGameTimeout(message.channel);
                const embed = new EmbedBuilder()
                    .setColor(0x112233)
                    .setTitle('سرعة')
                    .setDescription(`أسرع شخص يكتب الكلمة الموجودة تحت يفوز في اللعبة\n\n# ${nextWord}\n\n*(النقاط: ${activeGame.points})*`);
                return message.channel.send({ embeds: [embed] });
            }

            if (activeGame.type === 'فك') {
                await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
                const nextWord = getUniqueWord();
                activeGame.answer = makeSpaced(nextWord);
                setGameTimeout(message.channel);
                const embed = new EmbedBuilder()
                    .setColor(0x112233)
                    .setTitle('فك الكلمات')
                    .setDescription(`أسرع شخص يفكك الكلمة التالية:\n\n# ${nextWord}\n\n*(النقاط: ${activeGame.points})*`);
                return message.channel.send({ embeds: [embed] });
            }

            if (activeGame.type === 'أدمج') {
                await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
                const nextWord = getUniqueWord();
                activeGame.answer = nextWord;
                setGameTimeout(message.channel);
                const embed = new EmbedBuilder()
                    .setColor(0x112233)
                    .setTitle('أدمج الحروف')
                    .setDescription(`أسرع شخص يدمج الحروف لتصبح كلمة:\n\n# ${makeSpaced(nextWord)}\n\n*(النقاط: ${activeGame.points})*`);
                return message.channel.send({ embeds: [embed] });
            }

            if (activeGame.type === 'أعلام') {
                if (activeGame.timer) clearTimeout(activeGame.timer);
                await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
                return sendNextFlag(message.channel);
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
            .setColor(0x0D2B3F)
            .addFields(
                { name: '/play', value: 'بدء لعبة وتحديد النقاط' },
                { name: '/stop', value: 'إيقاف اللعبة' },
                { name: '/games', value: 'عرض الألعاب' },
                { name: '/points', value: 'عرض النقاط' },
                { name: '/addpoints', value: 'إضافة نقاط لعضو محدد' },
                { name: '/setrole', value: 'تحديد رول التحكم المخصص (خاص بالأدمن)' }
            );
        await interaction.reply({ embeds: [helpEmbed] });
    } 
    else if (commandName === 'games') {
        await interaction.reply(`الألعاب المتوفرة:\n\`سرعة\` | \`فك\` | \`أدمج\` | \`أعلام\` | \`روليت\``);
    } 
    else if (commandName === 'setrole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي السيرفر (Administrator) فقط!', ephemeral: true });
        }
        const role = interaction.options.getRole('role');
        allowedRoleId = role.id;
        await interaction.reply(`✅ تم تعيين رول <@&${role.id}> بنجاح! يمكن لأصحاب هذا الرول الآن تشغيل وإيقاف الألعاب وإدارة النقاط.`);
    }
    else if (commandName === 'play') {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ ليس لديك الصلاحية لبدء الألعاب! يتطلب رول التحكم المخصص أو الإشراف.', ephemeral: true });
        }

        const gameType = interaction.options.getString('game');
        const customPoints = interaction.options.getInteger('points');

        if (activeGame) {
            if (activeGame.timer) clearTimeout(activeGame.timer);
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
        }

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
            const word = getUniqueWord();
            activeGame = { type: 'سرعة', answer: word, points: customPoints, missedCount: 0 };
            setGameTimeout(interaction.channel);
            const embed = new EmbedBuilder()
                .setColor(0x112233)
                .setTitle('سرعة')
                .setDescription(`أسرع شخص يكتب الكلمة الموجودة تحت يفوز في اللعبة\n\n# ${word}\n\n*(النقاط: ${customPoints})*`);
            await interaction.reply({ embeds: [embed] });
        } 
        else if (gameType === 'فك') {
            const word = getUniqueWord();
            activeGame = { type: 'فك', answer: makeSpaced(word), points: customPoints, missedCount: 0 };
            setGameTimeout(interaction.channel);
            const embed = new EmbedBuilder()
                .setColor(0x112233)
                .setTitle('فك الكلمات')
                .setDescription(`أسرع شخص يفكك الكلمة التالية:\n\n# ${word}\n\n*(النقاط: ${customPoints})*`);
            await interaction.reply({ embeds: [embed] });
        } 
        else if (gameType === 'أدمج') {
            const word = getUniqueWord();
            activeGame = { type: 'أدمج', answer: word, points: customPoints, missedCount: 0 };
            setGameTimeout(interaction.channel);
            const embed = new EmbedBuilder()
                .setColor(0x112233)
                .setTitle('أدمج الحروف')
                .setDescription(`أسرع شخص يدمج الحروف لتصبح كلمة:\n\n# ${makeSpaced(word)}\n\n*(النقاط: ${customPoints})*`);
            await interaction.reply({ embeds: [embed] });
        }
        else if (gameType === 'أعلام') {
            activeGame = { type: 'أعلام', points: customPoints, missedCount: 0 };
            await interaction.reply('🎮 جاري بدء لعبة الأعلام...');
            await sendNextFlag(interaction.channel);
        }
    }
    else if (commandName === 'stop') {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص للمشرفين أو رول التحكم فقط!', ephemeral: true });
        }
        if (activeGame) {
            if (activeGame.timer) clearTimeout(activeGame.timer);
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
        }
        activeGame = null;
        await interaction.reply('تم إيقاف اللعبة.');
    }
    else if (commandName === 'points') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const points = userPoints.get(targetUser.id) || 0;
        await interaction.reply(`نقاط <@${targetUser.id}>: ${points}`);
    }
    else if (commandName === 'addpoints') {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص للمشرفين أو رول التحكم فقط!', ephemeral: true });
        }
        const targetUser = interaction.options.getUser('user');
        const pointsToAdd = interaction.options.getInteger('points');
        
        const currentPoints = userPoints.get(targetUser.id) || 0;
        const newTotal = currentPoints + pointsToAdd;
        userPoints.set(targetUser.id, newTotal);

        await interaction.reply(`✅ تم إضافة **${pointsToAdd}** نقطة بنجاح إلى العضو <@${targetUser.id}>! (إجمالي نقاطه الآن: **${newTotal}**).`);
    }
    else if (commandName === 'resetpoints') {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص للمشرفين أو رول التحكم فقط!', ephemeral: true });
        }
        const targetUser = interaction.options.getUser('user');
        userPoints.set(targetUser.id, 0);
        await interaction.reply(`تم تصفير نقاط <@${targetUser.id}>.`);
    }
    else if (commandName === 'resetallpoints') {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص للمشرفين أو رول التحكم فقط!', ephemeral: true });
        }
        userPoints.clear();
        await interaction.reply('تم تصفير نقاط الجميع.');
    }
});

client.login(TOKEN);
