import { ApplyOptions } from "@sapphire/decorators";
import type { PreconditionOptions, PreconditionResult } from "@sapphire/framework";
import { Precondition } from "@sapphire/framework";
import { ChannelType } from "discord.js";
import type { GuildMember, ChatInputCommandInteraction, Message } from "discord.js";
import { CommandContext } from "../structures/CommandContext.js";

@ApplyOptions<PreconditionOptions>({
    name: "memberVoiceJoinable"
})
export class memberVoiceJoinable extends Precondition {
    public chatInputRun(interaction: ChatInputCommandInteraction<"cached">): PreconditionResult {
        return this.precondition(new CommandContext(interaction));
    }

    public messageRun(message: Message): PreconditionResult {
        return this.precondition(new CommandContext(message));
    }

    private precondition(ctx: CommandContext): PreconditionResult {
        if (ctx.context.guild?.members.me?.voice.channelId === (ctx.context.member as GuildMember | undefined)?.voice.channelId) return this.ok();
        const voiceChannel = (ctx.context.member as GuildMember | undefined)?.voice.channel;
        if (!voiceChannel?.joinable) return this.error({ message: "I can't join to your voice channel." });
        if (voiceChannel.type === ChannelType.GuildVoice && !voiceChannel.speakable) return this.error({ message: "I can't speak in your voice channel." });
        return this.ok();
    }
}
