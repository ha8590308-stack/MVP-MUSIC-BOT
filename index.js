const { Client, GatewayIntentBits } = require('discord.js');
const { Connectors } = require('shoukaku');
const { Kazagumo } = require('kazagumo');
const http = require('http');

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNEL_ID = '1527850274511917251';

// سيرفر إبقاء البوت أونلاين على Render
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('MVP Music Bot Online via Lavalink');
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

// سيرفرات Lavalink محدثة ومستقرة للاتصال السحابي
const Nodes = [
    {
        name: 'Node-1',
        url: 'lavalink.eu.org:443',
        auth: 'youshallnotpass',
        secure: true
    },
    {
        name: 'Node-2',
        url: 'lava.projectlunar.pw:443',
        auth: 'youshallnotpass',
        secure: true
    }
];

const kazagumo = new Kazagumo({
    defaultSearchEngine: 'youtube',
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
}, new Connectors.DiscordJS(client), Nodes);

client.on('ready', () => {
    console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
});

kazagumo.shoukaku.on('ready', (name) => console.log(`✅ متصل بسيرفر الصوت: ${name}`));
kazagumo.shoukaku.on('error', (name, error) => console.error(`❌ خطأ في سيرفر الصوت ${name}:`, error));

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
            let player = kazagumo.players.get(message.guild.id);

            if (!player) {
                player = await kazagumo.createPlayer({
                    guildId: message.guild.id,
                    textId: message.channel.id,
                    voiceId: voiceChannel.id,
                    deaf: true
                });
            } else {
                if (player.voiceId !== voiceChannel.id) {
                    player.setVoiceChannel(voiceChannel.id);
                }
            }

            let result = await kazagumo.search(query, { requester: message.author });

            if (!result.tracks.length) {
                return searchingMsg.edit('❌ لم يتم العثور على نتائج!');
            }

            if (result.type === 'PLAYLIST') {
                for (let track of result.tracks) player.queue.add(track);
                if (!player.playing && !player.paused) player.play();
                return searchingMsg.edit(`▶️ تم إضافة القائمة (**${result.tracks.length}** مقطع).`);
            } else {
                player.queue.add(result.tracks[0]);
                if (!player.playing && !player.paused) player.play();
                return searchingMsg.edit(`▶️ شغال الآن: **${result.tracks[0].title}**`);
            }

        } catch (error) {
            console.error("Execution Error:", error);
            if (searchingMsg) {
                searchingMsg.edit('❌ تعذر الاتصال بسيرفر الصوت، جرب بعد ثوانٍ!');
            }
        }
    }

    else if (text === 'سكيب') {
        const player = kazagumo.players.get(message.guild.id);
        if (player) {
            player.destroy();
            return message.channel.send('🛑 تم الإيقاف والخروج.');
        } else {
            return message.reply('❌ البوت مو شغال أساساً!');
        }
    }
});

client.login(TOKEN);
