import Prisma from "@prisma/client";
import { SapphireClient } from "@sapphire/framework";
import type { ClientOptions } from "discord.js";
import * as constants from "../constants/index.js";
import { GuildSetting } from "../database/GuildSetting.js";
import { Util } from "../utils/Util.js";
import { ShoukakuHandler } from "./ShoukakuHandler.js";

const { PrismaClient } = Prisma;

export class Venti extends SapphireClient {
    public readonly shoukaku = new ShoukakuHandler(this);
    public readonly util = new Util(this);
    public readonly constants = constants;
    public readonly prisma = new PrismaClient();
    public readonly databases = {
        guild: new GuildSetting(this)
    };

    public constructor(opt: ClientOptions) {
        super(opt);
    }
}

declare module "@sapphire/framework" {
    interface SapphireClient {
        shoukaku: ShoukakuHandler;
        util: Util;
        constants: typeof constants;
        prisma: Prisma.PrismaClient;
        databases: {
            guild: GuildSetting;
        };
    }

    interface Preconditions {
        ownerOnly: never;
        memberInVoice: never;
        memberVoiceJoinable: never;
        memberInSameVoice: never;
        isNodeAvailable: never;
        isInsideRequester: never;
        isPlayerPlaying: never;
    }
};



declare module "discord.js" {
    interface Client {
        shoukaku: ShoukakuHandler;
        prisma: Prisma.PrismaClient;
        util: Util;
        databases: Venti["databases"];
    }
}
