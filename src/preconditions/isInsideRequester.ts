import { ApplyOptions } from "@sapphire/decorators";
import type { PreconditionOptions, PreconditionResult } from "@sapphire/framework";
import { Precondition } from "@sapphire/framework";
import type { ChatInputCommandInteraction, Message } from "discord.js";
import { CommandContext } from "../structures/CommandContext.js";
import { EmbedPlayer } from "../utils/EmbedPlayer.js";

@ApplyOptions<PreconditionOptions>({
    name: "isInsideRequester"
})
export class isInsideRequester extends Precondition {
    public chatInputRun(interaction: ChatInputCommandInteraction<"cached">): PreconditionResult {
        return this.precondition(new CommandContext(interaction));
    }

    public messageRun(message: Message): PreconditionResult {
        return this.precondition(new CommandContext(message));
    }

    private async precondition(ctx: CommandContext): Promise<any> {
        const dispatcher = this.container.client.shoukaku.queue.get(ctx.context.guildId!);
        let requester: Awaited<ReturnType<typeof EmbedPlayer["resolveRequesterChannel"]>> | undefined;
        if (dispatcher?.embedPlayer?.textChannel?.id === ctx.context.channelId) {
            return this.error({ message: "You can't use that command here" });
        }
        const data = await this.container.client.databases.guild.fetchGuildRequester(ctx.context.guildId!);
        if (data.channel !== null && data.message !== null) {
            requester = await EmbedPlayer.resolveRequesterChannel(ctx.context.guild!, data);
            if (requester.channel?.id === ctx.context.channelId) {
                return this.error({ message: "You can't use that command here" });
            }
        }
        return this.ok();
    }
}
