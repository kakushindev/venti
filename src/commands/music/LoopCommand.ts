import { setTimeout } from "node:timers";
import { ApplyOptions } from "@sapphire/decorators";
import type { ApplicationCommandRegistry, Args } from "@sapphire/framework";
import { Command, RegisterBehavior } from "@sapphire/framework";
import { ApplicationCommandOptionType } from "discord.js";
import type { ApplicationCommandOptionData, ChatInputCommandInteraction, GuildCacheMessage } from "discord.js";
import { devGuilds, isDev } from "../../config.js";
import { CommandContext } from "../../structures/CommandContext.js";
import { LoopType } from "../../structures/Dispatcher.js";
import { Util } from "../../utils/Util.js";

@ApplyOptions<Command.Options>({
    aliases: [],
    name: "loop",
    preconditions: ["isPlayerPlaying", "memberInVoice", "memberVoiceJoinable", "memberInSameVoice"],
    description: "Customize loop mode for current queue",
    requiredClientPermissions: ["EmbedLinks"]
})
export class LoopCommand extends Command {
    private readonly commands: ApplicationCommandOptionData[] = [
        {
            name: "queue",
            type: ApplicationCommandOptionType.Subcommand,
            description: "Loop current queue"
        },
        {
            name: "track",
            type: ApplicationCommandOptionType.Subcommand,
            description: "Loop current track (single)"
        },
        {
            name: "disable",
            type: ApplicationCommandOptionType.Subcommand,
            description: "Disable loop"
        }
    ];

    public override registerApplicationCommands(registry: ApplicationCommandRegistry): void {
        registry.registerChatInputCommand({
            name: this.name,
            description: this.description,
            options: this.commands
        }, {
            registerCommandIfMissing: true,
            behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
            guildIds: isDev ? devGuilds : []
        });
    }

    public async chatInputRun(interaction: ChatInputCommandInteraction<"cached">): Promise<any> {
        return this.run(interaction.options.getSubcommand(true), new CommandContext(interaction));
    }

    public async messageRun(message: GuildCacheMessage<"cached">, args: Args): Promise<any> {
        const cmd = await args.pickResult("string");
        const value = cmd.unwrapOr(null);
        const validCommands = this.commands.map(x => x.name);
        const dispatcher = this.container.client.shoukaku.queue.get(message.guildId);
        if (!value || !validCommands.includes(value.toLowerCase())) {
            const msg = await message.channel.send({
                embeds: [
                    Util.createEmbed("error", `Invalid sub-command. Available sub-command: ${validCommands.map(x => `\`${x}\``).join(", ")}`)
                ]
            });
            if (dispatcher?.embedPlayer?.textChannel?.id === message.channelId) {
                setTimeout(async () => {
                    if (msg.deletable) await msg.delete();
                }, 5_000);
            }
            return undefined;
        }
        return this.run(value.toLowerCase(), new CommandContext(message, args));
    }

    public async run(command: string, ctx: CommandContext): Promise<any> {
        const dispatcher = this.container.client.shoukaku.queue.get(ctx.context.guildId!);
        if (dispatcher?.embedPlayer?.textChannel?.id === ctx.context.channelId) ctx.isInsideRequesterChannel = true;
        switch (command) {
            case "queue": {
                dispatcher!.loopState = LoopType.ALL;
                await ctx.send({
                    embeds: [
                        Util.createEmbed("success", "🔁 **|** Repeating current queue")
                    ]
                });
                break;
            }
            case "track": {
                dispatcher!.loopState = LoopType.ONE;
                await ctx.send({
                    embeds: [
                        Util.createEmbed("success", "🔂 **|** Repeating current track")
                    ]
                });
                break;
            }
            case "disable": {
                dispatcher!.loopState = LoopType.NONE;
                await ctx.send({
                    embeds: [
                        Util.createEmbed("success", "Disabled loop mode", true)
                    ]
                });
                break;
            }
            default: {
                await ctx.send({
                    embeds: [
                        Util.createEmbed("error", "An unknown error occurred", true)
                    ]
                });
                break;
            }
        }
        await dispatcher?.embedPlayer?.update();
    }
}
