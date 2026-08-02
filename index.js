const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, enterState } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');
const http = require('http');

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNEL_ID = '1527850274511917251';

// سيرفر HTTP لإبقاء الخدمة شغال في Render المجاني 24/7
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

let currentConnection = null;
let currentPlayer = null;

client.on('ready', () => {
    console.log(`✅ البوت جاهز وأونلاين باسم: ${client.user.tag}`);
});

process.on('unhandledRejection', error => console.error('Unhandled Promise:', error));
process.on('uncaughtException', error => console.error('Uncaught Exception:', error));

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== ALLOWED_CHANNEL_ID) return;

    const text = message.content.trim();

    if (text.startsWith('ش ')) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ لازم تكون داخل روم صوتي أولاً!');
        }

        let input = text.slice(2).trim();
        if (!input) return message.reply('❌ اكتب اسم الأغنية أو الرابط بعد حرف ش!');

        let searchingMsg = await message.reply(`🔎 جاري التحضير والبحث...`);

        try {
            let targetUrl = input;
            let trackTitle = input;

            // إذا كان المدخل نص عادي وليس رابط، يبحث ويستخرج أول فيديو
            if (!input.startsWith('http://') && !input.startsWith('https://')) {
                const searchResult = await ytSearch(input);
                if (!searchResult || !searchResult.videos.length) {
                    return searchingMsg.edit('❌ لم يتم العثور على نتائج للبحث!');
                }
                targetUrl = searchResult.videos[0].url;
                trackTitle = searchResult.videos[0].title;
            }

            // استخراج ستريم الصوت مباشرة بأحدث إصدار ytdl
            const stream = ytdl(targetUrl, {
                filter: 'audioonly',
                highWaterMark: 1 << 25,
                quality: 'highestaudio',
                dlChunkSize: 0
            });

            if (currentConnection) {
                try { currentConnection.destroy(); } catch (e) {}
            }

            // الانضمام للروم الصوتي
            currentConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            await enterState(currentConnection, VoiceConnectionStatus.Ready, 15_000);

            currentPlayer = createAudioPlayer();
            const resource = createAudioResource(stream);

            currentPlayer.play(resource);
            currentConnection.subscribe(currentPlayer);

            await searchingMsg.edit(`▶️ شغال الآن: **${trackTitle}**`);

            currentPlayer.on(AudioPlayerStatus.Idle, () => {
                cleanupConnection();
            });

            currentPlayer.on('error', err => {
                console.error("Audio Player Error:", err);
                cleanupConnection();
            });

        } catch (error) {
            console.error("Execution Error:", error);
            cleanupConnection();
            if (searchingMsg) {
                searchingMsg.edit('❌ تعذر تشغيل المقطع، جرب رابط آخر أو اسم مختلف!');
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
