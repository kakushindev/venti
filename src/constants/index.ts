/* eslint-disable typescript/naming-convention */
import process from "node:process";

export const embedInfoColor = process.env.CONFIG_EMBED_INFO_COLOR;
export const Emojis = {
    YES: process.env.CONFIG_EMOJI_YES,
    NO: process.env.CONFIG_EMOJI_NO
};

export const Images = {
    DEFAULT_BANNER: process.env.CONFIG_DEFAULT_BANNER
};

if (typeof process.env.CONFIG_EMBED_INFO_COLOR !== "string") throw new Error("CONFIG_EMBED_INFO_COLOR must be a hex color string");
for (const object of [...Object.entries(Emojis), ...Object.entries(Images)]) {
    if (typeof object[1] !== "string") throw new Error(`CONFIG_${object[0]} must be a string`);
}

declare global {
    namespace NodeJS {
        // eslint-disable-next-line typescript/consistent-type-definitions
        interface ProcessEnv {
            NODE_ENV: "development" | "production";
            DISCORD_TOKEN: string;
            LAVALINK_PASSWORD: string;
            LAVALINK_HOST: string;
            LAVALINK_PORT: string;
            DATABASE_URL: string;
            CONFIG_PREFIX: string;
            CONFIG_DEVS: string;
            CONFIG_EMBED_INFO_COLOR: string;
            CONFIG_DEFAULT_BANNER: string;
            CONFIG_EMOJI_YES: string;
            CONFIG_EMOJI_NO: string;
            CONFIG_DEV_GUILDS: string;
            LAVALINK_REST: string;
        }
    }
}
