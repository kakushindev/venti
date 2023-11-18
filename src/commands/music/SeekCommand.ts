import { ApplyOptions } from "@sapphire/decorators";
import { ApplicationCommandRegistry, Args, Command, RegisterBehavior } from "@sapphire/framework";
import { CommandInteraction, Message } from "discord.js";
import { ApplicationCommandOptionTypes } from "discord.js/typings/enums";
import { devGuilds, isDev } from "../../config";
import { CommandContext } from "../../structures/CommandContext";
import { Util } from "../../utils/Util";

@ApplyOptions<Command.Options>({
    aliases: [],
    name: "seek",
    description: "Seeks a song by the provided time",
    detailedDescription: {
        usage: "{prefix}seek [mm:ss]"
    },
    preconditions: ["isPlayerPlaying", "memberInVoice", "memberVoiceJoinable", "memberInSameVoice"],
    requiredClientPermissions: ["EMBED_LINKS"]
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
                    type: ApplicationCommandOptionTypes.STRING,
                    required: true
                }
            ]
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
        const dispatcher = this.container.client.shoukaku.queue.get(ctx.context.guildId!);
        if (dispatcher?.embedPlayer?.textChannel?.id === ctx.context.channelId) ctx.isInsideRequesterChannel = true;

        const durationArgs = ctx.isMessageCommand() ? await ctx.args?.pickResult("string") : undefined;
        const duration = durationArgs?.unwrapOr(undefined) ?? ctx.options?.getString("duration", true);
        // eslint-disable-next-line prefer-named-capture-group
        const durationPattern = /^[0-5]?[0-9](:[0-5][0-9]){1,2}$/;

        if (!duration || !durationPattern.exec(duration)) {
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

        dispatcher?.player?.seekTo(parsedDuration);

        return ctx.send({
            embeds: [
                Util.createEmbed("success", `⏩ **|** Track seeked to \`${duration}\``)
            ]
        });
    }
}
