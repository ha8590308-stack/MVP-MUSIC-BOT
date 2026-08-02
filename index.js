const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, enterState } = require('@discordjs/voice');
const play = require('play-dl');
const http = require('http');

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNEL_ID = '1527850274511917251';

// 1. سيرفر HTTP لإبقاء الخدمة شغال في Render المجاني
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('MVP Music Bot is Fully Alive & Protected!');
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

let currentConnection = null;
let currentPlayer = null;

client.on('ready', () => {
    console.log(`✅ تم تسجيل الدخول بنجاح: ${client.user.tag}`);
});

// معالجة الأخطاء العامة لمنع السيرفر من الإغلاق (Crash Protection)
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
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
        if (!query) return message.reply('❌ اكتب اسم الأغنية بعد حرف ش!');

        let searchingMsg = await message.reply(`🔎 جاري البحث عن: **${query}**...`);

        try {
            let stream = null;
            let title = query;

            // الخطة A: البحث في SoundCloud (الأسرع والأضمن من الحظر)
            try {
                const scResult = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
                if (scResult && scResult.length > 0) {
                    stream = await play.stream(scResult[0].url);
                    title = scResult[0].name;
                }
            } catch (scErr) {
                console.log("SoundCloud Fetch Failed, falling back to YouTube...", scErr);
            }

            // الخطة B: إذا فشل SoundCloud تجربة YouTube
            if (!stream) {
                const ytResult = await play.search(query, { limit: 1 });
                if (ytResult && ytResult.length > 0) {
                    stream = await play.stream(ytResult[0].url, { discordPlayerCompatibility: true });
                    title = ytResult[0].title;
                }
            }

            if (!stream) {
                return searchingMsg.edit('❌ تعذر العثور على المقطع في المصادر المتاحة!');
            }

            // إغلاق الاتصال القديم إن وجد
            if (currentConnection) {
                try { currentConnection.destroy(); } catch (e) {}
            }

            // الاتصال بالروم الصوتي
            currentConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            // التأكد من استقرار الاتصال بالروم
            await enterState(currentConnection, VoiceConnectionStatus.Ready, 15_000);

            currentPlayer = createAudioPlayer();
            const resource = createAudioResource(stream.stream, { inputType: stream.type });

            currentPlayer.play(resource);
            currentConnection.subscribe(currentPlayer);

            await searchingMsg.edit(`▶️ شغال الآن: **${title}**`);

            currentPlayer.on(AudioPlayerStatus.Idle, () => {
                cleanupConnection();
            });

            currentPlayer.on('error', err => {
                console.error("Audio Player Internal Error:", err);
                cleanupConnection();
            });

        } catch (error) {
            console.error("Main Command Error:", error);
            cleanupConnection();
            if (searchingMsg) {
                searchingMsg.edit('❌ تعذر التشغيل، جرب كتابة اسم المقطع بشكل مختلف أو أوضح!');
            }
        }
    }

    else if (text === 'سكيب') {
        if (currentConnection || currentPlayer) {
            cleanupConnection();
            return message.channel.send('🛑 تم الإيقاف والخروج.');
        } else {
            return message.reply('❌ البوت مو شغال أساساً!');
        }
    }
});

function cleanupConnection() {
    if (currentPlayer) {
        try { currentPlayer.stop(); } catch (e) {}
        currentPlayer = null;
    }
    if (currentConnection) {
        try { currentConnection.destroy(); } catch (e) {}
        currentConnection = null;
    }
}

client.login(TOKEN);
