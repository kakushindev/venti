import { ApplyOptions } from "@sapphire/decorators";
import type { PreconditionOptions, PreconditionResult } from "@sapphire/framework";
import { Precondition } from "@sapphire/framework";
import type { ChatInputCommandInteraction, GuildMember, Message } from "discord.js";
import { CommandContext } from "../structures/CommandContext.js";

@ApplyOptions<PreconditionOptions>({
    name: "memberInVoice"
})
export class memberInVoice extends Precondition {
    public chatInputRun(interaction: ChatInputCommandInteraction<"cached">): PreconditionResult {
        return this.precondition(new CommandContext(interaction));
    }

    public messageRun(message: Message): PreconditionResult {
        return this.precondition(new CommandContext(message));
    }

    private precondition(ctx: CommandContext): PreconditionResult {
        return (ctx.context.member as GuildMember).voice.channelId ? this.ok() : this.error({ message: "Please connect to a voice channel" });
    }
}
