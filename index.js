const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const http = require('http');

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNEL_ID = '1527850274511917251';

// سيرفر إبقاء البوت أونلاين على Render
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('MVP Music Bot Online');
    res.end();
}).listen(process.env.PORT || 10000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const distube = new DisTube(client, {
    emitNewSongOnly: true,
    savePreviousSongs: false,
    nsfw: true,
    // خوارزمية لجلب أقرب وأدق النتائج للبحث
    searchSongs: 1 
});

client.on('ready', () => {
    console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== ALLOWED_CHANNEL_ID) return;

    const text = message.content.trim();

    if (text.startsWith('ش ')) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ لازم تكون داخل روم صوتي أولاً!');
        }

        const query = text.slice(2).trim();
        if (!query) return message.reply('❌ اكتب اسم الأغنية أو الرابط بعد حرف ش!');

        let searchingMsg = await message.reply(`🔎 جاري البحث عن أقرب النتائج والتشغيل...`);

        try {
            // ستقوم هذه الدالة بالبحث التلقائي عن أقرب مطابقة وتشغيلها ودخول الروم
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
            return searchingMsg.delete().catch(() => {});
        } catch (error) {
            console.error(error);
            return searchingMsg.edit('❌ لم يتم العثور على نتائج مطابقة، جرب كتابة اسم الأغنية بشكل دقيق!');
        }
    }

    else if (text === 'سكيب') {
        const queue = distube.getQueue(message.guild.id);
        if (queue) {
            try {
                await queue.skip();
                return message.channel.send('🛑 تم تخطي المقطع.');
            } catch {
                return message.reply('❌ ما فيه أغنية تالية لتخطيها!');
            }
        } else {
            return message.reply('❌ البوت مو شغال أساساً!');
        }
    }
});

// إشعارات التشغيل التلقائية في الشات
distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`▶️ شغال الآن: **${song.name}**`);
});

client.login(TOKEN);
