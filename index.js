const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior
} = require('@discordjs/voice');
const {
    prefix,
    token,
} = require('./config.json');

const play = require('play-dl')
const ytdl = require('ytdl-core')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ],
});

const queue = new Map();

client.on('messageCreate', async message => {
    console.log("aboba");

    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    if (message.content.startsWith(`${prefix}play`)) {
        execute(message);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message);
        return;
    } else {
        message.channel.send('You need to enter a valid command!')
    }
});

async function execute(message) {
    
    const args = message.content.split(' ');

    const serverQueue = queue.get(message.guild.id);

    const user = message.author;

    const voiceChannel = message.guild.channels.cache.find(channel => channel.members.find(member => member.user.id == user.id) && channel.type == 2)

    if (!voiceChannel) return message.channel.send('Вы не находитесь в голосовом канале');

    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            songs: [],
            volume: 5,
            playing: true,
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        await playSong(message);
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} добавлен в очередь`);
    }

}

function skip(message) {

}

function stop(message) {

}

async function playSong(message) {
    const guild = message.guild
    const voiceChannel = message.guild.channels.cache.find(channel => channel.members.find(member => member.user.id == message.author.id) && channel.type == 2)
    const serverQueue = queue.get(guild.id);

    var song = serverQueue.songs[0];

    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const stream = await play.stream(song.url);

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,

    });

    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });

    let resource = createAudioResource(stream.stream, {
        inputType: stream.type
    })

    connection.subscribe(player);
    player.play(resource);

    console.log("a");
}


client.login(token);
