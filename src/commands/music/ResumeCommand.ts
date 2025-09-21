import { ApplyOptions } from "@sapphire/decorators";
import type { ApplicationCommandRegistry, Args } from "@sapphire/framework";
import { Command, RegisterBehavior } from "@sapphire/framework";
import type { ChatInputCommandInteraction, Message } from "discord.js";
import { ButtonInteraction } from "discord.js";
import { devGuilds, isDev } from "../../config.js";
import { CommandContext } from "../../structures/CommandContext.js";
import { Util } from "../../utils/Util.js";

@ApplyOptions<Command.Options>({
    aliases: [],
    name: "resume",
    description: "Resume current playback",
    preconditions: ["isPlayerPlaying", "memberInVoice", "memberVoiceJoinable", "memberInSameVoice"],
    requiredClientPermissions: ["EmbedLinks"]
})
export class ResumeCommand extends Command {
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

    public async chatInputRun(interaction: ChatInputCommandInteraction<"cached">): Promise<any> {
        return this.run(new CommandContext(interaction));
    }

    public async messageRun(message: Message, args: Args): Promise<any> {
        return this.run(new CommandContext(message, args));
    }

    public async run(ctx: CommandContext): Promise<any> {
        if (ctx.context instanceof ButtonInteraction) await ctx.context.deferUpdate();
        const dispatcher = this.container.client.shoukaku.queue.get(ctx.context.guildId!);
        if (dispatcher?.embedPlayer?.textChannel?.id === ctx.context.channelId) ctx.isInsideRequesterChannel = true;
        if (!dispatcher?.player?.paused) {
            if (!ctx.isInsideRequesterChannel) {
                await ctx.send({
                    embeds: [
                        Util.createEmbed("error", "The player is already resumed", true)
                    ]
                });
            }
            return;
        }
        dispatcher.player.setPaused(false);
        await dispatcher.embedPlayer?.update();
        if (!ctx.isInsideRequesterChannel) {
            return ctx.send({
                embeds: [
                    Util.createEmbed("success", "⏸ **|** Resumed current playback")
                ]
            });
        }
    }
}
