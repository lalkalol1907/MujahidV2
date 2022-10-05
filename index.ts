import { Message, Client, GatewayIntentBits, GuildBasedChannel, VoiceChannel, DMChannel, PartialDMChannel, NewsChannel, TextChannel, PrivateThreadChannel, PublicThreadChannel, GuildMember, Collection } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, AudioPlayer } from '@discordjs/voice';
import play from 'play-dl'
import ytdl from 'ytdl-core'

import { prefix, token, } from './config.json';

interface Song {
    title: string,
    url: string,
    message: Message
}

interface QueueInterface {
    textChannel: DMChannel | PartialDMChannel | NewsChannel | TextChannel | PrivateThreadChannel | PublicThreadChannel<boolean> | VoiceChannel,
    voiceChannel: GuildBasedChannel,
    songs: Song[],
    volume: number,
    playing: boolean,
    player: AudioPlayer | undefined
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ],
});

const queue = new Map<string, QueueInterface>();

client.on('messageCreate', async (message: Message) => {

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

async function execute(message: Message) {
    if (!message.guild) return

    const args = message.content.split(' ');

    const serverQueue = queue.get(message.guild.id);

    const user = message.author;


    const voiceChannel = message.guild.channels.cache.find((channel: GuildBasedChannel) => {
        const channelMembers = channel.members as Collection<string, GuildMember>
        const res = channelMembers.find((member: GuildMember) => member.user.id == user.id) && channel.type == 2
        return res === undefined ? false : res
    })

    if (!voiceChannel) return message.channel.send('Вы не находитесь в голосовом канале');

    const songInfo = await ytdl.getInfo(args[1]);
    const song: Song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        message: message
    };

    if (!serverQueue) {
        const queueContruct: QueueInterface = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            songs: [],
            volume: 5,
            playing: true,
            player: undefined
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

function skip(message: Message) {
    if (!message.guild) return
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue || !serverQueue.player) return message.channel.send("Нечего скипать")
    serverQueue.player.emit(AudioPlayerStatus.Idle, () => { return })
}

function stop(message: Message) {

}

async function playSong(message: Message) {

    const guild = message.guild
    if (!guild) return

    const serverQueue = queue.get(guild.id);
    if (!serverQueue) return

    const song = serverQueue.songs[0];

    const voiceChannel = message.guild.channels.cache.find((channel: GuildBasedChannel) => {
        const channelMembers = channel.members as Collection<string, GuildMember>
        const res = channelMembers.find((member: GuildMember) => member.user.id == message.author.id) && channel.type == 2
        return res === undefined ? false : res
    })

    if (!voiceChannel) return

    const stream = await play.stream(song.url);

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,

    });

    var player = serverQueue.player

    if (!player) {
        player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });
        serverQueue.player = player
    }

    let resource = createAudioResource(stream.stream, {
        inputType: stream.type
    })

    connection.subscribe(player);
    player.play(resource)
    player.on(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        queue.set(guild.id, serverQueue)
        if (serverQueue.songs.length === 0) {
            if (!player) return queue.delete(guild.id)
            player.stop()
            serverQueue.player = undefined
            return queue.delete(guild.id);
        }

        playSong(serverQueue.songs[0].message)
    })
}


client.login(token);
