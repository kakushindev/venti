import { cast } from "@sapphire/utilities";
import { Collection } from "discord.js";
import got from "got";
import { V4 } from "lavalink-api-types";
import type { LavalinkResponse, Node } from "shoukaku";
import { Connectors, Shoukaku } from "shoukaku";
import { lavalink, lavalinkRest } from "../config.js";
import type { DispatcherOptions } from "../typings/index.js";
import { Util } from "../utils/Util.js";
import { Dispatcher } from "./Dispatcher.js";
import type { Venti } from "./Venti.js";

export class ShoukakuHandler extends Shoukaku {
    public readonly queue = new Collection<string, Dispatcher>();
    public constructor(public readonly client: Venti) {
        super(new Connectors.DiscordJS(client), lavalink.servers, lavalink.options);
    }

    public getDispatcher(options: DispatcherOptions): Dispatcher {
        if (!this.client.shoukaku.queue.has(options.guild.id)) {
            this.queue.set(options.guild.id, new Dispatcher(this.client, options));
        }
        return this.client.shoukaku.queue.get(options.guild.id)!;
    }

    public static getProvider(query: string): V4.LavalinkSource | undefined {
        if (Util.isValidURL(query)) return undefined;
        return V4.LavalinkSource.Youtube;
    }

    public static async restResolve(node: Node, identifier: string, search?: V4.LavalinkSource): Promise<LavalinkResponse | { error: string; }> {
        let result;
        try {
            const searchTypes: Record<string, string> = { soundcloud: "scsearch:", youtube: "ytsearch:", youtubemusic: "ytmsearch:" };
            // @ts-expect-error Rest#url is private
            const url = new URL(lavalinkRest.host ?? cast<string>(node.rest.url));
            url.pathname = "/v4/loadtracks";
            const response = await got.get(url.toString(), {
                searchParams: {
                    identifier: `${searchTypes[search!] || ""}${identifier}`
                },
                headers: {
                    // @ts-expect-error Rest#auth is private
                    Authorization: lavalinkRest.auth ?? node.rest.auth
                }
            }).json<LavalinkResponse>().catch((error: Error) => ({ error: error.message }));
            if ("error" in response) result = response;
            return response;
        } catch (error) {
            result = Promise.resolve({
                error: (error as Error).message
            });
        }
        return result;
    }
}
