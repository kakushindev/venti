/* eslint-disable typescript/no-non-null-assertion */
import { Colors, type ColorResolvable, type Embed, type PermissionsString } from "discord.js";
import prettyMilliseconds from "pretty-ms";
import { embedInfoColor, Emojis } from "../constants/index.js";
import type { Venti } from "../structures/Venti.js";
import { EmbedBuilder } from "@discordjs/builders";

type hexColorsType = "error" | "info" | "success" | "warn";
const hexColors: Record<hexColorsType, ColorResolvable> = {
    error: Colors.Red,
    info: parseInt(embedInfoColor.replace("#", ""), 16),
    success: Colors.Green,
    warn: Colors.Yellow
};

export class Util {
    public constructor(public readonly client: Venti) {}

    public static durationToMS(dur: string): number {
        return dur.split(":").map(Number).reduce((acc, curr) => curr + (acc * 60)) * 1_000;
    }

    public static formatDate(dateFormat: Intl.DateTimeFormat, date: Date | number = new Date()): string {
        const data = dateFormat.formatToParts(date);
        return "<year>-<month>-<day>"
            .replaceAll("<year>", data.find(dateVal => dateVal.type === "year")!.value)
            .replaceAll("<month>", data.find(dateVal => dateVal.type === "month")!.value)
            .replaceAll("<day>", data.find(dateVal => dateVal.type === "day")!.value);
    }

    public static formatMS(ms: number): string {
        if (Number.isNaN(ms)) throw new Error("value is not a number.");
        return prettyMilliseconds(ms, {
            verbose: true,
            compact: false,
            secondsDecimalDigits: 0
        });
    }

    public static createEmbed(type: hexColorsType, message?: string, emoji = false): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setColor(hexColors[type] as number);

        if (message) embed.setDescription(message);
        if (type === "error" && emoji) embed.setDescription(`${Emojis.NO} **|** ${message!}`);
        if (type === "success" && emoji) embed.setDescription(`${Emojis.YES} **|** ${message!}`);
        return embed;
    }

    public static readableTime(duration: number): string {
        const SECOND = 1_000;
        const MINUTE = SECOND * 60;
        const HOUR = MINUTE * 60;
        const seconds = Math.floor(duration / SECOND) % 60;
        if (duration < MINUTE) return `00:${seconds.toString().padStart(2, "0")}`;
        const minutes = Math.floor(duration / MINUTE) % 60;
        let output = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        if (duration >= HOUR) {
            const hours = Math.floor(duration / HOUR);
            output = `${hours.toString().padStart(2, "0")}:${output}`;
        }
        return output;
    }

    public static chunk<T>(arr: T[], len: number): T[][];
    public static chunk(arr: string, len: number): string[];
    public static chunk(...args: any[]): any[] {
        const [arr, len] = args as [any, number];
        const rest: (typeof arr)[] = [];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        for (let i = 0; i < arr.length; i += len) { rest.push(arr.slice(i, i + len)); }
        return rest;
    }

    public static isValidURL(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}
