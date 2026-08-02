const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const http = require('http');

const TOKEN = process.env.TOKEN;


const ALLOWED_CHANNEL_ID = '1527850274511917251';

// سيرفر HTTP بسيط جداً لإرضاء Render في الخطة المجانية
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('MVP Bot is Running Free!');
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

            const ytInfo = await play.search(query, { limit: 1 });
            if (!ytInfo || ytInfo.length === 0) {
                return searchingMsg.edit('❌ لم يتم العثور على المقطع!');
            }

            const video = ytInfo[0];
            currentUrl = video.url;
            isLooping = false;

            const stream = await play.stream(video.url, {
                discordPlayerCompatibility: true
            });

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
            const resource = createAudioResource(stream.stream, { inputType: stream.type });

            currentPlayer.play(resource);
            currentConnection.subscribe(currentPlayer);

            await searchingMsg.edit(`▶️ شغال الآن: **${video.title}**`);

            currentPlayer.on(AudioPlayerStatus.Idle, async () => {
                if (isLooping && currentUrl) {
                    try {
                        const nextStream = await play.stream(currentUrl, { discordPlayerCompatibility: true });
                        const nextResource = createAudioResource(nextStream.stream, { inputType: nextStream.type });
                        currentPlayer.play(nextResource);
                    } catch (e) {
                        console.error("Looping Error:", e);
                    }
                } else {
                    if (currentConnection) {
                        currentConnection.destroy();
                        currentConnection = null;
                        currentPlayer = null;
                    }
                }
            });

            currentPlayer.on('error', err => {
                console.error("Audio Player Error:", err);
            });

        } catch (error) {
            console.error("General Error:", error);
            if (searchingMsg) {
                searchingMsg.edit('❌ تعذر تشغيل المقطع حالياً، جرب البحث باسم آخر!');
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

    else if (text === 'كرر') {
        if (!currentPlayer || !currentUrl) {
            return message.reply('❌ ما فيه شيء شغال حالياً!');
        }
        isLooping = !isLooping;
        return message.channel.send(isLooping ? '🔄 تم تفعيل التكرار!' : '⏹️ تم إلغاء التكرار!');
    }
});

client.login(TOKEN);
