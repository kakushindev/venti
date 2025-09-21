/* eslint-disable unicorn/expiring-todo-comments */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable require-atomic-updates */
import { setTimeout, clearTimeout } from "node:timers";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { cast } from "@sapphire/utilities";
import type { Collection, GuildMember, Message, Snowflake, VoiceChannel, VoiceState } from "discord.js";
import { deleteQueueTimeout } from "../../config.js";
import type { Dispatcher } from "../../structures/Dispatcher.js";
import { Util } from "../../utils/Util.js";

@ApplyOptions<Listener.Options>({
    event: "voiceStateUpdate"
})
export class VoiceStateUpdateEvent extends Listener {
    public override async run(oldState: VoiceState, newState: VoiceState): Promise<any> {
        const dispatcher = this.container.client.shoukaku.queue.get(newState.guild.id);
        if (!dispatcher) return undefined;

        const newVC = newState.channel;
        const oldVC = oldState.channel;
        const oldID = oldVC?.id;
        const newID = newVC?.id;
        const queueVCId = dispatcher.voiceChannel.id;
        const queueVC = cast<VoiceChannel | undefined>(newState.guild.channels.cache.get(cast<string>(dispatcher.voiceChannel.id)));
        const oldMember = oldState.member;
        const member = newState.member;
        const queueVCMembers = queueVC?.members.filter(m => !m.user.bot);
        const newVCMembers = newVC?.members.filter(m => !m.user.bot);
        const botID = this.container.client.user!.id; // TODO: Handle bot moved & kicked from voice channel in VoiceConnection directly?

        // Handle when bot gets kicked from the voice channel
        if (queueVCId && oldMember?.id === botID && oldID === queueVCId && newID === undefined) {
            try {
                await dispatcher.player?.setPaused(true);
                clearTimeout(dispatcher.timeout!);
                this.container.client.logger.info(`Disconnected from the voice channel at ${newState.guild.name}, the queue was deleted.`);
                const msg = await dispatcher.textChannel.send({
                    embeds: [
                        Util.createEmbed("warn", "I was disconnected from the voice channel, the queue will be deleted")
                    ]
                })
                    .then(m => {
                        dispatcher.oldMusicMessage = null; dispatcher.oldVoiceStateUpdateMessage = null; return m;
                    })
                    .catch((error: unknown) => {
                        this.container.client.logger.error(error);
                    });
                if (dispatcher.embedPlayer?.textChannel) {
                    setTimeout(async () => {
                        if (msg?.deletable) await msg.delete();
                    }, 5_000);
                }
                dispatcher.destroy();
            } catch (error) {
                this.container.client.logger.error(error);
            }
        }

        if (newState.mute !== oldState.mute || newState.deaf !== oldState.deaf) return undefined; // TODO: Handle all listeners deaf & bot muted event?

        // Handle when the bot is moved to another voice channel
        if (queueVCId && member?.id === botID && oldID === queueVCId && newID !== queueVCId && newID !== undefined) {
            if (!newVCMembers) return undefined;
            if (newVCMembers.size === 0 && dispatcher.timeout === null) await this.doTimeout(newVCMembers, dispatcher);
            else if (newVCMembers.size > 0 && dispatcher.timeout !== null) await this.resumeTimeout(newVCMembers, dispatcher);
        }

        // Handle when user leaves voice channel
        if (
            queueVCId &&
            queueVCMembers &&
            oldID === queueVCId &&
            newID !== queueVCId &&
            !member?.user.bot &&
            dispatcher.timeout === null &&
            deleteQueueTimeout !== 0
        ) await this.doTimeout(queueVCMembers, dispatcher);

        // Handle when user joins voice channel or bot gets moved
        if (
            newID === queueVCId &&
            !member?.user.bot &&
            deleteQueueTimeout !== 0 &&
            queueVCMembers
        ) await this.resumeTimeout(queueVCMembers, dispatcher);

        return null;
    }

    private async doTimeout(vcMembers: Collection<Snowflake, GuildMember>, dispatcher: Dispatcher): Promise<any> {
        try {
            if (vcMembers.size > 0) return undefined;
            clearTimeout(dispatcher.timeout!);
            dispatcher.timeout = null;
            void dispatcher.embedPlayer?.update();
            await dispatcher.player?.setPaused(true);
            const duration = Util.formatMS(deleteQueueTimeout);
            dispatcher.oldVoiceStateUpdateMessage = null;
            dispatcher.timeout = setTimeout(async () => {
                dispatcher.oldMusicMessage = null; dispatcher.oldVoiceStateUpdateMessage = null;
                const msg = await dispatcher.textChannel.send({
                    embeds: [
                        Util.createEmbed("error", `**${duration}** have passed and there is no one who joins my voice channel, the queue was deleted.`)
                            .setTitle("⏹ Queue deleted.")
                    ]
                }).catch((error: unknown) => this.container.client.logger.error(error));
                dispatcher.destroy();
                if (dispatcher.embedPlayer?.textChannel) {
                    setTimeout(async () => {
                        if ((msg as Message | undefined)?.deletable) await (msg as Message).delete();
                    }, 5_000);
                }
            }, deleteQueueTimeout);
            dispatcher.textChannel.send({
                embeds: [
                    Util.createEmbed("warn", `
Everyone has left from my voice channel, to save resources, the queue was paused.
If there's no one who joins my voice channel in the next **${duration}**, the queue will be deleted.
                    `)
                        .setTitle("⏸ Queue paused.")
                ]
            }).then(m => {
                dispatcher.oldVoiceStateUpdateMessage = m.id; return m;
            }).catch((error: unknown) => this.container.client.logger.error(error));
        } catch (error) { this.container.client.logger.error(error); }

        return null;
    }

    private async resumeTimeout(vcMembers: Collection<Snowflake, GuildMember>, dispatcher: Dispatcher): Promise<any> {
        if (vcMembers.size > 0) {
            if (!dispatcher.player?.paused) return undefined;
            try {
                clearTimeout(dispatcher.timeout!);
                dispatcher.timeout = null;
                dispatcher.oldVoiceStateUpdateMessage = null;
                void dispatcher.embedPlayer?.update();
                await dispatcher.player.setPaused(false);
            } catch (error) { this.container.client.logger.error(error); }
        }

        return null;
    }
}
