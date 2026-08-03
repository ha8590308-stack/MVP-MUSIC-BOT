const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gifencoder');
const express = require('express');
const fs = require('fs');
const path = require('path');

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

const DB_FILE = path.join(__dirname, 'database.json');

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            const json = JSON.parse(data);
            return {
                points: new Map(json.points || []),
                allowedRoleId: json.allowedRoleId || null
            };
        }
    } catch (e) {
        console.error('خطأ في قراءة قاعدة البيانات:', e);
    }
    return { points: new Map(), allowedRoleId: null };
}

function saveDatabase() {
    try {
        const data = {
            points: Array.from(userPoints.entries()),
            allowedRoleId: allowedRoleId
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('خطأ في حفظ قاعدة البيانات:', e);
    }
}

const db = loadDatabase();
const userPoints = db.points;
let allowedRoleId = db.allowedRoleId;

let activeGame = null;

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

const baseWordsList = [
    'برمجة', 'ديسكورد', 'سيرفر', 'كمبيوتر', 'ماوس', 'شاشة', 'تحديث', 'كود', 'جيمنق', 'بطولة', 
    'فوز', 'لعبة', 'حاسب', 'شبكة', 'تطبيق', 'مطور', 'قناة', 'رومات', 'تفاعل', 'شات', 
    'سماعة', 'لوحة', 'مفاتيح', 'صوت', 'تحكم', 'مشرف', 'عضو', 'مسابقة',
    'تقنية', 'هاتف', 'متصفح', 'تخزين', 'معالج', 'بطاقة', 'رسومات', 'تنزيل', 'اتصال', 'حماية',
    'منتصر', 'محترف', 'تطبيقات', 'ديوانية', 'سعودية', 'رياضيات', 'فيزياء', 'تاريخ', 'مستقبل', 'فضاء'
];

let availableWords = [];
let availableFlags = [];

function shuffleArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getUniqueWord() {
    if (availableWords.length === 0) availableWords = shuffleArray(baseWordsList);
    return availableWords.pop();
}

function getUniqueFlag() {
    if (availableFlags.length === 0) availableFlags = [...allFlagsList];
    const index = Math.floor(Math.random() * availableFlags.length);
    return availableFlags.splice(index, 1)[0];
}

function makeSpaced(word) {
    return word.split('').join(' ');
}

function isStaff(member) {
    if (!member) return false;
    const hasAdmin = member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageMessages);
    const hasCustomRole = allowedRoleId && member.roles.cache.has(allowedRoleId);
    return hasAdmin || hasCustomRole;
}

// دالة رسم الإطار الواحد لعجلة الروليت
function drawWheelFrame(ctx, width, height, players, clientInstance, guildId, rotation, centerUserId, isFinal) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 210;
    const sliceAngle = (2 * Math.PI) / players.length;

    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, width, height);

    const sliceColors = ['#2563eb', '#3b82f6', '#1d4ed8', '#1e40af'];

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.translate(-centerX, -centerY);

    for (let i = 0; i < players.length; i++) {
        const startAngle = i * sliceAngle;
        const endAngle = (i + 1) * sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
        ctx.closePath();

        ctx.fillStyle = sliceColors[i % sliceColors.length];
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        const midAngle = startAngle + (sliceAngle / 2);
        ctx.rotate(midAngle);

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        
        let displayName = players[i];
        ctx.fillText(displayName, radius - 30, 0);
        ctx.restore();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.stroke();

    const centerRadius = 55;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(centerX - centerRadius, centerY - centerRadius, centerRadius * 2, centerRadius * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - 4, centerY - 15);
    ctx.lineTo(width - 28, centerY);
    ctx.lineTo(width - 4, centerY + 15);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

// دالة توليد وعرض حركة الدوران كـ GIF متحرك
async function generateSpinningGif(players, clientInstance, guildId, luckyPlayerId) {
    const width = 500;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const encoder = new GIFEncoder(width, height);
    encoder.start();
    encoder.setRepeat(0); 
    encoder.setDelay(70); 
    encoder.setQuality(10);

    const totalFrames = 18; 
    const sliceAngle = (2 * Math.PI) / players.length;
    const luckyIndex = players.indexOf(luckyPlayerId);
    const finalAngle = 5 * (2 * Math.PI) + (2 * Math.PI - (luckyIndex * sliceAngle + sliceAngle / 2));

    for (let f = 0; f < totalFrames; f++) {
        let progress = f / totalFrames;
        let currentRotation = finalAngle * Math.pow(progress, 2); 
        
        drawWheelFrame(ctx, width, height, players, clientInstance, guildId, currentRotation, luckyPlayerId, f === totalFrames - 1);
        encoder.addFrame(ctx);
    }

    encoder.finish();
    const buffer = encoder.out.getData();
    return new AttachmentBuilder(buffer, { name: 'roulette.gif' });
}

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
        .setDescription('إضافة نقاط لعضو معين')
        .addUserOption(option => option.setName('user').setDescription('العضو').setRequired(true))
        .addIntegerOption(option => option.setName('points').setDescription('النقاط').setRequired(true)),
    new SlashCommandBuilder()
        .setName('resetpoints')
        .setDescription('تصفير نقاط عضو')
        .addUserOption(option => option.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('resetallpoints').setDescription('تصفير نقاط الجميع'),
    new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('تحديد رول التحكم')
        .addRoleOption(option => option.setName('role').setDescription('الرول').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1533411298577088604';
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول باسم: ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('تم تحديث الأوامر بنجاح.');
    } catch (error) {
        console.error('خطأ في تحديث الأوامر:', error);
    }
});

function setGameTimeout(channel) {
    if (activeGame && activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
    
    activeGame.timeoutTimer = setTimeout(async () => {
        if (!activeGame || activeGame.isProcessing) return; 
        activeGame.isProcessing = true;
        activeGame.missedCount = (activeGame.missedCount || 0) + 1;

        if (activeGame.missedCount >= 2) {
            await channel.send(`انتهى الوقت! لم يتفاعل أحد مرتين متتاليتين، تم إيقاف اللعبة.`);
            activeGame = null;
        } else {
            await channel.send(`انتهى الوقت! لم يقدم أحد الإجابة، جاري إرسال كلمة أخرى...`);
            const nextWord = getUniqueWord();
            activeGame.isProcessing = false;
            activeGame.answer = nextWord;
            setGameTimeout(channel);
            const embed = new EmbedBuilder().setColor(0x57F287).setTitle('سرعة').setDescription(`أسرع شخص يكتب الكلمة:\n\n# ${nextWord}\n\n*(النقاط: ${activeGame.points})*`);
            return channel.send({ embeds: [embed] });
        }
    }, 30000);
}

async function sendNextFlag(channel) {
    if (!activeGame || activeGame.type !== 'أعلام') return;
    if (activeGame.timer) clearTimeout(activeGame.timer);

    const randomFlag = getUniqueFlag();
    activeGame.answer = randomFlag.name;
    activeGame.isProcessing = false;

    const flagEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('لعبة الأعلام')
        .setDescription('**أسرع شخص يخمن اسم العلم الموجود بالأسفل!**')
        .setImage(`https://flagcdn.com/w640/${randomFlag.code}.png`);

    const sentMessage = await channel.send({ embeds: [flagEmbed] });
    activeGame.messageId = sentMessage.id;

    activeGame.timer = setTimeout(async () => {
        if (!activeGame || activeGame.type !== 'أعلام' || activeGame.isProcessing) return;
        activeGame.isProcessing = true;
        activeGame.missedCount = (activeGame.missedCount || 0) + 1;

        if (activeGame.missedCount >= 2) {
            await channel.send(`انتهى الوقت! الإجابة كانت: **${randomFlag.name}**\nتم إيقاف اللعبة.`);
            activeGame = null;
        } else {
            await channel.send(`انتهى الوقت! الإجابة كانت: **${randomFlag.name}**\nجاري إرسال علم جديد...`);
            sendNextFlag(channel);
        }
    }, 30000);
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === 'وقف') {
        if (!isStaff(message.member)) return message.reply({ content: 'للمشرفين فقط!', ephemeral: true });
        if (activeGame) {
            if (activeGame.timer) clearTimeout(activeGame.timer);
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
        }
        activeGame = null;
        return message.reply('تم إيقاف اللعبة.');
    }

    if (message.content === 'توب') {
        if (userPoints.size === 0) return message.reply('لا توجد نقاط مسجلة حالياً!');

        const sortedUsers = Array.from(userPoints.entries()).sort((a, b) => b[1] - a[1]);
        let description = '';
        sortedUsers.forEach(([userId, points], index) => {
            description += `#${index + 1} | <@${userId}> ── **${points}** نقطة\n`;
        });

        const topEmbed = new EmbedBuilder().setColor(0xFEE75C).setTitle('قائمة صدارة الترتيب').setDescription(description).setTimestamp();
        return message.reply({ embeds: [topEmbed] });
    }

    if (activeGame) {
        if (activeGame.isProcessing) return;

        let userAns = message.content.trim().replace(/\s+/g, '').replace(/أ|إ|آ/g, 'ا');
        let correctAns = activeGame.answer.trim().replace(/\s+/g, '').replace(/أ|إ|آ/g, 'ا');

        if (userAns === correctAns) {
            activeGame.isProcessing = true;
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
            if (activeGame.timer) clearTimeout(activeGame.timer);
            activeGame.missedCount = 0;

            const userId = message.author.id;
            const totalPoints = (userPoints.get(userId) || 0) + activeGame.points;
            userPoints.set(userId, totalPoints);
            saveDatabase();

            await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
            
            if (activeGame.type === 'سرعة' || activeGame.type === 'فك' || activeGame.type === 'أدمج') {
                const nextWord = getUniqueWord();
                activeGame.answer = nextWord;
                activeGame.isProcessing = false;
                setGameTimeout(message.channel);
                const embed = new EmbedBuilder().setColor(0x57F287).setTitle(activeGame.type).setDescription(`أسرع شخص يكتب الكلمة:\n\n# ${nextWord}\n\n*(النقاط: ${activeGame.points})*`);
                return message.channel.send({ embeds: [embed] });
            } else if (activeGame.type === 'أعلام') {
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
            .setColor(0x0099FF)
            .setDescription('/play لبدء لعبة جديدة\n/stop لإيقاف اللعبة\n/games لعرض الألعاب\n/points لعرض النقاط');
        await interaction.reply({ embeds: [helpEmbed] });
    } 
    else if (commandName === 'games') {
        await interaction.reply(`الألعاب المتوفرة:\n\`سرعة\` | \`فك\` | \`أدمج\` | \`أعلام\` | \`روليت\``);
    } 
    else if (commandName === 'setrole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'للأدمن فقط', ephemeral: true });
        allowedRoleId = interaction.options.getRole('role').id;
        saveDatabase();
        await interaction.reply(`تم تعيين رول التحكم بنجاح وحفظه بشكل دائم.`);
    }
    else if (commandName === 'play') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'ليس لديك صلاحية.', ephemeral: true });

        const gameType = interaction.options.getString('game');
        const customPoints = interaction.options.getInteger('points');

        if (activeGame) {
            if (activeGame.timer) clearTimeout(activeGame.timer);
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
        }

        if (gameType === 'روليت') {
            const participants = new Set();
            const joinButton = new ButtonBuilder().setCustomId('join_roulette').setLabel('انضمام للعبة').setStyle(ButtonStyle.Success);
            const row = new ActionRowBuilder().addComponents(joinButton);
            
            const msg = await interaction.reply({ 
                embeds: [new EmbedBuilder().setColor(0x2563eb).setTitle('لعبة الروليت').setDescription('اضغط الزر أدناه للانضمام')], 
                components: [row], 
                fetchReply: true 
            });

            const collector = msg.createMessageComponentCollector({ time: 15000 });
            collector.on('collect', async i => {
                if (!participants.has(i.user.id)) {
                    participants.add(i.user.id);
                    await i.reply({ content: 'تم انضمامك بنجاح.', ephemeral: true });
                } else {
                    await i.reply({ content: 'أنت منضم مسبقاً!', ephemeral: true });
                }
            });

            collector.on('end', async () => {
                let players = Array.from(participants);
                if (players.length === 0) return interaction.editReply({ content: 'انتهى الوقت بدون مشاركين.', embeds: [], components: [] });
                if (players.length === 1) {
                    userPoints.set(players[0], (userPoints.get(players[0]) || 0) + customPoints);
                    saveDatabase();
                    return interaction.editReply({ content: `فاز اللاعب <@${players[0]}> تلقائياً بـ ${customPoints} نقطة لعدم وجود منافسين!`, embeds: [], components: [] });
                }

                const playersListText = players.map(id => `<@${id}>`).join('\n');
                await interaction.editReply({ 
                    content: `تم انتهاء التسجيل، اللاعبون المشاركون:\n${playersListText}`, 
                    embeds: [], 
                    components: [] 
                });

                const runRouletteRound = async () => {
                    if (players.length <= 1) {
                        userPoints.set(players[0], (userPoints.get(players[0]) || 0) + customPoints);
                        saveDatabase();
                        return interaction.followUp({ content: `انتهت لعبة الروليت! الفائز الأخير هو <@${players[0]}> وحصل على ${customPoints} نقطة!` });
                    }

                    const luckyPlayerIndex = Math.floor(Math.random() * players.length);
                    const luckyPlayerId = players[luckyPlayerIndex];

                    let displayNames = [];
                    const guild = client.guilds.cache.get(interaction.guildId);
                    for (const id of players) {
                        let name = id;
                        if (guild) {
                            const member = await guild.members.fetch(id).catch(() => null);
                            if (member) name = member.displayName;
                        }
                        if (name.length > 10) name = name.substring(0, 8) + '..';
                        displayNames.push(name);
                    }

                    const gifAttachment = await generateSpinningGif(displayNames, client, interaction.guildId, displayNames[luckyPlayerIndex]);
                    const gifEmbed = new EmbedBuilder()
                        .setColor(0x2563eb)
                        .setTitle('🎡 عجلة الروليت تدور...')
                        .setImage('attachment://roulette.gif');

                    const targetOptions = players.filter(id => id !== luckyPlayerId).map(id => ({ label: `طرد اللاعب`, value: id }));
                    let componentsRow = [];
                    if (targetOptions.length > 0) {
                        const selectMenu = new StringSelectMenuBuilder().setCustomId(`kick_${luckyPlayerId}`).setPlaceholder('اختر لاعباً لطرده').addOptions(targetOptions);
                        componentsRow = [new ActionRowBuilder().addComponents(selectMenu)];
                    }

                    let currentMsg = await interaction.followUp({ 
                        content: `🎡 استقرت العجلة على: <@${luckyPlayerId}>`, 
                        embeds: [gifEmbed], 
                        files: [gifAttachment], 
                        components: componentsRow 
                    });

                    if (targetOptions.length > 0) {
                        const choiceCollector = currentMsg.createMessageComponentCollector({ filter: i => i.user.id === luckyPlayerId, time: 15000, max: 1 });
                        choiceCollector.on('collect', async i => {
                            const kickedId = i.values[0];
                            players = players.filter(id => id !== kickedId);
                            await i.update({ content: `تم طرد اللاعب <@${kickedId}>`, embeds: [], files: [], components: [] });
                        });
                        choiceCollector.on('end', async collected => {
                            if (collected.size === 0 && players.length > 1) {
                                const kickedId = players.find(id => id !== luckyPlayerId);
                                players = players.filter(id => id !== kickedId);
                                try {
                                    await currentMsg.edit({ content: `انتهى الوقت وتم طرد <@${kickedId}> تلقائياً`, embeds: [], components: [], files: [] });
                                } catch (e) {}
                            }
                            setTimeout(runRouletteRound, 2000);
                        });
                    }
                };
                setTimeout(runRouletteRound, 1000);
            });
            return;
        }

        if (gameType === 'سرعة' || gameType === 'فك' || gameType === 'أدمج') {
            const word = getUniqueWord();
            activeGame = { type: gameType, answer: gameType === 'سرعة' ? word : makeSpaced(word), points: customPoints, missedCount: 0, isProcessing: false };
            setGameTimeout(interaction.channel);
            const embed = new EmbedBuilder().setColor(0x57F287).setTitle(gameType).setDescription(`أسرع شخص:\n\n# ${word}\n\n*(النقاط: ${customPoints})*`);
            await interaction.reply({ embeds: [embed] });
        }
        else if (gameType === 'أعلام') {
            activeGame = { type: 'أعلام', points: customPoints, missedCount: 0, isProcessing: false };
            await interaction.reply('جاري بدء لعبة الأعلام...');
            await sendNextFlag(interaction.channel);
        }
    }
    else if (commandName === 'stop') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'للإشراف فقط', ephemeral: true });
        if (activeGame) {
            if (activeGame.timer) clearTimeout(activeGame.timer);
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
        }
    }
    else if (commandName === 'points') {
        const target = interaction.options.getUser('user') || interaction.user;
        await interaction.reply(`نقاط <@${target.id}>: ${userPoints.get(target.id) || 0}`);
    }
    else if (commandName === 'addpoints') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'للإشراف فقط', ephemeral: true });
        const target = interaction.options.getUser('user');
        const pts = interaction.options.getInteger('points');
        userPoints.set(target.id, (userPoints.get(target.id) || 0) + pts);
        saveDatabase();
        await interaction.reply(`تمت الإضافة لـ <@${target.id}> وحفظها.`);
    }
    else if (commandName === 'resetpoints') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'للإشراف فقط', ephemeral: true });
        const target = interaction.options.getUser('user');
        userPoints.set(target.id, 0);
        saveDatabase();
        await interaction.reply(`تم تصفير نقاط <@${target.id}>.`);
    }
    else if (commandName === 'resetallpoints') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'للإشراف فقط', ephemeral: true });
        userPoints.clear();
        saveDatabase();
        await interaction.reply('تم تصفير نقاط الجميع.');
    }
});

client.login(TOKEN);
