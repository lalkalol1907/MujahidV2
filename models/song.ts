import { Message } from "discord.js";

interface Song {
    title: string,
    url: string,
    duration: number,
    pic: string,
    message: Message,
    curTime: number
}

export default Song;