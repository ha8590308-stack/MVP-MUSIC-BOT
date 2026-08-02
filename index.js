const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const http = require('http');

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNEL_ID = '1527850274511917251';

// سيرفر إبقاء الخدمة أونلاين على Render
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('MVP Bot Active');
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

// إعداد المشغل
const player = new Player(client);

client.on('ready', async () => {
    // تحميل مستخرجات الصوت (مثل SoundCloud)
    await player.extractors.loadDefault();
    console.log(`✅ البوت جاهز أونلاين باسم: ${client.user.tag}`);
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

        const searchingMsg = await message.reply(`🔎 جاري البحث والتراسل مع السيرفر...`);

        try {
            const { track } = await player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: message,
                    leaveOnEnd: true,
                    leaveOnEmpty: true
                }
            });

            return searchingMsg.edit(`▶️ شغال الآن: **${track.title}**`);
        } catch (e) {
            console.error("Play error:", e);
            return searchingMsg.edit('❌ تعذر التشغيل، جرب كتابة اسم المقطع بشكل أوضح!');
        }
    }

    else if (text === 'سكيب') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) {
            return message.reply('❌ ما فيه شيء شغال حالياً!');
        }
        queue.node.stop();
        return message.channel.send('🛑 تم الإيقاف والخروج.');
    }
});

client.login(TOKEN);
