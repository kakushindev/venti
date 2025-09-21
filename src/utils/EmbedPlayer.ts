import type { EmbedBuilder } from "@discordjs/builders";
import type { Guild, Message, TextChannel } from "discord.js";
import get from "got";
import type { Venti } from "src/structures/Venti.js";
import { prefix as defaultPrefix } from "../config.js";
import { Images } from "../constants/index.js";
import type { Dispatcher } from "../structures/Dispatcher.js";
import { LoopType } from "../structures/Dispatcher.js";
import { Util } from "./Util.js";

export class EmbedPlayer {
    public readonly client!: Venti;
    public readonly guild!: Guild;
    public message!: Message | undefined;
    public textChannel!: TextChannel | undefined;
    public constructor(public dispatcher: Dispatcher) {
        Object.defineProperty(this, "client", { value: dispatcher.client });
        Object.defineProperty(this, "guild", { value: dispatcher.guild });
    }

    public async fetch(force = false): Promise<EmbedPlayer | undefined> {
        if (this.textChannel && this.message && !force) return this;
        const data = await this.client.databases.guild.fetchGuildRequester(this.guild.id);
        const requester = await EmbedPlayer.resolveRequesterChannel(this.guild, data);
        if (!requester.channel) return undefined;
        this.textChannel = requester.channel;
        if (requester.message) {
            this.message = requester.message;
        } else {
            this.textChannel = undefined;
            this.message = undefined;
        }
        return this;
    }

    public async update(): Promise<any> {
        const loopModes = {
            [LoopType.ONE]: "track",
            [LoopType.ALL]: "queue",
            [LoopType.NONE]: "off"
        };
        if (!this.textChannel || !this.message) return;
        if (this.message.editable && this.dispatcher.player) {
            if (this.dispatcher.queue.length > 0) {
                // eslint-disable-next-line no-param-reassign, no-useless-assignment
                const list = Util.chunk(this.dispatcher.queue.queued.map((x, i) => `${++i}. ${x.info.author} - ${x.displayTitle} [${x.info.isStream ? "LIVE" : Util.readableTime(x.info.length)}] ~ <@${x.requester}>`), 10);
                const currentSong = this.dispatcher.queue[0];
                const image = currentSong.displayThumbnail
                    ? await get(currentSong.displayThumbnail).then(() => currentSong.displayThumbnail).catch(() => Images.DEFAULT_BANNER)
                    : Images.DEFAULT_BANNER;
                const embed = Util.createEmbed("info")
                    .setTitle(`${`**${currentSong.info.title}`.slice(0, 254)}**`)
                    .setURL(currentSong.info.uri ?? null)
                    .setDescription(`Requested by: <@${currentSong.requester}>`)
                    .setImage(image)
                    .setFooter({ text: `${this.dispatcher.queue.queueSize} songs in queue | Volume: ${(this.dispatcher.player.filters.volume ?? 1) * 100}% ${this.dispatcher.loopState === LoopType.NONE ? "" : `| Loop: ${loopModes[this.dispatcher.loopState]}`} ${this.dispatcher.player.paused ? "| Song paused" : ""}` });
                await this.message.edit({
                    allowedMentions: { parse: [] },
                    embeds: [embed],
                    content: `**__Queue list:__**${list.length > 1 ? `\n\nAnd **${this.dispatcher.queue.queueSize - list[0].length}** more...` : ""}\n${list.length > 0 ? list[0].reverse().join("\n") : "Join a voice channel and queue songs by name or url in here."}`
                });
            } else {
                const data = await this.client.prisma.guilds.findFirst({
                    select: {
                        prefix: true
                    },
                    where: {
                        id: this.guild.id
                    }
                });
                await this.message.edit({
                    allowedMentions: { parse: [] },
                    embeds: [EmbedPlayer.generateDefaultEmbed(this.guild, data?.prefix ?? defaultPrefix)],
                    content: " "
                });
            }
        }
    }

    public static async resolveRequesterChannel(
        guild: Guild, data: { channel: string | null | undefined; message: string | null | undefined; }
    ): Promise<{ channel: TextChannel | undefined; message: Message | undefined; }> {
        if (!data.channel || !data.message) return { channel: undefined, message: undefined };
        const channel = await guild.channels.fetch(data.channel).catch(() => null);
        if (!channel?.isTextBased()) {
            await guild.client.prisma.guilds.update({
                where: { id: guild.id },
                data: { requester_channel: null, requester_message: null }
            });
            return { channel: undefined, message: undefined };
        }
        const message = await channel.messages.fetch(data.message).catch(() => null);
        if (!message) {
            await guild.client.prisma.guilds.update({
                where: { id: guild.id },
                data: { requester_channel: null, requester_message: null }
            });
            return { channel: undefined, message: undefined };
        }
        return { channel: channel as TextChannel, message };
    }

    public static generateDefaultEmbed(guild: Guild, prefix: string): EmbedBuilder {
        return Util.createEmbed("info")
            .setAuthor({ name: "No song playing currently", iconURL: guild.iconURL({ size: 4_096 })! })
            .setImage(Images.DEFAULT_BANNER)
            .setDescription("Join a voice channel and queue songs by name or url in here.")
            .setFooter({ text: `Prefix for this server is: ${prefix}` });
    }
}
