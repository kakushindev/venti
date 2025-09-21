import util from "node:util";
import { codeBlock, EmbedBuilder } from "@discordjs/builders";
import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import type { CommandOptions, Args } from "@sapphire/framework";
import { reply } from "@sapphire/plugin-editable-commands";
import type { Message } from "discord.js";

@ApplyOptions<CommandOptions>({
    aliases: [],
    name: "eval",
    quotes: [],
    description: "owo whats this",
    preconditions: ["ownerOnly"],
    requiredClientPermissions: ["SendMessages", "EmbedLinks"]
})
export class EvalCommand extends Command {
    public async messageRun(message: Message, args: Args): Promise<any> {
        const msg = message;
        const userArgument = await args.restResult("string");
        const value = userArgument.unwrapOr(undefined);
        if (!value) return reply(message, { embeds: [new EmbedBuilder().setDescription("❌ | You need to input code")] });
        const code = value
            .replaceAll("`", `\`${String.fromCharCode(8_203)}`)
            .replaceAll("@", `@${String.fromCharCode(8_203)}`)
            .replace(this.container.client.token!, "[Censored]");
        try {
            // eslint-disable-next-line no-eval
            let { evaled } = await EvalCommand.parseEval(eval(code));
            if (typeof evaled !== "string") evaled = util.inspect(evaled, { depth: 0 });
            await reply(msg, {
                content: codeBlock("js", evaled)
            });
        } catch (error: any) {
            await reply(msg, {
                content: codeBlock("js", (error as Error).message)
            });
        }
    }

    public static parseType(input: any): string {
        if (input instanceof Buffer) {
            let length = Math.round(input.length / 1_024 / 1_024);
            let ic = "MB";
            if (!length) {
                length = Math.round(input.length / 1_024);
                ic = "KB";
            }
            if (!length) {
                length = Math.round(input.length);
                ic = "Bytes";
            }
            return `Buffer (${length} ${ic})`;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return input === null || input === undefined ? "Void" : input.constructor.name;
    }

    public static async parseEval(input: any): Promise<{ evaled: string; type: string; }> {
        const isPromise =
            input instanceof Promise &&
            typeof input.then === "function" &&
            typeof input.catch === "function";
        if (isPromise) {
            input = await input;
            return {
                evaled: input,
                type: `Promise<${EvalCommand.parseType(input)}>`
            };
        }
        return {
            evaled: input,
            type: EvalCommand.parseType(input)
        };
    }
}
