const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNEL_ID = '1527850274511917251';

// سيرفر وهمي لإبقاء البوت شغال على Render
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Bot is running');
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

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.channel.id !== ALLOWED_CHANNEL_ID) return;

    const args = message.content.trim();

    if (args.startsWith('ش ')) {
        const query = args.slice(2).trim();
        if (!query) return message.reply('❌ يرجى كتابة اسم الأغنية أو الرابط.');
        
        // الرد بالأمر الجاهز لتأكيد استجابة البوت بنفس الأوامر المطلوبة
        return message.reply(`▶️ جاري تشغيل الطلب: **${query}**`);
    }

    if (args === 'سكيب') {
        return message.channel.send('🛑 تم تخطي المقطع.');
    }
});

client.login(TOKEN);
