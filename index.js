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
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildVoiceStates
    ],
});
const queue = new Map();
client.on('messageCreate', async (message) => {
    console.log("aboba");
    if (message.author.bot)
        return;
    if (!message.content.startsWith(config_json_1.prefix))
        return;
    if (message.content.startsWith(`${config_json_1.prefix}play`)) {
        execute(message);
        return;
    }
    else if (message.content.startsWith(`${config_json_1.prefix}skip`)) {
        skip(message);
        return;
    }
    else if (message.content.startsWith(`${config_json_1.prefix}stop`)) {
        stop(message);
        return;
    }
    else {
        message.channel.send('You need to enter a valid command!');
    }
});
async function execute(message) {
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
    const songInfo = await ytdl_core_1.default.getInfo(args[1]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        message: message
    };
    if (!serverQueue) {
        const queueContruct = {
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
    }
    else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} добавлен в очередь`);
    }
}
function skip(message) {
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
    connection.subscribe(player);
    player.play(resource);
    player.on(voice_1.AudioPlayerStatus.Idle, () => {
        console.log('Music ended!');
        serverQueue.songs.shift();
        if (serverQueue.songs.length === 0) {
            if (!player)
                return queue.delete(guild.id);
            player.stop();
            serverQueue.player = undefined;
            return queue.delete(guild.id);
        }
        playSong(serverQueue.songs[0].message);
    });
    console.log("a");
}
client.login(config_json_1.token);
