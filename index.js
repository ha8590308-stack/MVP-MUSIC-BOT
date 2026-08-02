const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const http = require('http');

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNEL_ID = '1527850274511917251';

// سيرفر HTTP لإبقاء Render أونلاين
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('MVP Bot is Live!');
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
let currentUrl = null;
let isLooping = false;

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
        if (!query) return message.reply('❌ اكتب اسم الأغنية بعد حرف ش!');

        let searchingMsg;
        try {
            searchingMsg = await message.reply(`🔎 جاري البحث عن: **${query}**...`);

            // البحث أولاً في ساوند كلاود لتفادي حظر IP سيرفرات يوتيوب
            let streamData;
            let trackTitle = query;

            try {
                const scResult = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
                if (scResult && scResult.length > 0) {
                    streamData = await play.stream(scResult[0].url);
                    trackTitle = scResult[0].name;
                }
            } catch (e) {
                console.log("Soundcloud search failed, trying Youtube direct...");
            }

            // إذا لم يجد في ساوند كلاود يجرب يوتيوب
            if (!streamData) {
                const ytResult = await play.search(query, { limit: 1 });
                if (!ytResult || ytResult.length === 0) {
                    return searchingMsg.edit('❌ لم يتم العثور على المقطع!');
                }
                streamData = await play.stream(ytResult[0].url, { discordPlayerCompatibility: true });
                trackTitle = ytResult[0].title;
                currentUrl = ytResult[0].url;
            }

            if (currentConnection) {
                currentConnection.destroy();
            }

            currentConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            currentPlayer = createAudioPlayer();
            const resource = createAudioResource(streamData.stream, { inputType: streamData.type });

            currentPlayer.play(resource);
            currentConnection.subscribe(currentPlayer);

            await searchingMsg.edit(`▶️ شغال الآن: **${trackTitle}**`);

            currentPlayer.on(AudioPlayerStatus.Idle, () => {
                if (currentConnection) {
                    currentConnection.destroy();
                    currentConnection = null;
                    currentPlayer = null;
                }
            });

            currentPlayer.on('error', err => {
                console.error("Audio Player Error:", err);
            });

        } catch (error) {
            console.error("General Error:", error);
            if (searchingMsg) {
                searchingMsg.edit('❌ تعذر تشغيل المقطع، جرب كتابة اسم المقطع بشكل أوضح أو رابط مباشر!');
            }
        }
    }

    else if (text === 'سكيب') {
        if (currentConnection || currentPlayer) {
            isLooping = false;
            if (currentPlayer) currentPlayer.stop();
            if (currentConnection) {
                currentConnection.destroy();
                currentConnection = null;
            }
            return message.channel.send('🛑 تم الإيقاف والخروج.');
        } else {
            return message.reply('❌ البوت مو شغال أساساً!');
        }
    }
});

client.login(TOKEN);
