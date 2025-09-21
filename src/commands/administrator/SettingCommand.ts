import { ApplyOptions } from "@sapphire/decorators";
import type { ApplicationCommandRegistry, Args } from "@sapphire/framework";
import { Command, RegisterBehavior } from "@sapphire/framework";
import { ApplicationCommandOptionType, ButtonStyle, GuildCacheMessage, type ApplicationCommandOptionData, type ChatInputCommandInteraction, type Message, type TextChannel } from "discord.js";
import { devGuilds, isDev, prefix } from "../../config.js";
import { CommandContext } from "../../structures/CommandContext.js";
import { EmbedPlayer } from "../../utils/EmbedPlayer.js";
import { Util } from "../../utils/Util.js";
import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";

@ApplyOptions<Command.Options>({
    aliases: [],
    name: "set",
    preconditions: ["isInsideRequester"],
    description: "Customize bot's settings",
    requiredUserPermissions: ["ManageGuild"],
    requiredClientPermissions: ["EmbedLinks"]
})
export class SettingCommand extends Command {
    private readonly commands: ApplicationCommandOptionData[] = [
        {
            name: "requester",
            type: ApplicationCommandOptionType.Subcommand,
            description: "Set text channel requester",
            options: [
                {
                    name: "channel",
                    type: ApplicationCommandOptionType.Channel,
                    description: "Text channel to set",
                    required: true
                }
            ]
        },
        {
            name: "removerequester",
            type: ApplicationCommandOptionType.Subcommand,
            description: "Remove text channel requester"
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
        await interaction.deferReply();
        return this.run(interaction.options.getSubcommand(true), new CommandContext(interaction));
    }

    public async messageRun(message: GuildCacheMessage<"cached">, args: Args): Promise<any> {
        const cmd = await args.pickResult("string");
        const value = cmd.unwrapOr(undefined);
        const validCommands = this.commands.map(x => x.name);
        if (!value || !validCommands.includes(value.toLowerCase())) {
            return message.channel.send({
                embeds: [
                    Util.createEmbed("error", `Invalid sub-command. Available sub-command: ${validCommands.map(x => `\`${x}\``).join(", ")}`)
                ]
            });
        }
        return this.run(value.toLowerCase(), new CommandContext(message, args));
    }

    public async run(command: string, ctx: CommandContext): Promise<any> {
        switch (command) {
            case "requester": {
                const channelArgs = await ctx.args?.pick("channel");
                let channel = ctx.options?.getChannel("channel", true);
                if ((!channelArgs?.isTextBased() && !ctx.options) || (!ctx.args && !channel?.isTextBased())) {
                    return ctx.send({
                        embeds: [
                            Util.createEmbed("error", "Please mention a valid **text channel**")
                        ]
                    });
                }
                if (!channel) channel = channelArgs as TextChannel;
                const data = await this.container.client.databases.guild.get(ctx.context.guildId!, {
                    select: {
                        requester_channel: true,
                        requester_message: true
                    }
                });
                const oldRequester = ctx.context.guild!.channels.cache.get(data.requester_channel!);
                if (oldRequester?.isTextBased()) {
                    const message = await oldRequester.messages.fetch(data.requester_message!).catch(() => {});
                    if (message) {
                        return ctx.send({
                            // eslint-disable-next-line @typescript-eslint/no-base-to-string
                            embeds: [Util.createEmbed("error", `Already setup in ${oldRequester.toString()}`)]
                        });
                    }
                }
                if (!channel.permissionsFor(this.container.client.user!.id)?.has(["SendMessages", "AttachFiles"])) {
                    return ctx.send({
                        embeds: [Util.createEmbed("error", "I need these permissions to make requester channel: `SEND_MESSAGES`, `ATTACH_FILES`")]
                    });
                }
                if (channel.isTextBased()) {
                    data.requester_channel = channel.id;
                    const msg = await channel.send({
                        embeds: [
                            EmbedPlayer.generateDefaultEmbed(ctx.context.guild!, data.prefix ?? prefix)
                        ],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("player_resumepause")
                                        .setEmoji({
                                            name: "▶️"
                                        })
                                        .setStyle(ButtonStyle.Secondary),
                                    new ButtonBuilder()
                                        .setCustomId("player_skip")
                                        .setEmoji({
                                            name: "⏭"
                                        })
                                        .setStyle(ButtonStyle.Secondary),
                                    new ButtonBuilder()
                                        .setCustomId("player_loop")
                                        .setEmoji({
                                            name: "🔁"
                                        })
                                        .setStyle(ButtonStyle.Secondary),
                                    new ButtonBuilder()
                                        .setCustomId("player_stop")
                                        .setEmoji({
                                            name: "⏹"
                                        })
                                        .setStyle(ButtonStyle.Danger),
                                    new ButtonBuilder()
                                        .setCustomId("player_shuffle")
                                        .setEmoji({
                                            name: "🔀"
                                        })
                                        .setStyle(ButtonStyle.Success)
                                )
                        ]
                    }).catch((error: Error) => ({ error: error.message }));
                    if ("error" in msg) {
                        return ctx.send({
                            embeds: [
                                Util.createEmbed("error", `Couldn't send player message: \`${msg.error}\``, true)
                            ]
                        });
                    }
                    data.requester_message = msg.id;
                }
                await this.container.client.prisma.guilds.update({
                    where: { id: ctx.context.guildId! },
                    data
                });
                await ctx.send({
                    embeds: [Util.createEmbed("info", `Set requester channel to: <#${data.requester_channel!}>`)]
                });
                break;
            }
            case "removerequester": {
                const oldRequester = await EmbedPlayer.resolveRequesterChannel(
                    ctx.context.guild!,
                    await this.container.client.databases.guild.fetchGuildRequester(ctx.context.guildId!)
                );
                if (!oldRequester.channel) {
                    return ctx.send({
                        embeds: [Util.createEmbed("error", "There's no requester channel in this server")]
                    });
                }
                if (oldRequester.message?.deletable) await oldRequester.message.delete();
                await this.container.client.prisma.guilds.update({
                    where: { id: ctx.context.guildId! },
                    data: {
                        requester_channel: null,
                        requester_message: null
                    }
                });
                await ctx.send({
                    embeds: [Util.createEmbed("info", "Deleted requester channel")]
                });
                break;
            }
        }
    }
}
