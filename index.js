const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { MongoClient } = require('mongodb');
const { GoogleGenAI } = require('@google/genai');
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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const uri = process.env.MONGO_URI; 
// تم تعديل الاتصال لتجاوز مشكلة الـ SSL في سيرفرات رندر
const dbClient = new MongoClient(uri, { tls: true, tlsAllowInvalidCertificates: true });

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
        console.error('خطأ في الاتصال بقاعدة البيانات:', e.message);
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
    'فوز', 'لعبة', 'حاسب', 'شبكة', 'تطبيق', 'مطور', 'قناة', 'رومات', 'تفاعل', 'شات'
];

const arabicLetters = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'ن', 'هـ', 'و', 'ي'];
const categoriesList = ['حيوان', 'جماد', 'بلاد', 'نبات', 'طير'];

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
                    { name: 'أعلام', value: 'أعلام' },
                    { name: 'رياضيات', value: 'رياضيات' },
                    { name: 'حروف', value: 'حروف' }
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
    let answerText, displayText, instructions;
    if (gameType === 'سرعة') {
        instructions = 'أسرع شخص يكتب:';
        const w = getUniqueWord();
        answerText = w;
        displayText = `# ${w}`;
    } else if (gameType === 'فك') {
        instructions = 'أسرع شخص يفكك الكلمة:';
        const w = getUniqueWord();
        answerText = makeSpaced(w); 
        displayText = `# ${w}`; 
    } else if (gameType === 'أدمج') {
        instructions = 'أسرع شخص يدمج الحروف:';
        const w = getUniqueWord();
        answerText = w; 
        displayText = `# ${makeSpaced(w)}`; 
    } else if (gameType === 'رياضيات') {
        instructions = 'أسرع شخص يحل المسألة:';
        const num1 = Math.floor(Math.random() * 50) + 10;
        const num2 = Math.floor(Math.random() * 50) + 10;
        answerText = (num1 + num2).toString();
        displayText = `# ${num1} + ${num2} = ?`;
    } else if (gameType === 'حروف') {
        instructions = 'أسرع شخص يكتب الكلمة الصحيحة حسب التصنيف والحرف المطلوب:';
        const randomCategory = categoriesList[Math.floor(Math.random() * categoriesList.length)];
        const randomLetter = arabicLetters[Math.floor(Math.random() * arabicLetters.length)];
        
        answerText = { category: randomCategory, letter: randomLetter };
        displayText = `# التصنيف: **${randomCategory}** | الحرف: **[ ${randomLetter} ]**`;
    }
    return { answerText, displayText, instructions };
}

function setGameTimeout(channel) {
    if (activeGame && activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
    
    activeGame.timeoutTimer = setTimeout(async () => {
        if (!activeGame || activeGame.isProcessing) return; 
        activeGame.isProcessing = true;
        activeGame.missedCount = (activeGame.missedCount || 0) + 1;

        if (activeGame.missedCount >= 2) {
            await channel.send(`انتهى الوقت! تم إيقاف اللعبة لعدم التفاعل.`);
            activeGame = null;
        } else {
            await channel.send(`انتهى الوقت! جاري إرسال سؤال آخر...`);
            const payload = getGamePayload(activeGame.type);
            activeGame.isProcessing = false;
            activeGame.answer = payload.answerText;
            setGameTimeout(channel);
            const embed = new EmbedBuilder().setColor(0x57F287).setTitle(activeGame.type).setDescription(`${payload.instructions}\n\n${payload.displayText}\n\n*(النقاط: ${activeGame.points})*`);
            return channel.send({ embeds: [embed] });
        }
    }, 30000);
}

async function verifyCategoryAnswer(category, letter, userWord) {
    try {
        const prompt = `أنت مدقق لغوي وحكم لعبة حريم/تراثية (بلاد، حيوان، نبات، جماد، طير).
التصنيف المطلوب: "${category}"
الحرف المطلوب بدايتها: "${letter}"
إجابة اللاعب: "${userWord}"

شروط الصحة:
1. هل الكلمة تنتمي حقيقة للتصنيف "${category}"؟
2. هل تبدأ الكلمة بالحرف "${letter}" (تجاهل اختلافات الهمزات مثل أ إ آ، وتجاهل أل التعريف)؟
3. هل الكلمة محترمة وليست كلمة بذيئة أو هابطة أو استهبال؟

أجب بكلمة واحدة فقط: "نعم" إذا كانت صحيحة تماماً ومحترمة، أو "لا" إذا كانت خاطئة أو بذيئة أو استهبال.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text.trim();
        return text.includes('نعم');
    } catch (e) {
        console.error("AI Check Error:", e);
        return false;
    }
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

        let isCorrect = false;
        let userAns = message.content.trim();

        if (activeGame.type === 'حروف') {
            activeGame.isProcessing = true;
            const isValidByAI = await verifyCategoryAnswer(activeGame.answer.category, activeGame.answer.letter, userAns);
            if (isValidByAI) {
                isCorrect = true;
            } else {
                activeGame.isProcessing = false;
                return; 
            }
        } else {
            let correctAns = activeGame.answer.trim().replace(/أ|إ|آ/g, 'ا');
            userAns = userAns.replace(/أ|إ|آ/g, 'ا');

            if (activeGame.type === 'فك') {
                userAns = userAns.replace(/\s+/g, ' '); 
                correctAns = correctAns.replace(/\s+/g, ' ');
            } else {
                userAns = userAns.replace(/\s+/g, ''); 
                correctAns = correctAns.replace(/\s+/g, '');
            }
            if (userAns === correctAns) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            activeGame.isProcessing = true;
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
            if (activeGame.timer) clearTimeout(activeGame.timer);
            activeGame.missedCount = 0;

            const userId = message.author.id;
            const totalPoints = (userPoints.get(userId) || 0) + activeGame.points;
            await savePointsToDB(userId, totalPoints);

            await message.reply(`فاز <@${userId}> وأخذ ${activeGame.points} نقطة.`);
            
            const payload = getGamePayload(activeGame.type);
            activeGame.answer = payload.answerText;
            activeGame.isProcessing = false;
            setGameTimeout(message.channel);
            const embed = new EmbedBuilder().setColor(0x57F287).setTitle(activeGame.type).setDescription(`${payload.instructions}\n\n${payload.displayText}\n\n*(النقاط: ${activeGame.points})*`);
            return message.channel.send({ embeds: [embed] });
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
            .setDescription('أوامر البوت والمسابقات تعمل بنجاح مع فلتر الذكاء الاصطناعي!');
        await interaction.reply({ embeds: [helpEmbed] });
    } 
    else if (commandName === 'games') {
        await interaction.reply(`الألعاب المتوفرة:\n\`سرعة\` | \`فك\` | \`أدمج\` | \`أعلام\` | \`رياضيات\` | \`حروف\``);
    } 
    else if (commandName === 'setrole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'للأدمن فقط', ephemeral: true });
        allowedRoleId = interaction.options.getRole('role').id;
        await saveSettingsToDB();
        await interaction.reply(`تم تعيين رول التحكم بنجاح.`);
    }
    else if (commandName === 'play') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'ليس لديك صلاحية.', ephemeral: true });

        const gameType = interaction.options.getString('game');
        const customPoints = interaction.options.getInteger('points');

        if (activeGame) {
            if (activeGame.timer) clearTimeout(activeGame.timer);
            if (activeGame.timeoutTimer) clearTimeout(activeGame.timeoutTimer);
        }

        const payload = getGamePayload(gameType);
        activeGame = { type: gameType, answer: payload.answerText, points: customPoints, missedCount: 0, isProcessing: false };
        
        if (gameType === 'أعلام') {
            await interaction.reply('جاري بدء لعبة الأعلام...');
            const randomFlag = getUniqueFlag();
            activeGame.answer = randomFlag.name;
            const flagEmbed = new EmbedBuilder().setColor(0xED4245).setTitle('لعبة الأعلام').setImage(`https://flagcdn.com/w640/${randomFlag.code}.png`);
            return interaction.channel.send({ embeds: [flagEmbed] });
        }

        setGameTimeout(interaction.channel);
        const embed = new EmbedBuilder().setColor(0x57F287).setTitle(gameType).setDescription(`${payload.instructions}\n\n${payload.displayText}\n\n*(النقاط: ${customPoints})*`);
        await interaction.reply({ embeds: [embed] });
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
        await interaction.reply(`تمت الإضافة لـ <@${target.id}>.`);
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
