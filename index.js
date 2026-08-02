const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const play = require('play-dl');
const http = require('http');

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNEL_ID = '1527850274511917251';

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
        if (!query) return message.reply('❌ اكتب اسم الأغنية أو الرابط بعد حرف ش!');

        try {
            const searchingMsg = await message.reply(`🔎 جاري البحث عن: **${query}**...`);

            let url = query;
            let title = query;

            if (!play.yt_validate(query)) {
                let searchResult = await play.search(query, { limit: 1 });
                if (!searchResult || searchResult.length === 0) {
                    return searchingMsg.edit('❌ ما لقيت المقطع!');
                }
                url = searchResult[0].url;
                title = searchResult[0].title;
            }

            currentUrl = url;
            isLooping = false;

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

            // إعداد البث المباشر لتجاوز حظر Render
            const stream = ytdl(url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }
            });

            const resource = createAudioResource(stream);
            currentPlayer.play(resource);
            currentConnection.subscribe(currentPlayer);

            searchingMsg.edit(`▶️ شغال الآن: **${title}**`);

            currentPlayer.on(AudioPlayerStatus.Idle, () => {
                if (isLooping && currentUrl) {
                    const nextStream = ytdl(currentUrl, { filter: 'audioonly', highWaterMark: 1 << 25 });
                    const nextResource = createAudioResource(nextStream);
                    currentPlayer.play(nextResource);
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
            message.channel.send('❌ تعذر تشغيل المقطع، جرب اسم ثاني أو رابط مباشر!');
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

http.createServer((req, res) => {
    res.write('MVP Bot Online');
    res.end();
}).listen(process.env.PORT || 3000);

client.login(TOKEN);
