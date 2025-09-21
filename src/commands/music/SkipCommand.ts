import { ApplyOptions } from "@sapphire/decorators";
import type { ApplicationCommandRegistry, Args } from "@sapphire/framework";
import { Command, RegisterBehavior } from "@sapphire/framework";
import type { ChatInputCommandInteraction, GuildMember, Message } from "discord.js";
import { devGuilds, isDev } from "../../config.js";
import { CommandContext } from "../../structures/CommandContext.js";
import { Util } from "../../utils/Util.js";

@ApplyOptions<Command.Options>({
    aliases: [],
    name: "skip",
    description: "Skip current music",
    preconditions: ["isPlayerPlaying", "memberInVoice", "memberVoiceJoinable", "memberInSameVoice"],
    requiredClientPermissions: ["EmbedLinks"]
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

    public async chatInputRun(interaction: ChatInputCommandInteraction<"cached">): Promise<any> {
        return this.run(new CommandContext(interaction));
    }

    public async messageRun(message: Message, args: Args): Promise<any> {
        return this.run(new CommandContext(message, args));
    }

    public async run(ctx: CommandContext): Promise<any> {
        const dispatcher = this.container.client.shoukaku.queue.get(ctx.context.guildId!)!;
        if (dispatcher.embedPlayer?.textChannel?.id === ctx.context.channelId) ctx.isInsideRequesterChannel = true;
        const listeners = dispatcher.listeners;
        const data = await this.container.client.databases.guild.get(ctx.context.guild!.id, {
            select: {
                dj_roles: true,
                dj_state: true
            }
        });
        if (data.dj_state && // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            (ctx.context.member as GuildMember).roles.cache.some(x => (data.dj_roles || []).includes(x.id))) {
            if (!ctx.isInsideRequesterChannel) {
                await ctx.send({
                    embeds: [Util.createEmbed("success", `Skipped **[${dispatcher.queue.currentTrack!.displayTitle}](${dispatcher.queue.currentTrack!.info.uri})**`)]
                });
            }
            return dispatcher.player?.stopTrack();
        }
        if (listeners.length > 3 && dispatcher.queue.currentTrack?.requester !== ctx.author.id) {
            if (dispatcher.votes.includes(ctx.author.id)) {
                return ctx.send({
                    embeds: [
                        Util.createEmbed("error", "You are already voted for skip", true)
                    ]
                });
            }
            dispatcher.votes.push(ctx.author.id);
            const needed = Math.round(listeners.length * 0.4);
            if (dispatcher.votes.length < needed) {
                return ctx.send({
                    embeds: [
                        Util.createEmbed("info", `Need more votes to skip the song! **[**\`${dispatcher.votes.length}\`**/**\`${needed}\`**]**`, true)
                    ]
                });
            }
        }
        await ctx.send({
            embeds: [
                Util.createEmbed("success", `Skipped \`${dispatcher.queue.currentTrack!.displayTitle}\``, true)
            ]
        });
        return dispatcher.player?.stopTrack();
    }
}
