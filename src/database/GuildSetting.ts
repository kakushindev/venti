import type { guilds, Prisma } from "@prisma/client";
import type { Snowflake } from "discord-api-types/globals";
import type { Venti } from "../structures/Venti.js";

export class GuildSetting {
    public constructor(public readonly client: Venti) {}

    public async fetchGuildRequester(id: Snowflake): Promise<{ channel: string | null | undefined; message: string | null | undefined; }> {
        const data = await this.client.prisma.guilds.findFirst({
            select: {
                requester_channel: true,
                requester_message: true
            },
            where: {
                id
            }
        });
        return { channel: data?.requester_channel, message: data?.requester_message };
    }

    public async get(id: Snowflake, options: Prisma.guildsFindFirstArgs = {}): Promise<guilds> {
        if (options.select) {
            options.select.id = true;
        }
        let data = await this.client.prisma.guilds.findFirst({
            where: {
                id
            },
            ...options
        }).catch(error => this.client.logger.error(error));
        if (!data) {
            data = await this.client.prisma.guilds.create({
                data: {
                    id
                }
            });
        }
        return data;
    }
}
