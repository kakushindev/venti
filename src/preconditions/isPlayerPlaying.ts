import { ApplyOptions } from "@sapphire/decorators";
import type { PreconditionOptions, PreconditionResult } from "@sapphire/framework";
import { Precondition } from "@sapphire/framework";
import type { ChatInputCommandInteraction, Message } from "discord.js";
import { CommandContext } from "../structures/CommandContext.js";

@ApplyOptions<PreconditionOptions>({
    name: "isPlayerPlaying"
})
export class isPlayerPlaying extends Precondition {
    public chatInputRun(interaction: ChatInputCommandInteraction<"cached">): PreconditionResult {
        return this.precondition(new CommandContext(interaction));
    }

    public messageRun(message: Message): PreconditionResult {
        return this.precondition(new CommandContext(message));
    }

    private precondition(ctx: CommandContext): PreconditionResult {
        if (!this.container.client.shoukaku.queue.get(ctx.context.guildId!)?.player?.track) {
            return this.error({
                message: "I'm not playing anything right now"
            });
        }
        return this.ok();
    }
}
