import { ApplyOptions } from "@sapphire/decorators";
import { ApplicationCommandRegistry, Args, Command, RegisterBehavior } from "@sapphire/framework";
import { ButtonInteraction, CommandInteraction, Message } from "discord.js";
import { devGuilds, isDev } from "../../config";
import { CommandContext } from "../../structures/CommandContext";
import { Util } from "../../utils/Util";

@ApplyOptions<Command.Options>({
    aliases: [],
    name: "pause",
    description: "Pause current playback",
    preconditions: ["isPlayerPlaying", "memberInVoice", "memberVoiceJoinable", "memberInSameVoice"],
    requiredClientPermissions: ["EMBED_LINKS"]
})
export class PauseCommand extends Command {
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
        if (ctx.context instanceof ButtonInteraction) await ctx.context.deferUpdate();
        const dispatcher = this.container.client.shoukaku.queue.get(ctx.context.guildId!);
        if (dispatcher?.embedPlayer?.textChannel?.id === ctx.context.channelId) ctx.isInsideRequesterChannel = true;
        if (dispatcher?.player?.paused) {
            if (!ctx.isInsideRequesterChannel) {
                await ctx.send({
                    embeds: [
                        Util.createEmbed("error", "The player is already paused", true)
                    ]
                });
            }
            return;
        }
        dispatcher?.player?.setPaused(true);
        await dispatcher?.embedPlayer?.update();
        if (!ctx.isInsideRequesterChannel) {
            return ctx.send({
                embeds: [
                    Util.createEmbed("success", "▶ **|** Paused current playback")
                ]
            });
        }
    }
}
