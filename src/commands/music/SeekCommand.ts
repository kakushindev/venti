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
    name: "seek",
    description: "Seeks a song by the provided time",
    detailedDescription: {
        usage: "{prefix}seek [mm:ss]"
    },
    preconditions: ["isPlayerPlaying", "memberInVoice", "memberVoiceJoinable", "memberInSameVoice"],
    requiredClientPermissions: ["EmbedLinks"]
})
export class SeekCommand extends Command {
    public override registerApplicationCommands(registry: ApplicationCommandRegistry): void {
        registry.registerChatInputCommand({
            name: this.name,
            description: this.description,
            options: [
                {
                    name: "time",
                    description: "Time used for seeking",
                    type: ApplicationCommandOptionType.String,
                    required: true
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

        const durationArgs = ctx.isMessageCommand() ? await ctx.args?.pickResult("string") : undefined;
        const duration = durationArgs?.unwrapOr(null) ?? ctx.options?.getString("duration", true);
        // eslint-disable-next-line prefer-named-capture-group
        const durationPattern = /^[0-5]?\d(:[0-5]\d){1,2}$/u;

        if (!duration || !durationPattern.test(duration)) {
            return ctx.send({
                embeds: [
                    Util.createEmbed("error", "Invalid time format provided, example: `2:11`", true)
                ]
            });
        }

        const parsedDuration = Util.durationToMS(duration);

        if (!dispatcher!.queue.currentTrack!.track.info.isSeekable) {
            return ctx.send({
                embeds: [
                    Util.createEmbed("error", "This track can't be seeked", true)
                ]
            });
        }

        if (parsedDuration > dispatcher!.queue.currentTrack!.track.info.length) {
            return ctx.send({
                embeds: [
                    Util.createEmbed("error", "You cannot seek beyond the track length", true)
                ]
            });
        }

        await dispatcher?.player?.seekTo(parsedDuration);

        return ctx.send({
            embeds: [
                Util.createEmbed("success", `⏩ **|** Track seeked to \`${duration}\``)
            ]
        });
    }
}
