/* eslint-disable no-unused-vars */
import { Buffer } from "node:buffer";
import { decode } from "@lavalink/encoding";
import { escapeMarkdown } from "discord.js";
import type { Track as ShoukakuTrack } from "shoukaku";
import DataInput from "../utils/DataInput.js";

export class DecodeTrack {
    public title: string;
    public author: string;
    public length: number;
    public isStream: boolean;
    public identifier: string;
    public artworkUrl: string | null;
    public uri: string | null;
    public source: string;
    public position: number;

    public constructor(buffer: Uint8Array) {
        const input = new DataInput(buffer);
        void (input.readInt() >> 30);
        input.readByte();

        this.title = input.readUTF();
        this.author = input.readUTF();
        this.length = Number(input.readLong());
        this.identifier = input.readUTF();
        this.isStream = input.readBoolean();
        this.uri = input.readBoolean() ? input.readUTF() : null;
        this.artworkUrl = input.readBoolean() ? input.readUTF() : null;
        this.source = input.readUTF();
        this.position = Number(input.readLong());
    }
}

export class Track {
    public raw!: DecodeTrack | undefined;
    public base64!: string;
    public info!: ShoukakuTrack["info"];
    public displayTitle!: string;
    public constructor(public readonly track: ShoukakuTrack, public readonly requester: string) {
        this.info = track.info;
        this.base64 = track.encoded;
        this.displayTitle = escapeMarkdown(this.info.title.length > 45 ? `${this.info.title.slice(0, 45)}...` : this.info.title);
        try {
            this.raw = new DecodeTrack(new Uint8Array(Buffer.from(this.base64, "base64")));
        } catch {
            try {
                this.raw = decode(this.base64) as unknown as DecodeTrack;
            } catch {
                throw new Error("Trying to decode invalid base64");
            }
        }
    }

    public get displayThumbnail(): string {
        if (this.raw?.artworkUrl !== null && this.raw?.artworkUrl !== undefined) return this.raw.artworkUrl;
        return `https://i.ytimg.com/vi/${this.info.identifier}/maxresdefault.jpg`;
    }
}
