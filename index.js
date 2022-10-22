"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const voice_1 = require("@discordjs/voice");
const play_dl_1 = __importDefault(require("play-dl"));
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const config_json_1 = require("./config.json");
const embeds_1 = require("./embeds");
const COMMANDS = {
    play: ['p', 'play'],
    skip: ['skip', 'fs'],
    stop: ['stop'],
    queue: ['q', 'queue'],
    np: ['np'],
};
for (let command of Object.values(COMMANDS))
    for (let element in command)
        command[element] = '^' + command[element];
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildVoiceStates
    ],
});
function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}
const queue = new Map();
client.on('messageCreate', async (message) => {
    if (message.author.bot)
        return;
    if (!message.content.startsWith(config_json_1.prefix))
        return;
    const command = message.content.split(' ')[0];
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
        queueCommand(message);
        return;
    }
    if (COMMANDS.np.includes(command)) {
        npCommand(message);
        return;
    }
    message.channel.send('You need to enter a valid command!');
});
async function queueCommand(message) {
}
async function npCommand(message) {
    if (!message.guild)
        return message.channel.send('Nothing is playing now!');
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue?.songs[0])
        return message.channel.send('Nothing is playing now!');
    return message.channel.send({ embeds: [(0, embeds_1.npEmbed)(serverQueue.songs[0], serverQueue.curResource?.playbackDuration)] });
}
async function playCommand(message) {
    if (!message.guild)
        return;
    const args = message.content.split(' ');
    const serverQueue = queue.get(message.guild.id);
    const user = message.author;
    const voiceChannel = message.guild.channels.cache.find((channel) => {
        const channelMembers = channel.members;
        const res = channelMembers.find((member) => member.user.id == user.id) && channel.type == 2;
        return res === undefined ? false : res;
    });
    if (!voiceChannel)
        return message.channel.send('Вы не находитесь в голосовом канале');
    let isUrl = validURL(args[0]);
    var song;
    if (isUrl) {
        const songInfo = await ytdl_core_1.default.getInfo(args[1]);
        song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            duration: parseInt(songInfo.videoDetails.lengthSeconds),
            pic: songInfo.videoDetails.thumbnail.thumbnails[0].url,
            message: message,
            curTime: 0
        };
    }
    else {
        var arg = "";
        for (let i = 1; i < args.length; i++) {
            arg += args[i];
            if (i !== args.length - 1)
                arg += " ";
        }
        let yt_info = await play_dl_1.default.search(arg, {
            limit: 1
        });
        song = {
            title: yt_info[0].title,
            url: yt_info[0].url,
            duration: yt_info[0].durationInSec,
            pic: yt_info[0].thumbnails[0].url,
            message: message,
            curTime: 0
        };
    }
    if (!serverQueue) {
        const queueContruct = {
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
    }
    else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs[serverQueue.songs.length - 1]);
        return message.channel.send({ embeds: [(0, embeds_1.addedToQueueEmbed)(song, serverQueue.songs.length - 1)] });
    }
}
function skipCommand(message) {
    if (!message.guild)
        return;
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue || !serverQueue.player)
        return message.channel.send("Нечего скипать");
    serverQueue.player.emit(voice_1.AudioPlayerStatus.Idle, () => { return; });
}
function stop(message) {
}
async function playSong(message) {
    const guild = message.guild;
    if (!guild)
        return;
    const serverQueue = queue.get(guild.id);
    if (!serverQueue)
        return;
    const song = serverQueue.songs[0];
    const voiceChannel = message.guild.channels.cache.find((channel) => {
        const channelMembers = channel.members;
        const res = channelMembers.find((member) => member.user.id == message.author.id) && channel.type == 2;
        return res === undefined ? false : res;
    });
    if (!voiceChannel)
        return;
    const stream = await play_dl_1.default.stream(song.url);
    const connection = (0, voice_1.joinVoiceChannel)({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    var player = serverQueue.player;
    if (!player) {
        player = (0, voice_1.createAudioPlayer)({
            behaviors: {
                noSubscriber: voice_1.NoSubscriberBehavior.Play,
            },
        });
        serverQueue.player = player;
    }
    let resource = (0, voice_1.createAudioResource)(stream.stream, {
        inputType: stream.type
    });
    serverQueue.curResource = resource;
    connection.subscribe(player);
    player.play(resource);
    song.message.channel.send({ embeds: [(0, embeds_1.playingEmbed)(song)] });
    player.on(voice_1.AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        queue.set(guild.id, serverQueue);
        if (serverQueue.songs.length === 0) {
            if (!player)
                return queue.delete(guild.id);
            player.stop();
            serverQueue.player = undefined;
            return queue.delete(guild.id);
        }
        playSong(serverQueue.songs[0].message);
    });
}
client.login(config_json_1.token);
