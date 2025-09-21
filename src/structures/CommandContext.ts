/* eslint-disable typescript/no-unnecessary-condition */
/* eslint-disable stylistic/max-len */
/* eslint-disable typescript/no-shadow */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import { setTimeout } from "node:timers";
import type { Args } from "@sapphire/framework";
import type { MessageOptions } from "@sapphire/plugin-editable-commands";
import { send } from "@sapphire/plugin-editable-commands";
import type { InteractionReplyOptions, MessagePayload, GuildChannel, ButtonInteraction, StringSelectMenuInteraction, User, InteractionEditReplyOptions, Interaction } from "discord.js";
import { InteractionType, ChatInputCommandInteraction, Message, BaseInteraction, ComponentType } from "discord.js";

export type MessageInteractionAction = "editReply" | "followUp" | "reply";

export class CommandContext {
    public author!: User;
    public channel!: ChatInputCommandInteraction<"cached">["channel"] | Message["channel"];
    public options?: ChatInputCommandInteraction<"cached">["options"];
    public isInsideRequesterChannel = false;
    public constructor(public readonly context: BaseInteraction | Message, public args?: Args) {
        this.author = this.isInteraction() ? (this.context as Interaction).user : (this.context as Message).author;
        this.channel = this.context.channel;
        this.options = this.context instanceof ChatInputCommandInteraction ? this.context.options : undefined;
    }

    public async send(options: InteractionReplyOptions | MessageOptions | MessagePayload, fetchReply?: true): Promise<Message | null>;
    public async send(options: InteractionReplyOptions | MessageOptions | MessagePayload, fetchReply?: false): Promise<null>;
    public async send(options: InteractionReplyOptions | MessageOptions | MessagePayload, fetchReply = false): Promise<Message | null> {
        if (this.context instanceof BaseInteraction) {
            const interaction = this.context as ChatInputCommandInteraction;
            if (interaction.deferred && !interaction.replied) {
                return interaction.editReply(options as InteractionEditReplyOptions) as Promise<Message | null>;
            } else if (interaction.replied) {
                return interaction.followUp(typeof options === "string"
                    ? { content: options, ephemeral: interaction.ephemeral ?? false } as InteractionReplyOptions
                    : { ...options, ephemeral: interaction.ephemeral ?? false } as InteractionReplyOptions) as Promise<Message | null>;
            }
            if (this.isInsideRequesterChannel && // @ts-expect-error-next-line
                typeof options !== "string") options.ephemeral = true;
            const msg = await interaction.reply(typeof options === "string"
                ? { content: options, fetchReply } as InteractionReplyOptions
                : { ...options, fetchReply } as InteractionReplyOptions) as unknown as Message | null;
            return msg;
        }

        if ((options as MessageOptions).embeds && !(this.context.channel as GuildChannel).permissionsFor(this.context.guild!.members.me!).has(["ViewChannel", "SendMessages", "EmbedLinks"])) return null;

        const msg = await send(this.context, options as MessageOptions);
        if (this.isInsideRequesterChannel) {
            setTimeout(async () => {
                if (msg.deletable) await msg.delete();
            }, 5_000);
        }
        return msg;
    }

    public isInteraction(): boolean {
        return this.isCommand() || this.isContextMenu() || this.isMessageComponent() || this.isButton() || this.isSelectMenu();
    }

    public isCommand(): boolean {
        return (this.context.type as InteractionType) === InteractionType.ApplicationCommand && (this.context as unknown as { targetId: string | undefined; }).targetId === undefined;
    }

    public isMessageCommand(): boolean {
        return this.context instanceof Message;
    }

    public isContextMenu(): boolean {
        return (this.context.type as InteractionType) === InteractionType.ApplicationCommand && (this.context as unknown as { targetId: string | undefined; }).targetId !== undefined;
    }

    public isMessageComponent(): boolean {
        return (this.context.type as InteractionType) === InteractionType.MessageComponent;
    }

    public isButton(): boolean {
        return (
            (this.context.type as InteractionType) === InteractionType.MessageComponent &&
            (this.context as unknown as ButtonInteraction).componentType === ComponentType.Button
        );
    }

    public isSelectMenu(): boolean {
        return (
            this.context.type === InteractionType.MessageComponent &&
            (this.context as unknown as StringSelectMenuInteraction).componentType === ComponentType.StringSelect
        );
    }
}
