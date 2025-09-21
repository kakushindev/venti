/* eslint-disable @typescript-eslint/no-base-to-string */
import { ApplyOptions } from "@sapphire/decorators";
import type { ApplicationCommandRegistry, Args } from "@sapphire/framework";
import { Command, RegisterBehavior } from "@sapphire/framework";
import type { GuildMember, Message, TextChannel, VoiceChannel } from "discord.js";
import { ApplicationCommandOptionType, ChatInputCommandInteraction, escapeMarkdown } from "discord.js";
import { devGuilds, isDev } from "../../config.js";
import { CommandContext } from "../../structures/CommandContext.js";
import { ShoukakuHandler } from "../../structures/ShoukakuHandler.js";
import { EmbedPlayer } from "../../utils/EmbedPlayer.js";
import { Util } from "../../utils/Util.js";
import { LoadType, Track as ShoukakuTrack } from "shoukaku";
import { Track } from "../../structures/Track.js";

@ApplyOptions<Command.Options>({
    aliases: [],
    name: "play",
    description: "Add a music to the queue",
    preconditions: ["isNodeAvailable", "memberInVoice", "memberVoiceJoinable", "memberInSameVoice"],
    requiredClientPermissions: ["EmbedLinks"]
})
export class PlayCommand extends Command {
    public override registerApplicationCommands(registry: ApplicationCommandRegistry): void {
        registry.registerChatInputCommand({
            name: this.name,
            description: this.description,
            options: [
                {
                    name: "query",
                    type: ApplicationCommandOptionType.String,
                    description: "Music to play (the title or supported link)",
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
        const data = await this.container.client.databases.guild.fetchGuildRequester(ctx.context.guildId!);
        let requester: Awaited<ReturnType<typeof EmbedPlayer["resolveRequesterChannel"]>> | undefined;
        if (data.channel && data.message) {
            requester = await EmbedPlayer.resolveRequesterChannel(ctx.context.guild!, data);
            if (requester.channel?.id !== ctx.context.channelId) {
                return ctx.send({
                    embeds: [
                        Util.createEmbed("error", `This command is restricted to ${requester.channel!.toString()}`)
                    ]
                });
            }
            ctx.isInsideRequesterChannel = true;
        }
        if (ctx.context instanceof ChatInputCommandInteraction) await ctx.context.deferReply({ ephemeral: requester?.channel?.id === ctx.context.channel?.id });
        const argsQuery = await ctx.args?.restResult("string");
        if (argsQuery?.isErr() && !ctx.options) {
            return ctx.send({
                embeds: [
                    Util.createEmbed("error", "Please provide a valid query", true)
                ]
            });
        }
        const query = argsQuery?.unwrapOr(undefined) ?? ctx.options?.getString("query", true);
        const result = await ShoukakuHandler.restResolve(this.container.client.shoukaku.getIdealNode()!, query!, ShoukakuHandler.getProvider(query!));
        if ("error" in result) {
            return ctx.send({
                embeds: [
                    Util.createEmbed("error", `Error when searching track: \`${result.error}\``, true)
                ]
            });
        }
        if (result.loadType === LoadType.EMPTY) {
            return ctx.send({
                embeds: [
                    Util.createEmbed("error", "Couldn't obtain any result matching the query", true)
                ]
            });
        }
        const dispatcher = this.container.client.shoukaku.getDispatcher({
            guild: ctx.context.guild!,
            member: ctx.context.member as GuildMember,
            textChannel: ctx.context.channel as TextChannel,
            voiceChannel: (ctx.context.member! as GuildMember).voice.channel as VoiceChannel
        });
        if (!dispatcher.player) {
            const response = await dispatcher.connect();
            if (response.error) {
                return ctx.send({
                    embeds: [
                        Util.createEmbed("error", `Failed when trying to join your channel: \`${response.error}\``, true)
                    ]
                });
            }
        }

        const toAdd: {
            track: ShoukakuTrack;
            requester: string;
        }[] = [];

        switch (result.loadType) {
            case LoadType.PLAYLIST: {
                toAdd.push(...result.data.tracks.map(x => ({
                    track: x,
                    requester: ctx.author.id
                })));
                break;
            }

            case LoadType.TRACK:
            case LoadType.SEARCH: {
                toAdd.push({
                    track: Array.isArray(result.data) ? result.data[0] : result.data,
                    requester: ctx.author.id
                });
                break;
            }

            default: {}
        }
        
        const added = await dispatcher.addTracks(
            toAdd
        );
        if (!dispatcher.player?.track && added.success.length > 0) {
            dispatcher.player?.playTrack({ track: { encoded: dispatcher.queue[0].base64 } });
        }
        await dispatcher.embedPlayer?.update();
        const sendTrackAdded = async (): Promise<void> => {
            await ctx.send({
                embeds: [
                    Util.createEmbed(
                        "success",
                        `Added ${result.loadType === LoadType.PLAYLIST ? `**${result.data.info.name ?? "Unknown Playlist"}** (${added.success.length} tracks)` : `\`${escapeMarkdown(toAdd[0].track.info.title)}\``} to the queue`,
                        true
                    ).setThumbnail(result.loadType === LoadType.PLAYLIST ? " " : new Track(toAdd[0].track, ctx.author.id).displayThumbnail)
                ]
            });
        };

        if (added.success.length > 0) {
            if (ctx.isCommand()) await sendTrackAdded();
            if (!ctx.isCommand() && requester?.channel?.id !== ctx.context.channelId) {
                await sendTrackAdded();
            }
            if (!ctx.isCommand() && requester?.channel?.id === ctx.context.channelId && result.loadType === LoadType.PLAYLIST) {
                await sendTrackAdded();
            }
        }
        if (added.overload.length > 0 || added.duplicate.length > 0) {
            return ctx.send({
                embeds: [
                    Util.createEmbed(
                        "error",
                        `Over ${added.duplicate.length > 0 ? `\`${added.duplicate.length}\` duplicate tracks are skipped` : ""} ${added.overload.length > 0 ? `${added.duplicate.length > 0 ? "and" : ""} over \`${added.overload.length}\` tracks are skipped because exceeds max queue limit for this server (${added.queueLimit!} tracks)` : ""}`
                    )
                ]
            });
        }
    }
}
