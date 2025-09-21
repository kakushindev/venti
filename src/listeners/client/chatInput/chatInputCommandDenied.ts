/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { Events, UserError, ChatInputCommandDeniedPayload } from "@sapphire/framework";
import { Listener, Identifiers } from "@sapphire/framework";
import type { ChatInputCommandInteraction, MessageCreateOptions, PermissionsString } from "discord.js";
import { CommandContext } from "../../../structures/CommandContext.js";
import { Util } from "../../../utils/Util.js";

export class ChatInputCommandDeniedListener extends Listener<typeof Events.ChatInputCommandDenied> {
    public override run({ context, message: content, identifier }: UserError, { interaction }: ChatInputCommandDeniedPayload): any {
        if (Reflect.get(new Object(context), "silent")) return;
        const payload: MessageCreateOptions = {
            embeds: [
                Util.createEmbed("error", content, true)
            ]
        };
        const cooldownRemaining = Reflect.get(new Object(context), "remaining") as number | undefined;
        if (cooldownRemaining && identifier === Identifiers.PreconditionCooldown) {
            payload.embeds = [
                Util.createEmbed("error", `**${interaction.user.username}**, please wait **${(cooldownRemaining / 1_000).toFixed(1)}** cooldown time.`, true)
            ];
        }
        const missingPerms = Reflect.get(new Object(context), "missing") as PermissionsString[] | undefined;
        if (missingPerms && [Identifiers.PreconditionClientPermissions, Identifiers.PreconditionUserPermissions].includes(identifier as Identifiers)) {
            payload.embeds = [
                Util.createEmbed("error", `${identifier === Identifiers.PreconditionClientPermissions ? "I am" : "You are"} missing the following permissions to run this command:\n\`\`\`diff\n${missingPerms.map(x => `- ${x}`).join("\n")}\`\`\``, true)
            ];
        }
        return new CommandContext(interaction as ChatInputCommandInteraction<"cached">).send({
            ...payload,
            allowedMentions: { users: [interaction.user.id], roles: [] },
            ephemeral: true
        });
    }
}
