import { URL } from "url";
import { EmbedBuilder } from "@discordjs/builders";
import { Colors } from "discord.js";
import type { ColorResolvable } from "discord.js";
import prettyMilliseconds from "pretty-ms";
import { embedInfoColor, Emojis } from "../constants/index.js";

type hexColorsType = "error" | "info" | "success" | "warn";
const hexColors: Record<hexColorsType, ColorResolvable> = {
    error: Colors.Red,
    info: Number.parseInt(embedInfoColor.replace("#", ""), 16),
    success: Colors.Green,
    warn: Colors.Yellow
};

// eslint-disable-next-line typescript/no-extraneous-class
export class Util {
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

    // eslint-disable-next-line no-unused-vars
    public static chunk<T>(arr: T[], len: number): T[][];
    // eslint-disable-next-line no-unused-vars
    public static chunk(arr: string, len: number): string[];
    public static chunk(...args: any[]): any[] {
        // eslint-disable-next-line typescript/no-unsafe-assignment
        const [arr, len] = args as [any, number];
        const rest: (typeof arr)[] = [];
        // eslint-disable-next-line typescript/no-unsafe-member-access, typescript/no-unsafe-call
        for (let i = 0; i < arr.length; i += len) { rest.push(arr.slice(i, i + len)); }
        // eslint-disable-next-line typescript/no-unsafe-return
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
