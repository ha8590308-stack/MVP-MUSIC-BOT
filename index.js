const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { SpotifyPlugin } = require('@distube/spotify');
const http = require('http');

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNEL_ID = '1527850274511917251';

// سيرفر إبقاء البوت شغال على Render
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

// تفعيل كل الإضافات (يوتيوب، ساوند كلاود، سبوتيفاي) معاً
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    savePreviousSongs: false,
    nsfw: true,
    plugins: [
        new YtDlpPlugin(),
        new SoundCloudPlugin(),
        new SpotifyPlugin()
    ]
});

client.on('ready', () => {
    console.log(`✅ البوت شغال وجاهز: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== ALLOWED_CHANNEL_ID) return;

    const text = message.content.trim();

    // 1. أمر التشغيل الشامل
    if (text.startsWith('ش ')) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ لازم تكون داخل روم صوتي أولاً!');
        }

        const query = text.slice(2).trim();
        if (!query) return message.reply('❌ اكتب اسم الأغنية أو الرابط بعد حرف ش!');

        try {
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
            return message.react('✅').catch(() => {});
        } catch (error) {
            console.error(error);
            return message.reply('❌ تعذر التشغيل، تأكد من صحة الرابط أو الاسم.');
        }
    }

    // 2. أمر التخطي (سكيب)
    else if (text === 'سكيب') {
        const queue = distube.getQueue(message.guild.id);
        if (!queue) return message.reply('❌ ما فيه شيء شغال أساساً!');
        try {
            await queue.skip();
            return message.channel.send('🛑 تم تخطي المقطع.');
        } catch {
            return message.reply('❌ ما فيه أغنية تالية لتخطيها!');
        }
    }

    // 3. أمر التوقف المؤقت (توقف)
    else if (text === 'توقف') {
        const queue = distube.getQueue(message.guild.id);
        if (!queue) return message.reply('❌ البوت مو شغال!');
        try {
            queue.pause();
            return message.channel.send('⏸️ تم ايقاف الأغنية مؤقتاً.');
        } catch {
            return message.reply('❌ حدث خطأ.');
        }
    }

    // 4. أمر الإكمال (إكمال)
    else if (text === 'إكمال') {
        const queue = distube.getQueue(message.guild.id);
        if (!queue) return message.reply('❌ البوت مو شغال!');
        try {
            queue.resume();
            return message.channel.send('▶️ تم استكمال تشغيل الأغنية.');
        } catch {
            return message.reply('❌ حدث خطأ.');
        }
    }

    // 5. أمر التكرار (تكرار)
    else if (text === 'تكرار') {
        const queue = distube.getQueue(message.guild.id);
        if (!queue) return message.reply('❌ البوت مو شغال!');
        try {
            const mode = queue.toggleRepeatMode();
            return message.channel.send(`🔁 وضع التكرار صار: ${mode ? (mode === 2 ? 'القائمة بالكامل' : 'الأغنية الحالية') : 'مطفأ'}`);
        } catch {
            return message.reply('❌ ما قدرت أغير وضع التكرار.');
        }
    }
});

distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`▶️ شغال الآن: **${song.name}** (${song.source})`);
});

client.login(TOKEN);
