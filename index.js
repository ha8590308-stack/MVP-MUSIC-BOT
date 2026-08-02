const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, enterState } = require('@discordjs/voice');
const play = require('play-dl');
const http = require('http');

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNEL_ID = '1527850274511917251';

// سيرفر إبقاء الخدمة متصلة 24/7 على Render
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

        let query = text.slice(2).trim();
        if (!query) return message.reply('❌ اكتب اسم الأغنية بعد حرف ش!');

        let searchingMsg = await message.reply(`🔎 جاري البحث على SoundCloud عن: **${query}**...`);

        try {
            // البحث المباشر في ساوند كلاود لتفادي حظر يوتيوب
            const searchResults = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });

            if (!searchResults || searchResults.length === 0) {
                return searchingMsg.edit('❌ لم يتم العثور على نتائج في SoundCloud!');
            }

            const track = searchResults[0];
            const streamData = await play.stream(track.url);

            if (currentConnection) {
                try { currentConnection.destroy(); } catch (e) {}
            }

            // دخول الروم الصوتي
            currentConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            await enterState(currentConnection, VoiceConnectionStatus.Ready, 15_000);

            currentPlayer = createAudioPlayer();
            const resource = createAudioResource(streamData.stream, { inputType: streamData.type });

            currentPlayer.play(resource);
            currentConnection.subscribe(currentPlayer);

            await searchingMsg.edit(`▶️ شغال الآن: **${track.title}**`);

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
                searchingMsg.edit('❌ تعذر تشغيل المقطع، حاول مرة أخرى!');
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
