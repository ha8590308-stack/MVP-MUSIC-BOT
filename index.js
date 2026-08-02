const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const http = require('http');

// ================= [ البيانات ] =================
const TOKEN = process.env.TOKEN || 'MTUzMzQxMTI5ODU3NzA4ODYwNA.GGQmNo.ob1dFL8nvvah3dssdo9RkuEEY3SvTLPwMBAZuw';
const ALLOWED_CHANNEL_ID = '1527850274511917251'; 
// ========================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// متغيرات للتحكم بالصوت والتكرار
let currentConnection = null;
let currentPlayer = null;
let currentUrl = null;
let isLooping = false;

client.on('ready', () => {
    console.log(`✅ البوت شغال باسم: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // التأكد من الروم المخصص
    if (message.channel.id !== ALLOWED_CHANNEL_ID) return;

    const text = message.content.trim();

    // 1️⃣ أمر التشغيل (ش ...)
    if (text.startsWith('ش ')) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ لازم تكون داخل روم صوتي أولاً!');
        }
        
        const query = text.slice(2).trim();
        if (!query) return message.reply('❌ اكتب اسم الأغنية أو الرابط بعد حرف ش!');
        
        try {
            message.reply(`🔎 جاري البحث عن: **${query}**...`);
            
            let yt_info = await play.search(query, { limit: 1 });
            if (!yt_info || yt_info.length === 0) {
                return message.channel.send('❌ ما لقيت المقطع!');
            }

            currentUrl = yt_info[0].url;
            isLooping = false; // إعادة ضبط التكرار عند تشغيل مقطع جديد

            // إغلاق أي اتصال قديم إن وجد
            if (currentConnection) {
                currentConnection.destroy();
            }

            currentConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            currentPlayer = createAudioPlayer();
            await playAndSubscribe(currentUrl);

            message.channel.send(`▶️ شغال الآن: **${yt_info[0].title}** في روم ${voiceChannel.name}`);

            // التعامل مع انتهاء المقطع (أو التكرار)
            currentPlayer.on(AudioPlayerStatus.Idle, async () => {
                if (isLooping && currentUrl) {
                    await playAndSubscribe(currentUrl);
                } else {
                    if (currentConnection) {
                        currentConnection.destroy();
                        currentConnection = null;
                        currentPlayer = null;
                        currentUrl = null;
                    }
                }
            });
            
        } catch (error) {
            console.error(error);
            message.channel.send('❌ صار خطأ أثناء تشغيل الصوت!');
        }
    }

    // 2️⃣ أمر إيقاف التشغيل (سكيب)
    else if (text === 'سكيب') {
        if (currentConnection || currentPlayer) {
            isLooping = false;
            currentUrl = null;
            if (currentPlayer) currentPlayer.stop();
            if (currentConnection) {
                currentConnection.destroy();
                currentConnection = null;
            }
            return message.channel.send('🛑 تم إيقاف الصوت والخروج من الروم.');
        } else {
            return message.reply('❌ البوت مو شغال أساساً في روم صوتي!');
        }
    }

    // 3️⃣ أمر تكرار الأغنية (كرر)
    else if (text === 'كرر') {
        if (!currentPlayer || !currentUrl) {
            return message.reply('❌ ما فيه مقطع شغال حالياً عشان أكرره!');
        }

        isLooping = !isLooping; // التبديل بين التفعيل والإلغاء
        if (isLooping) {
            return message.channel.send('🔄 تم تفعيل **التكرار** للمقطع الحالي!');
        } else {
            return message.channel.send('⏹️ تم إلغاء **التكرار**!');
        }
    }
});

// دالة مساعدة لتشغيل المقطع
async function playAndSubscribe(url) {
    let source = await play.stream(url);
    let resource = createAudioResource(source.stream, { inputType: source.type });
    currentPlayer.play(resource);
    currentConnection.subscribe(currentPlayer);
}

// سيرفر HTTP لإبقاء الخدمة شغال على Render
http.createServer((req, res) => {
    res.write('MVP Music Bot Online!');
    res.end();
}).listen(process.env.PORT || 3000);

client.login(TOKEN);
