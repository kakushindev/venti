import { ApplyOptions } from "@sapphire/decorators";
import { ApplicationCommandRegistry, Args, Command, RegisterBehavior } from "@sapphire/framework";
import { CommandInteraction, Message } from "discord.js";
import { devGuilds, isDev } from "../../config";
import { CommandContext } from "../../structures/CommandContext";
import { Util } from "../../utils/Util";

@ApplyOptions<Command.Options>({
    aliases: [],
    name: "back",
    description: "Play previous track",
    preconditions: ["isPlayerPlaying", "memberInVoice", "memberVoiceJoinable", "memberInSameVoice"],
    requiredClientPermissions: ["EMBED_LINKS"]
})
export class SkipCommand extends Command {
    public override registerApplicationCommands(registry: ApplicationCommandRegistry): void {
        registry.registerChatInputCommand({
            name: this.name,
            description: this.description
        }, {
            registerCommandIfMissing: true,
            guildIds: isDev ? devGuilds : [],
            behaviorWhenNotIdentical: RegisterBehavior.Overwrite
        });
    }

    public async chatInputRun(interaction: CommandInteraction<"cached">): Promise<any> {
        return this.run(new CommandContext(interaction));
    }

    public messageRun(message: Message, args: Args): Promise<any> {
        return this.run(new CommandContext(message, args));
    }

    public async run(ctx: CommandContext): Promise<any> {
        const dispatcher = this.container.client.shoukaku.queue.get(ctx.context.guildId!)!;
        if (dispatcher.embedPlayer?.textChannel?.id === ctx.context.channelId) ctx.isInsideRequesterChannel = true;

        const previous = dispatcher.queue.previousTrack;
        if (typeof previous === "undefined") {
            return ctx.send({
                embeds: [
                    Util.createEmbed("error", "There is no previous track", true)
                ]
            });
        }

        await ctx.send({
            embeds: [
                Util.createEmbed("success", `Skipped back to \`${dispatcher.queue.previousTrack.displayTitle}\``, true)
            ]
        });

        dispatcher.queue.splice(1, 0, dispatcher.queue.previousTrack);
        return dispatcher.player?.stopTrack();
    }
}
