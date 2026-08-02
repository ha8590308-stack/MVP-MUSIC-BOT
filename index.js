const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

// ================= [ ضع بياناتك هنا ] =================
const TOKEN = 'MTUzMzQxMTI5ODU3NzA4ODYwNA.GGQmNo.ob1dFL8nvvah3dssdo9RkuEEY3SvTLPwMBAZuw';
const ALLOWED_CHANNEL_ID = 'https://discord.com/channels/1527850272448184452/1527850274511917251';
// ========================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.on('ready', () => {
    console.log(`✅ البوت شغال باسم: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content.startsWith('ش ')) {
        
        if (message.channel.id !== ALLOWED_CHANNEL_ID) {
            return message.reply('❌ الأوامر مسموحة فقط في الروم المخصص!');
        }
        
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ لازم تكون داخل روم صوتي أولاً!');
        }
        
        const query = message.content.slice(2).trim();
        if (!query) return message.reply('❌ اكتب اسم الأغنية أو الرابط بعد حرف ش!');
        
        try {
            message.reply(`🔎 جاري البحث عن: **${query}**...`);
            
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
            
            let yt_info = await play.search(query, { limit: 1 });
            
            if (yt_info.length === 0) {
                return message.channel.send('❌ ما لقيت المقطع!');
            }
            
            let source = await play.stream(yt_info[0].url);
            let resource = createAudioResource(source.stream, { inputType: source.type });
            let player = createAudioPlayer();
            
            player.play(resource);
            connection.subscribe(player);
            
            message.channel.send(`▶️ شغال الآن: **${yt_info[0].title}** في روم ${voiceChannel.name}`);
            
            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });
            
        } catch (error) {
            console.error(error);
            message.channel.send('❌ صار خطأ أثناء تشغيل الصوت!');
        }
    }
});

client.login(TOKEN);
