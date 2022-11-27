import Song from "./models/song";

const {EmbedBuilder} = require('discord.js');

const timeFormat = (time: number): string => {
    let d = [((time - time % 3600) / 3600).toString(), ((time % 3600 - time % 3600 % 60) / 60).toString(), (time % 60).toString()]
    for (let i = 0; i < 3; i++) {
        if (d[i].length === 1) {
            d[i+2] = "0" + d[i]
        }
    }
    return `${d[0]}:${d[1]}:${d[2]}`
}

const formatLine = (time1: number, time2: number) => {
    const lineSize = 20
    let pos = Math.round(time2 * (lineSize / time1))
    let str = ""
    for (let i = 1; i <= pos; i++)
        str += "▬"
    str += "🔘"
    for (let i = pos + 1; i < lineSize; i++)
        str += "▬"
    return str
}

// inside a command, event listener, etc.
const playingEmbed = (song: Song) => {
    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(song.title)
        .setURL(song.url)
        .setAuthor({name: 'Playing:', iconURL: song.message.author.avatarURL()})
        .setThumbnail(song.pic)
        .addFields(
            {name: 'Duration:', value: timeFormat(song.duration), inline: true},
        )
}

const addedToQueueEmbed = (song: Song, queueNumber: number) => {
    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(song.title)
        .setURL(song.url)
        .setAuthor({name: 'Added to queue:', iconURL: song.message.author.avatarURL()})
        .setThumbnail(song.pic)
        .addFields(
            {name: 'Duration:', value: timeFormat(song.duration), inline: true},
            {name: 'Position in queue:', value: queueNumber.toString(), inline: true}
        )
}

const npEmbed = (song: Song, curTime: number = 0) => {
    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription(formatLine(song.duration, (curTime - curTime % 1000) / 1000))
        .setTitle(song.title)
        .setURL(song.url)
        .setAuthor({name: 'Now playing:', iconURL: song.message.author.avatarURL()})
        .setThumbnail(song.pic)
        .addFields(
            {name: 'Duration:', value: timeFormat(song.duration), inline: true},
            {name: 'Current time', value: timeFormat((curTime - curTime % 1000) / 1000), inline: true}
        )
}

export {
    playingEmbed,
    addedToQueueEmbed,
    npEmbed
}