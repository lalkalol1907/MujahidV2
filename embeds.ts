import Song from "./models/song";

const { EmbedBuilder } = require('discord.js');

const timeFormat = (time: number): string => {
    let d = [((time - time % 3600) / 3600 ).toString(), ((time % 3600 - time % 3600 % 60) / 60).toString(), (time%60).toString()]
    for (let i = 0; i < 3; i++) {
        if (d[i].length === 1) 
            d[i] = "0" + d[i]

    }
    return `${d[0]}:${d[1]}:${d[2]}`
}

// inside a command, event listener, etc.
const playingEmbed = (song: Song) => {
    return new EmbedBuilder()
	.setColor(0x0099FF)
	.setTitle(song.title)
	.setURL(song.url)
	.setAuthor({ name: 'Playing:', iconURL: song.message.author.avatarURL() })
	.setThumbnail(song.pic)
	.addFields(
		{ name: 'Duration:', value: timeFormat(song.duration), inline: true },
	)
}

const addedToQueueEmbed = (song: Song, queueNumber: number) => {
    return new EmbedBuilder()
    .setColor(0x0099FF)
	.setTitle(song.title)
	.setURL(song.url)
	.setAuthor({ name: 'Added to queue:', iconURL: song.message.author.avatarURL() })
	.setThumbnail(song.pic)
	.addFields(
		{ name: 'Duration:', value: timeFormat(song.duration), inline: true },
        { name: 'Position in queue:', value: queueNumber.toString(), inline: true }
	)
}

export {
    playingEmbed,
    addedToQueueEmbed
}