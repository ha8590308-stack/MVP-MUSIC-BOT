const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const { YoutubeExtractor } = require('@discord-player/extractor');
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

const player = new Player(client);

// استخراج الصوت بدقة لضمان عدم فشل البحث
async function initPlayer() {
    await player.extractors.loadDefault((ext) => ext !== 'YouTube');
    await player.extractors.register(YoutubeExtractor, {});
}
initPlayer();

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

        let searchingMsg = await message.reply(`🔎 جاري البحث والتشغيل...`);

        try {
            const queue = player.nodes.create(message.guild, {
                metadata: {
                    channel: message.channel
                },
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 30000,
                leaveOnEnd: true,
                leaveOnEndCooldown: 30000,
                selfDeaf: true
            });

            try {
                if (!queue.connection) await queue.connect(voiceChannel);
            } catch {
                queue.delete();
                return searchingMsg.edit('❌ تعذر الانضمام للروم الصوتي!');
            }

            const result = await player.search(query, {
                requestedBy: message.author
            });

            if (!result || !result.tracks.length) {
                return searchingMsg.edit('❌ لم يتم العثور على نتائج، جرب كتابة اسم فنان أو رابط آخر!');
            }

            queue.addTrack(result.tracks[0]);
            if (!queue.isPlaying()) await queue.node.play();

            return searchingMsg.edit(`▶️ شغال الآن: **${result.tracks[0].title}**`);

        } catch (error) {
            console.error("Execution Error:", error);
            if (searchingMsg) {
                searchingMsg.edit('❌ حدث خطأ أثناء التشغيل، جرب مرة أخرى!');
            }
        }
    }

    else if (text === 'سكيب') {
        const queue = player.nodes.get(message.guild.id);
        if (queue && queue.isPlaying()) {
            queue.node.stop();
            return message.channel.send('🛑 تم تخطي المقطع.');
        } else {
            return message.reply('❌ البوت مو شغال أساساً!');
        }
    }
});

client.login(TOKEN);
