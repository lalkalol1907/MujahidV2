import {
    Message,
    Client,
    GatewayIntentBits,
    GuildBasedChannel,
    VoiceChannel,
    DMChannel,
    PartialDMChannel,
    NewsChannel,
    TextChannel,
    PrivateThreadChannel,
    PublicThreadChannel,
    GuildMember,
    Collection
} from "discord.js";
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    AudioPlayer,
    AudioResource
} from '@discordjs/voice';
import play from 'play-dl'
import ytdl from 'ytdl-core'
import Song from "./models/song";
import {addedToQueueEmbed, playingEmbed, npEmbed} from "./embeds";

if (process.env.NODE_ENV !== "PROD") {
    require('dotenv/config');
}

const [prefix, token] = [process.env.PREFIX || "", process.env.TOKEN || ""]

const COMMANDS = {
    play: ['p', 'play'],
    skip: ['skip', 'fs'],
    stop: ['stop'],
    queue: ['q', 'queue'],
    np: ['np'],
}

for (let command of Object.values(COMMANDS))
    for (let element in command)
        command[element] = '^' + command[element]


interface QueueInterface {
    textChannel: DMChannel | PartialDMChannel | NewsChannel | TextChannel | PrivateThreadChannel | PublicThreadChannel<boolean> | VoiceChannel,
    voiceChannel: GuildBasedChannel,
    songs: Song[],
    volume: number,
    playing: boolean,
    player: AudioPlayer | undefined,
    curResource: AudioResource | undefined
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

function validURL(str: string) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

const queue = new Map<string, QueueInterface>();

client.on('messageCreate', async (message: Message) => {

    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const command = message.content.split(' ')[0]

    if (COMMANDS.play.includes(command)) {
        playCommand(message);
        return;
    }
    if (COMMANDS.skip.includes(command)) {
        skipCommand(message);
        return;
    }
    if (COMMANDS.stop.includes(command)) {
        stop(message);
        return;
    }
    if (COMMANDS.queue.includes(command)) {
        queueCommand(message)
        return
    }
    if (COMMANDS.np.includes(command)) {
        npCommand(message)
        return
    }

    message.channel.send('You need to enter a valid command!')
});

async function queueCommand(message: Message) {

}

async function npCommand(message: Message) {
    if (!message.guild)
        return message.channel.send('Nothing is playing now!')

    const serverQueue = queue.get(message.guild.id);

    if (!serverQueue?.songs[0])
        return message.channel.send('Nothing is playing now!')

    return message.channel.send({embeds: [npEmbed(serverQueue.songs[0], serverQueue.curResource?.playbackDuration)]});

}

async function playCommand(message: Message) {
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

    let isUrl = validURL(args[0]);

    var song: Song

    if (isUrl) {

        const songInfo = await ytdl.getInfo(args[1]);

        song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            duration: parseInt(songInfo.videoDetails.lengthSeconds),
            pic: songInfo.videoDetails.thumbnail.thumbnails[0].url,
            message: message,
            curTime: 0
        };

    } else {

        var arg = ""

        for (let i = 1; i < args.length; i++) {
            arg += args[i]
            if (i !== args.length - 1) arg += " "
        }

        let yt_info = await play.search(arg, {
            limit: 1
        })

        song = {
            title: yt_info[0].title!,
            url: yt_info[0].url,
            duration: yt_info[0].durationInSec,
            pic: yt_info[0].thumbnails[0].url,
            message: message,
            curTime: 0
        }
    }

    if (!serverQueue) {
        const queueContruct: QueueInterface = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            songs: [],
            volume: 5,
            playing: true,
            player: undefined,
            curResource: undefined
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        await playSong(message);
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs[serverQueue.songs.length - 1]);

        return message.channel.send({embeds: [addedToQueueEmbed(song, serverQueue.songs.length - 1)]});
    }

}

function skipCommand(message: Message) {
    if (!message.guild) return
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue || !serverQueue.player) return message.channel.send("Нечего скипать")
    serverQueue.player.emit(AudioPlayerStatus.Idle, () => {
        return
    })
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

    serverQueue.curResource = resource

    connection.subscribe(player);
    player.play(resource)
    song.message.channel.send({embeds: [playingEmbed(song)]})
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


if (token !== "") {
    client.login(token);
} else {
    console.log("Token error!")
}
