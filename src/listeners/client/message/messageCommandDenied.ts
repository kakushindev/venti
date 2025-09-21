/* eslint-disable typescript/no-unsafe-enum-comparison */
import { setTimeout } from "node:timers";
import type { Events, MessageCommandDeniedPayload, UserError } from "@sapphire/framework";
import { Identifiers, Listener } from "@sapphire/framework";
import type { APIEmbed, MessageCreateOptions, PermissionsString } from "discord.js";
import { Util } from "../../../utils/Util.js";

export class MessageCommandDeniedListener extends Listener<typeof Events.MessageCommandDenied> {
    public override async run({ context, message: content, identifier }: UserError, { message }: MessageCommandDeniedPayload): Promise<any> {
        if (Reflect.get(new Object(context), "silent")) return;
        const payload: MessageCreateOptions = {
            embeds: [
                Util.createEmbed("error", content, true)
            ]
        };
        const cooldownRemaining = Reflect.get(new Object(context), "remaining") as number | undefined;
        if (cooldownRemaining && identifier === Identifiers.PreconditionCooldown) {
            payload.embeds = [
                Util.createEmbed("error", `**${message.author.username}**, please wait **${(cooldownRemaining / 1_000).toFixed(1)}** cooldown time.`, true)
            ];
        }
        const missingPerms = Reflect.get(new Object(context), "missing") as PermissionsString[] | undefined;
        if (missingPerms && [Identifiers.PreconditionClientPermissions, Identifiers.PreconditionUserPermissions].includes(identifier as Identifiers)) {
            payload.embeds = [
                Util.createEmbed("error", `${identifier === Identifiers.PreconditionClientPermissions ? "I am" : "You are"} missing the following permissions to run this command:\n\`\`\`diff\n${missingPerms.map(x => `- ${x}`).join("\n")}\`\`\``, true)
            ];
        }
        if (!message.channel.isDMBased() && !message.channel.permissionsFor(message.guild!.members.me!).has("EmbedLinks")) {
            payload.content = (payload.embeds![0] as APIEmbed).description;
            payload.embeds = [];
        }

        if (!message.channel.isSendable()) return;

        const msg = await message.channel.send({
            ...payload,
            allowedMentions: { users: [message.author.id], roles: [] }
        });
        // eslint-disable-next-line unicorn/no-await-expression-member
        if ((await this.container.client.databases.guild.fetchGuildRequester(message.guildId!)).channel === message.channelId) {
            setTimeout(async () => {
                if (msg.deletable) await msg.delete();
            }, 5_000);
        }
    }
}
