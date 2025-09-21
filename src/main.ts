// Sapphire Plugins
import "@sapphire/plugin-editable-commands/register";

import { BucketScope } from "@sapphire/framework";
import "dotenv/config";
import process from "node:process";
import { devs, isDev, prefix } from "./config.js";
import { Venti } from "./structures/Venti.js";
import { IntentsBitField } from "discord.js";

const client = new Venti({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.GuildVoiceStates, IntentsBitField.Flags.GuildMembers],
    loadMessageCommandListeners: true,
    fetchPrefix: () => prefix,
    defaultCooldown: {
        delay: 10_000,
        filteredUsers: devs,
        limit: 2,
        scope: BucketScope.Channel
    },
    logger: {
        // pino: {
        //     name: "venti",
        //     timestamp: true,
        //     level: isDev ? "debug" : "info",
        //     formatters: {
        //         bindings: () => ({
        //             pid: "Venti"
        //         })
        //     },
        //     transport: {
        //         targets: [
        //             { target: "pino-pretty", level: isDev ? "debug" : "info", options: { translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l o" } }
        //         ]
        //     }
        // }
    }
});

process.on("unhandledRejection", e => {
    client.logger.error(e);
});

process.on("uncaughtException", e => {
    client.logger.fatal(e);
    process.exit(1);
});

await client.login(process.env.DISCORD_TOKEN).catch(error => client.logger.error(error));
