import { ApplyOptions } from "@sapphire/decorators";
import type { ApplicationCommandRegistry, Args } from "@sapphire/framework";
import { Command, RegisterBehavior } from "@sapphire/framework";
import { ApplicationCommandOptionType } from "discord.js";
import type { ChatInputCommandInteraction, Message } from "discord.js";
import { devGuilds, isDev } from "../../config.js";
import { CommandContext } from "../../structures/CommandContext.js";
import { Util } from "../../utils/Util.js";

@ApplyOptions<Command.Options>({
    aliases: [],
    name: "volume",
    description: "Change current playback volume",
    preconditions: ["isPlayerPlaying", "memberInVoice", "memberVoiceJoinable", "memberInSameVoice"],
    requiredClientPermissions: ["EmbedLinks"]
})
export class VolumeCommand extends Command {
    public override registerApplicationCommands(registry: ApplicationCommandRegistry): void {
        registry.registerChatInputCommand({
            name: this.name,
            description: this.description,
            options: [
                {
                    name: "volume",
                    description: "Volume to set (1 - 100)",
                    type: ApplicationCommandOptionType.Integer,
                    maxValue: 100,
                    minValue: 1
                }
            ]
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
        const dispatcher = this.container.client.shoukaku.queue.get(ctx.context.guildId!);
        if (dispatcher?.embedPlayer?.textChannel?.id === ctx.context.channelId) ctx.isInsideRequesterChannel = true;
        const argsVolume = await ctx.args?.restResult("integer");
        if (argsVolume?.isErr() && !ctx.options) {
            return ctx.send({
                embeds: [
                    Util.createEmbed("error", "Please provide a valid number between 1 - 100", true)
                ]
            });
        }
        const volume = argsVolume?.unwrapOr(null) ?? ctx.options?.getInteger("volume", true);
        if (!volume || Number.isNaN(volume) || volume < 1 || volume > 100) {
            return ctx.send({
                embeds: [
                    Util.createEmbed("error", "Please provide a valid number between 1 - 100", true)
                ]
            });
        }
        await dispatcher?.player?.setGlobalVolume(volume * 100);
        await ctx.send({
            embeds: [
                Util.createEmbed("success", `🔊 **|** Changed current volume to ${volume}%`)
            ]
        });
        return dispatcher?.embedPlayer?.update();
    }
}
