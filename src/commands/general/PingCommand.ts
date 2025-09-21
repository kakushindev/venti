import { ApplyOptions } from "@sapphire/decorators";
import type { ApplicationCommandRegistry } from "@sapphire/framework";
import { Command, RegisterBehavior } from "@sapphire/framework";
import type { ColorResolvable, ChatInputCommandInteraction, Message } from "discord.js";
import { devGuilds, isDev } from "../../config.js";
import { CommandContext } from "../../structures/CommandContext.js";
import { EmbedBuilder } from "@discordjs/builders";

@ApplyOptions<Command.Options>({
    aliases: [],
    name: "ping",
    preconditions: ["isInsideRequester"],
    description: "Shows the current ping of the bot",
    requiredClientPermissions: ["EmbedLinks"]
})
export class PingCommand extends Command {
    public override registerApplicationCommands(registry: ApplicationCommandRegistry): void {
        registry.registerChatInputCommand({
            name: this.name,
            description: this.description
        }, {
            guildIds: isDev ? devGuilds : [],
            behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
            registerCommandIfMissing: true
        });
    }

    public messageRun(message: Message): any {
        return this.run(new CommandContext(message));
    }

    public chatInputRun(interaction: ChatInputCommandInteraction<"cached">): any {
        return this.run(new CommandContext(interaction));
    }

    public run(ctx: CommandContext): any {
        ctx.send({ content: "🏓 Pong!" }, true).then(msg => {
            const wsLatency = this.container.client.ws.ping.toFixed(0);
            if (msg) {
                const latency = msg.createdTimestamp - ctx.context.createdTimestamp;
                msg.edit({
                    content: " ",
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: "🏓 PONG!", iconURL: this.container.client.user!.displayAvatarURL() })
                            .setColor(PingCommand.searchHex(wsLatency) as number)
                            .addFields({
                                name: "📶 API Latency",
                                value: `**\`${latency}\`** ms`,
                                inline: true
                            }, {
                                name: "🌐 WebSocket Latency",
                                value: `**\`${wsLatency}\`** ms`,
                                inline: true
                            })
                            .setFooter({ text: `Requested by: ${ctx.author.tag}`, iconURL: ctx.author.displayAvatarURL() })
                            .setTimestamp()
                    ]
                }).catch(error => this.container.logger.error(error));
            }
        }).catch(error => this.container.logger.error(error));
    }

    private static searchHex(ms: number | string): ColorResolvable {
        const msNumber = typeof ms === 'string' ? parseInt(ms, 10) : ms;
        const listColorHex = [
            [0, 20, 0x0DFF00],
            [21, 50, 0x0BC700],
            [51, 100, 0xE5ED02],
            [101, 150, 0xFF8C00],
            [150, 200, 0xFF6A00]
        ];

        const defaultColor = 0xFF0D00;

        const min = listColorHex.map(e => e[0]);
        const max = listColorHex.map(e => e[1]);
        const hex = listColorHex.map(e => e[2]);
        let ret: number | string = 0x000000;

        for (let i = 0; i < listColorHex.length; i++) {
            if (min[i] <= msNumber && msNumber <= max[i]) {
                ret = hex[i];
                break;
            } else {
                ret = defaultColor;
            }
        }
        return ret;
    }
}
