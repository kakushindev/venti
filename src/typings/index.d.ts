import type { PrismaClient } from "@prisma/client";
import type { Guild, GuildMember, TextChannel, VoiceChannel } from "discord.js";
import type { ShoukakuHandler } from "../structures/ShoukakuHandler.js";
import type { Venti } from "../structures/Venti.js";
import type { Util } from "../utils/Util.js";

export type DispatcherOptions = {
    guild: Guild;
    member: GuildMember;
    textChannel: TextChannel;
    voiceChannel: VoiceChannel;
};
