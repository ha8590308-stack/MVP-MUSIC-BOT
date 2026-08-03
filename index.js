const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { MongoClient } = require('mongodb');
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

const uri = process.env.MONGO_URI; 
const dbClient = new MongoClient(uri);

let db, pointsCollection, settingsCollection;
let userPoints = new Map();
let allowedRoleId = null;

async function connectDB() {
    try {
        await dbClient.connect();
        db = dbClient.db('bot_database');
        pointsCollection = db.collection('points');
        settingsCollection = db.collection('settings');
        console.log("Connected to MongoDB successfully!");

        const allPoints = await pointsCollection.find({}).toArray();
        userPoints.clear();
        allPoints.forEach(doc => userPoints.set(doc.userId, doc.points));

        const settings = await settingsCollection.findOne({ _id: 'config' });
        if (settings) {
            allowedRoleId = settings.allowedRoleId || null;
        }
    } catch (e) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', e);
    }
}
connectDB();

async function savePointsToDB(userId, points) {
    userPoints.set(userId, points);
    try {
        await pointsCollection.updateOne(
            { userId: userId },
            { $set: { points: points } },
            { upsert: true }
        );
    } catch (e) {}
}

async function saveSettingsToDB() {
    try {
        await settingsCollection.updateOne(
            { _id: 'config' },
            { $set: { allowedRoleId: allowedRoleId } },
            { upsert: true }
        );
    } catch (e) {}
}

async function clearUserPointsDB(userId) {
    userPoints.set(userId, 0);
    try {
        await pointsCollection.updateOne(
            { userId: userId },
            { $set: { points: 0 } },
            { upsert: true }
        );
    } catch (e) {}
}

async function resetAllPointsDB() {
    userPoints.clear();
    try {
        await pointsCollection.deleteMany({});
    } catch (e) {}
}

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

const hugeWordsList = [
    'برمجة', 'ديسكورد', 'سيرفر', 'كمبيوتر', 'ماوس', 'شاشة', 'تحديث', 'كود', 'جيمنق', 'بطولة', 
    'فوز', 'لعبة', 'حاسب', 'شبكة', 'تطبيق', 'مطور', 'قناة', 'رومات', 'تفاعل', 'شات', 
    'سماعة', 'لوحة', 'مفاتيح', 'صوت', 'تحكم', 'مشرف', 'عضو', 'مسابقة', 'تقنية', 'هاتف', 
    'متصفح', 'تخزين', 'معالج', 'بطاقة', 'رسومات', 'تنزيل', 'اتصال', 'حماية', 'منتصر', 'محترف', 
    'تطبيقات', 'ديوانية', 'سعودية', 'رياضيات', 'فيزياء', 'تاريخ', 'مستقبل', 'فضاء', 'عالم', 'خوارزمية',
    'استضافة', 'متجر', 'تصميم', 'برمجيات', 'فريق', 'منافسة', 'ترتيب', 'صدارة', 'نقاط', 'مستوى',
    'تطوير', 'تأمين', 'اختراق', 'ثغرة', 'دفاع', 'هجوم', 'استراتيجية', 'خطة', 'نجاح', 'إنجاز',
    'مفتاح', 'نافذة', 'قائمة', 'خيارات', 'تفعيل', 'إيقاف', 'تشغيل', 'تغيير', 'حفظ', 'بحث',
    'استعلام', 'قاعدة', 'بيانات', 'ملف', 'مجلد', 'موقع', 'إنترنت', 'سرعة', 'أداء', 'استجابة',
    'جاوا', 'بايثون', 'ريأكت', 'جافاسكريبت', 'نود', 'تليجرام', 'يوتيوب', 'تويتر', 'تيكتوك', 'انستغرام',
    'سحابية', 'مرن', 'سريع', 'ذكي', 'اصطناعي', 'توجيه', 'تنسيق', 'ترجمة', 'تواصل', 'محادثة',
    'مشاهدة', 'استماع', 'أغنية', 'نغمة', 'صوتيات', 'مرئيات', 'بث', 'مباشر', 'تسجيل', 'دخول',
    'خروج', 'تسجيل', 'حساب', 'كلمة', 'مرور', 'تحقق', 'بصمة', 'صلاحية', 'مشرف', 'مدير',
    'منسق', 'مساعد', 'رئيسي', 'فرعي', 'عام', 'خاص', 'مجموعة', 'فردي', 'جماعي', 'شارك',
    'تفاعل', 'ارسل', 'استقبل', 'نسخ', 'لصق', 'حذف', 'تعديل', 'إضافة', 'تأكيد', 'رجوع',
    'تقدم', 'استمرار', 'توقف', 'انتظار', 'جاهز', 'انطلق', 'ابدأ', 'انتهي', 'سؤال', 'جواب',
    'حل', 'مشكلة', 'خطأ', 'صواب', 'دقيق', 'ممتاز', 'جيد', 'سيء', 'ضعيف', 'قوي'
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
    if (availableWords.length === 0) availableWords = shuffleArray(hugeWordsList);
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
                    { name: 'أعلام', value: 'أعلام' }
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

function getGamePayload(gameType) {
    let answerText, displayText;
    if (gameType === 'سرعة') {
        const isTwoWords = Math.random() < 0.5;
        if (isTwoWords) {
            const w1 = getUniqueWord();
            const w2 = getUniqueWord();
            answerText = `${w1} ${w2}`;
            displayText = `# ${w1} ${w2}`;
        } else {
            const w = getUniqueWord();
            answerText = w;
            displayText = `# ${w}`;
        }
    } else if (gameType === 'فك') {
        const w = getUniqueWord();
        answerText = makeSpaced(w);
        displayText = `# ${answerText}`;
    } else if (gameType === 'أدمج') {
        const w = getUniqueWord();
        answerText = w; 
        displayText = `# ${makeSpaced(w)}`; 
    }
    return { answerText, displayText };
}

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
            await channel.send(`انتهى الوقت! لم يقدم أحد الإجابة، جاري إرسال سؤال آخر...`);
            
            const payload = getGamePayload(activeGame.type);
            activeGame.isProcessing = false;
            activeGame.answer = payload.answerText;
            setGameTimeout(channel);
            const embed = new EmbedBuilder().setColor(0x57F287).setTitle(activeGame.type).setDescription(`أسرع شخص يكتب:\n\n${payload.displayText}\n\n*(النقاط: ${activeGame.points})*`);
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
            await savePointsToDB(userId, totalPoints);

            await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
            
            if (activeGame.type === 'سرعة' || activeGame.type === 'فك' || activeGame.type === 'أدمج') {
                const payload = getGamePayload(activeGame.type);
                activeGame.answer = payload.answerText;
                activeGame.isProcessing = false;
                setGameTimeout(message.channel);
                const embed = new EmbedBuilder().setColor(0x57F287).setTitle(activeGame.type).setDescription(`أسرع شخص يكتب:\n\n${payload.displayText}\n\n*(النقاط: ${activeGame.points})*`);
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
            .setTitle('قائمة الأوامر الشاملة')
            .setColor(0x0099FF)
            .setDescription(
                '**🎮 أوامر الألعاب:**\n' +
                '`/play` - لبدء لعبة جديدة (سرعة، فك، أدمج، أعلام)\n' +
                '`/stop` - لإيقاف اللعبة الحالية\n' +
                '`/games` - لعرض الألعاب المتوفرة\n\n' +
                '**🏆 أوامر النقاط:**\n' +
                '`/points` - لعرض نقاطك أو نقاط عضو معين\n' +
                '`/addpoints` - لإضافة نقاط لعضو معين (للإشراف)\n' +
                '`/resetpoints` - لتصفير نقاط عضو محدد (للإشراف)\n' +
                '`/resetallpoints` - لتصفير نقاط الجميع (للإشراف)\n' +
                'كلمة `توب` - لعرض صدارة الترتيب في الشات\n\n' +
                '**⚙️ أوامر الإدارة:**\n' +
                '`/setrole` - تحديد رول التحكم بالبوت (للأدمن)'
            );
        await interaction.reply({ embeds: [helpEmbed] });
    } 
    else if (commandName === 'games') {
        await interaction.reply(`الألعاب المتوفرة:\n\`سرعة\` | \`فك\` | \`أدمج\` | \`أعلام\``);
    } 
    else if (commandName === 'setrole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'للأدمن فقط', ephemeral: true });
        allowedRoleId = interaction.options.getRole('role').id;
        await saveSettingsToDB();
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

        if (gameType === 'سرعة' || gameType === 'فك' || gameType === 'أدمج') {
            const payload = getGamePayload(gameType);
            activeGame = { type: gameType, answer: payload.answerText, points: customPoints, missedCount: 0, isProcessing: false };
            setGameTimeout(interaction.channel);
            const embed = new EmbedBuilder().setColor(0x57F287).setTitle(gameType).setDescription(`أسرع شخص:\n\n${payload.displayText}\n\n*(النقاط: ${customPoints})*`);
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
        activeGame = null;
        await interaction.reply('تم إيقاف اللعبة.');
    }
    else if (commandName === 'points') {
        const target = interaction.options.getUser('user') || interaction.user;
        await interaction.reply(`نقاط <@${target.id}>: ${userPoints.get(target.id) || 0}`);
    }
    else if (commandName === 'addpoints') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'للإشراف فقط', ephemeral: true });
        const target = interaction.options.getUser('user');
        const pts = interaction.options.getInteger('points');
        const newTotal = (userPoints.get(target.id) || 0) + pts;
        await savePointsToDB(target.id, newTotal);
        await interaction.reply(`تمت الإضافة لـ <@${target.id}> وحفظها.`);
    }
    else if (commandName === 'resetpoints') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'للإشراف فقط', ephemeral: true });
        const target = interaction.options.getUser('user');
        await clearUserPointsDB(target.id);
        await interaction.reply(`تم تصفير نقاط <@${target.id}>.`);
    }
    else if (commandName === 'resetallpoints') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'للإشراف فقط', ephemeral: true });
        await resetAllPointsDB();
        await interaction.reply('تم تصفير نقاط الجميع.');
    }
});

client.login(TOKEN);
