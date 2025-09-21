/* eslint-disable no-unused-vars */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */
import { setTimeout } from "node:timers";
import type { Guild, Snowflake, TextChannel, VoiceChannel, VoiceState } from "discord.js";
import { TrackEndReason } from "lavalink-api-types/v4";
import type { Player, TrackEndEvent, TrackExceptionEvent, Track as ShoukakuTrack } from "shoukaku";
import type { DispatcherOptions } from "../typings/index.js";
import { EmbedPlayer } from "../utils/EmbedPlayer.js";
import { Util } from "../utils/Util.js";
import { Track } from "./Track.js";
import type { Venti } from "./Venti.js";

const nonEnum = { enumerable: false };

export enum LoopType {
    NONE = 0,
    ALL = 1,
    ONE = 2
}

export class Queue extends Array<Track> {
    public previousTrack!: Track;
    public get currentTrack(): Track | undefined {
        return this[0];
    }

    public get queueSize(): number {
        return Math.max(0, this.length - 1);
    }

    public get queued(): Track[] {
        return this.filter((x, i) => i !== 0);
    }

    public shuffle(): void {
        for (let i = this.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this[i], this[j]] = [this[j], this[i]];
        }
    }
}

export class Dispatcher {
    public readonly guild!: Guild;
    public readonly textChannel!: TextChannel;
    public readonly voiceChannel!: VoiceChannel;
    public readonly queue = new Queue();
    public timeout: NodeJS.Timeout | null = null;
    public votes: string[] = [];
    public loopState: LoopType = LoopType.NONE;
    public player!: Player | null;
    public embedPlayer: EmbedPlayer | undefined;
    private _lastMusicMessageID: Snowflake | null = null;
    private _lastExceptionMessageID: Snowflake | null = null;
    private _lastVoiceStateUpdateMessageID: Snowflake | null = null;

    public constructor(public readonly client: Venti, public readonly options: DispatcherOptions) {
        Object.assign(this, {
            guild: options.guild,
            textChannel: options.textChannel,
            voiceChannel: options.voiceChannel
        });

        Object.defineProperties(this, {
            _lastMusicMessageID: nonEnum,
            _lastVoiceStateUpdateMessageID: nonEnum
        });
    }

    public async connect(): Promise<{ success: boolean; error?: string; }> {
        if (this.player) return { success: true };
        const response = await this.client.shoukaku.joinVoiceChannel({
            guildId: this.guild.id,
            shardId: this.guild.shardId,
            channelId: this.voiceChannel.id,
            deaf: true
        }).catch((error: unknown) => ({ error: (error as Error).message }));
        if ("error" in response) return { success: false, error: response.error };
        this.embedPlayer = new EmbedPlayer(this);
        await this.embedPlayer.fetch();
        this.player = response;
        this.handleEvent(this.player);
        return { success: true };
    }

    public async addTracks(
        data: { track: ShoukakuTrack; requester: string; }[]
    ): Promise<{ duplicate: string[]; overload: string[]; success: string[]; queueLimit: number | null; }> {
        const settings = await this.client.databases.guild.get(this.guild.id, {
            select: {
                allow_duplicate: true,
                max_queue: true
            }
        });
        const added: { duplicate: string[]; overload: string[]; success: string[]; queueLimit: number | null; } = {
            duplicate: [],
            overload: [],
            success: [],
            queueLimit: settings.max_queue
        };
        for (const { track, requester } of data) {
            if (!settings.allow_duplicate && this.queue.some(x => x.info.identifier === track.info.identifier)) {
                added.duplicate.push(track.encoded);
                continue;
            }
            if (settings.max_queue && !Number.isNaN(settings.max_queue) && this.queue.length >= settings.max_queue) {
                added.overload.push(track.encoded);
                continue;
            }
            this.queue.push(new Track(track, requester));
            added.success.push(track.encoded);
        }
        return added;
    }

    public destroy(): void {
        if (this.player) void this.player.destroy();
        this.oldMusicMessage = null;
        this.oldVoiceStateUpdateMessage = null;
        Object.assign(this, { queue: [] });
        void this.embedPlayer?.update();
        this.client.shoukaku.queue.delete(this.guild.id);
    }

    public handleEvent(player: Player): void {
        player.on("start", async () => {
            void this.embedPlayer?.update();
            if (!this.embedPlayer?.message) {
                this.oldMusicMessage = await this.textChannel.send({
                    embeds: [
                        Util.createEmbed("info", `Started playing: \`${this.queue[0].displayTitle}\``)
                    ]
                }).then(x => x.id);
            }
        });
        player.on("end", async (data: TrackEndEvent) => {
            if (data.reason === TrackEndReason.Replaced) return;
            this.queue.previousTrack = this.queue[0];
            this.queue.shift();
            if (["loadFailed", "cleanup"].includes(data.reason) && this.queue.length > 0) {
                await player.playTrack({ track: { encoded: this.queue[0].base64 } });
                return;
            }
            if (this.loopState === LoopType.ALL) this.queue.push(this.queue.previousTrack);
            if (this.loopState === LoopType.ONE) this.queue.unshift(this.queue.previousTrack);
            void this.embedPlayer?.update();
            if (this.queue.length > 0) {
                await player.playTrack({
                    track: {
                        encoded: this.queue[0].base64
                    }
                });
                return;
            }
            if (!this.embedPlayer?.message) {
                await this.textChannel.send({
                    embeds: [
                        Util.createEmbed("info", "We've run out of songs! Better queue up some more tunes.")
                            .setTitle("**Queue Concluded**")
                    ]
                }).then(x => x.id);
            }
            this.destroy();
        });
        player.on("exception", async (data: TrackExceptionEvent) => {
            this.oldExceptionMessage = await this.textChannel.send({
                embeds: [
                    Util.createEmbed("error", `There is an exception while trying to play this track:\n\`\`\`java\n${data.exception.message}\`\`\``, true)
                ]
            }).then(x => x.id);
            if (this.embedPlayer?.textChannel) {
                setTimeout(() => {
                    this.oldExceptionMessage = null;
                }, 5_000);
            }
        });
    }

    public get listeners(): VoiceState[] {
        if (this.guild.members.me?.voice.channelId && this.player) {
            const states = this.guild.voiceStates.cache.filter(x => x.channelId === this.voiceChannel.id && x.id !== this.client.user!.id);
            return [...states.values()];
        }
        return [];
    }

    public get oldMusicMessage(): Snowflake | null {
        return this._lastMusicMessageID;
    }

    public set oldMusicMessage(id: Snowflake | null) {
        if (this._lastMusicMessageID !== null) {
            this.textChannel.messages.fetch(this._lastMusicMessageID)
                .then(async m => m.delete())
                .catch((error: unknown) => this.client.logger.error(error));
        }
        this._lastMusicMessageID = id;
    }

    public get oldVoiceStateUpdateMessage(): Snowflake | null {
        return this._lastVoiceStateUpdateMessageID;
    }

    public set oldVoiceStateUpdateMessage(id: Snowflake | null) {
        if (this._lastVoiceStateUpdateMessageID !== null) {
            this.textChannel.messages.fetch(this._lastVoiceStateUpdateMessageID)
                .then(async m => m.delete())
                .catch((error: unknown) => this.client.logger.error(error));
        }
        this._lastVoiceStateUpdateMessageID = id;
    }

    public get oldExceptionMessage(): Snowflake | null {
        return this._lastExceptionMessageID;
    }

    public set oldExceptionMessage(id: Snowflake | null) {
        if (this._lastExceptionMessageID !== null) {
            this.textChannel.messages.fetch(this._lastExceptionMessageID)
                .then(async m => m.delete())
                .catch((error: unknown) => this.client.logger.error(error));
        }
        this._lastExceptionMessageID = id;
    }
}
