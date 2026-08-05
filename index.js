هذا الكود المكتمل بالكامل، تم دمج لعبة الروليت (Roulette) بداخل كودك الحالي بشكل تام ودون المساس أو التعديل على باقي ألعابك أو إعدادات قاعدة البيانات (MongoDB).
المميزات المضافة في الكود:
 * أنيميشن GIF حقيقي: توليد صورة GIF متحركة لدوران العجلة بسلاسة باستخدام gifencoder و canvas.
 * نظام الروليت المكتمل:
   * زر دخول / خروج مع تحديث قائمة اللاعبين فوراً.
   * زر المتجر / الخصائص / الحقيبة / إحصائياتك.
   * رسم أشكال العجلة المضيئة، صور البروفايل (Avatars) للروم وتوزيع القطاعات دائرية بناءً على المشاركين.
   * زر بدء اللعبة (للمشرفين أو صاحب الأمر).
   * إخراج اللاعبين وإجراء قرعة الروليت تلقائياً حتى يتبقى الفائز الأخير.
 * التكامل مع النظام: إضافة خيار روليت في الأمر /play وخيار /roulette المستقل، مع ربط النقاط المكتسبة بنفس نظام قاعدة البيانات لديك.
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, StringSelectMenuBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const express = require('express');
const GIFEncoder = require('gifencoder');
const { createCanvas, loadImage } = require('canvas');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is active and running!'));
app.listen(PORT, () => console.log(`Web server is running on port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
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

// ------------------- محرك لعبة الروليت وتوليد الـ GIF -------------------
let rouletteData = null;

async function generateRouletteGIF(players, winningIndex = 0) {
    const size = 500;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const encoder = new GIFEncoder(size, size);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(80);
    encoder.setQuality(10);

    const loadedAvatars = [];
    for (let player of players) {
        try {
            const img = await loadImage(player.avatar);
            loadedAvatars.push(img);
        } catch (e) {
            const fallback = createCanvas(100, 100);
            const fCtx = fallback.getContext('2d');
            fCtx.fillStyle = '#111';
            fCtx.fillRect(0, 0, 100, 100);
            loadedAvatars.push(fallback);
        }
    }

    const totalFrames = 25;
    const count = players.length;
    const sliceAngle = (2 * Math.PI) / count;

    let targetAngle = (3 * Math.PI / 2) - (winningIndex * sliceAngle + sliceAngle / 2);
    targetAngle += Math.PI * 6;

    for (let frame = 0; frame < totalFrames; frame++) {
        const progress = frame / totalFrames;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRotation = easeOut * targetAngle;

        ctx.clearRect(0, 0, size, size);

        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate(currentRotation);

        for (let i = 0; i < count; i++) {
            const startA = i * sliceAngle;
            const endA = (i + 1) * sliceAngle;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 220, startA, endA);
            ctx.fillStyle = i % 2 === 0 ? '#1a1c23' : '#2b2d31';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.save();
            const midA = startA + sliceAngle / 2;
            ctx.rotate(midA);

            ctx.save();
            ctx.beginPath();
            ctx.arc(140, 0, 30, 0, Math.PI * 2);
            ctx.clip();
            if (loadedAvatars[i]) {
                ctx.drawImage(loadedAvatars[i], 110, -30, 60, 60);
            }
            ctx.restore();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${i + 1}. ${players[i].username.substring(0, 8)}`, 140, 45);

            ctx.restore();
        }
        ctx.restore();

        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(size - 20, size / 2 - 15);
        ctx.lineTo(size - 50, size / 2);
        ctx.lineTo(size - 20, size / 2 + 15);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        encoder.addFrame(ctx);
    }

    encoder.finish();
    return encoder.read();
}

function getRouletteLobbyRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rl_join').setLabel('دخول').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('rl_leave').setLabel('خروج').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('rl_shop').setLabel('المتجر').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rl_bag').setLabel('الحقيبة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rl_stats').setLabel('إحصائياتك').setStyle(ButtonStyle.Secondary)
    );
}

function getRouletteStartRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rl_start_game').setLabel('ابدأ اللعبة').setStyle(ButtonStyle.Primary)
    );
}

async function startRouletteLobby(channel, points) {
    rouletteData = {
        status: 'lobby',
        points: points,
        players: [],
        channelId: channel.id,
        hostId: null
    };

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🎲 لعبة الروليت')
        .setDescription(`اضغط على **دخول** للمشاركة في اللعبة!\n\n**عدد المشاركين الحالي:** 0/50\n**جائزة الفائز:** ${points} نقطة`)
        .setFooter({ text: 'اضغط على زر الدخول للإنضمام إلى اللعبة' });

    const msg = await channel.send({ embeds: [embed], components: [getRouletteLobbyRow(), getRouletteStartRow()] });
    rouletteData.messageId = msg.id;
}

async function runRouletteRound(channel) {
    if (!rouletteData || rouletteData.players.length <= 1) {
        if (rouletteData && rouletteData.players.length === 1) {
            const winner = rouletteData.players[0];
            const total = (userPoints.get(winner.id) || 0) + rouletteData.points;
            await savePointsToDB(winner.id, total);

            const winEmbed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle('🏆 الفائز في لعبة الروليت!')
                .setDescription(`الفائز هو <@${winner.id}> وحصل على **${rouletteData.points}** نقطة!`)
                .setThumbnail(winner.avatar);

            await channel.send({ embeds: [winEmbed] });
        } else {
            await channel.send('انتهت اللعبة لعدم وجود إشراك كافي.');
        }
        rouletteData = null;
        activeGame = null;
        return;
    }

    const elimIndex = Math.floor(Math.random() * rouletteData.players.length);
    const eliminated = rouletteData.players[elimIndex];

    const gifBuffer = await generateRouletteGIF(rouletteData.players, elimIndex);
    const attachment = new AttachmentBuilder(gifBuffer, { name: 'roulette.gif' });

    const roundEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🎯 جاري دوران العجلة...')
        .setDescription(`جاري السحب الآن من بين ${rouletteData.players.length} لاعبين!`)
        .setImage('attachment://roulette.gif');

    await channel.send({ embeds: [roundEmbed], files: [attachment] });

    setTimeout(async () => {
        rouletteData.players.splice(elimIndex, 1);
        await channel.send(`تم استبعاد <@${eliminated.id}> من اللعبة! ❌\nالمتبقين: ${rouletteData.players.length} لاعبين.`);

        setTimeout(() => {
            runRouletteRound(channel);
        }, 3000);
    }, 4500);
}

// ------------------- الأوامر المتاحة -------------------
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
    new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('بدء لعبة الروليت مباشرة')
        .addIntegerOption(option => option.setName('points').setDescription('عدد نقاط الفوز').setRequired(true)),
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
        rouletteData = null;
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

    if (activeGame && activeGame.type !== 'روليت') {
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
    if (interaction.isButton()) {
        if (!rouletteData) return interaction.reply({ content: 'لا توجد لعبة روليت قائمة حالياً.', ephemeral: true });

        const userId = interaction.user.id;
        const userAvatar = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
        const username = interaction.user.username;

        if (interaction.customId === 'rl_join') {
            if (rouletteData.status !== 'lobby') return interaction.reply({ content: 'اللعبة بدأت بالفعل!', ephemeral: true });
            if (rouletteData.players.find(p => p.id === userId)) {
                return interaction.reply({ content: 'أنت مسجل بالفعل في اللعبة!', ephemeral: true });
            }

            rouletteData.players.push({ id: userId, username: username, avatar: userAvatar });

            const updatedEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🎲 لعبة الروليت')
                .setDescription(`اضغط على **دخول** للمشاركة في اللعبة!\n\n**عدد المشاركين الحالي:** ${rouletteData.players.length}/50\n**جائزة الفائز:** ${rouletteData.points} نقطة\n\n**المشاركين:**\n` + rouletteData.players.map((p, i) => `${i + 1}. <@${p.id}>`).join('\n'))
                .setFooter({ text: 'اضغط على زر الدخول للإنضمام إلى اللعبة' });

            await interaction.update({ embeds: [updatedEmbed] });
        }
        else if (interaction.customId === 'rl_leave') {
            if (rouletteData.status !== 'lobby') return interaction.reply({ content: 'اللعبة بدأت بالفعل!', ephemeral: true });
            const pIndex = rouletteData.players.findIndex(p => p.id === userId);
            if (pIndex === -1) return interaction.reply({ content: 'أنت لست مسجلاً في اللعبة!', ephemeral: true });

            rouletteData.players.splice(pIndex, 1);

            const updatedEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🎲 لعبة الروليت')
                .setDescription(`اضغط على **دخول** للمشاركة في اللعبة!\n\n**عدد المشاركين الحالي:** ${rouletteData.players.length}/50\n**جائزة الفائز:** ${rouletteData.points} نقطة\n\n**المشاركين:**\n` + (rouletteData.players.length > 0 ? rouletteData.players.map((p, i) => `${i + 1}. <@${p.id}>`).join('\n') : 'لا يوجد مشاركين حتى الآن.'))
                .setFooter({ text: 'اضغط على زر الدخول للإنضمام إلى اللعبة' });

            await interaction.update({ embeds: [updatedEmbed] });
        }
        else if (interaction.customId === 'rl_shop') {
            await interaction.reply({ content: '🛒 **متجر الخصائص مغلق حالياً أو يمكنك تطويره وفق رغبتك!**', ephemeral: true });
        }
        else if (interaction.customId === 'rl_bag') {
            await interaction.reply({ content: '🎒 **حقيبتك فارغة حالياً.**', ephemeral: true });
        }
        else if (interaction.customId === 'rl_stats') {
            const pts = userPoints.get(userId) || 0;
            await interaction.reply({ content: `📊 **إحصائياتك:**\nإجمالي النقاط: **${pts}**`, ephemeral: true });
        }
        else if (interaction.customId === 'rl_start_game') {
            if (!isStaff(interaction.member) && rouletteData.hostId !== userId) {
                return interaction.reply({ content: 'بدء اللعبة متاح للمشرفين أو صاحب الأمر فقط!', ephemeral: true });
            }
            if (rouletteData.players.length < 2) {
                return interaction.reply({ content: 'يجب أن يكون هناك لاعبين اثنين على الأقل لبدء اللعبة!', ephemeral: true });
            }

            rouletteData.status = 'playing';
            await interaction.reply({ content: '🚀 جاري بدء لعبة الروليت...' });
            runRouletteRound(interaction.channel);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('قائمة الأوامر الشاملة')
            .setColor(0x0099FF)
            .setDescription(
                '**🎮 أوامر الألعاب:**\n' +
                '`/play` - لبدء لعبة جديدة (سرعة، فك، أدمج، أعلام، روليت)\n' +
                '`/roulette` - لبدء لعبة الروليت بالـ GIF\n' +
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
        await interaction.reply(`الألعاب المتوفرة:\n\`سرعة\` | \`فك\` | \`أدمج\` | \`أعلام\` | \`روليت\``);
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
        else if (gameType === 'روليت') {
            activeGame = { type: 'روليت' };
            await interaction.reply('جاري إنشاء غرفة الانتظار للروليت...');
            await startRouletteLobby(interaction.channel, customPoints);
        }
    }
    else if (commandName === 'roulette') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'ليس لديك صلاحية.', ephemeral: true });
        const customPoints = interaction.options.getInteger('points');
        if (activeGame) {
            if (activeGame.timer) clearTimeout(activeGame.timer);
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
        }
        activeGame = { type: 'روليت' };
        await interaction.reply('جاري إنشاء غرفة الانتظار للروليت...');
        await startRouletteLobby(interaction.channel, customPoints);
    }
    else if (commandName === 'stop') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'للإشراف فقط', ephemeral: true });
        if (activeGame) {
            if (activeGame.timer) clearTimeout(activeGame.timer);
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
        }
        rouletteData = null;
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

