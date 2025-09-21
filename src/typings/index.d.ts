import type { Guild, GuildMember, TextChannel, VoiceChannel } from "discord.js";

export type DispatcherOptions = {
    guild: Guild;
    member: GuildMember;
    textChannel: TextChannel;
    voiceChannel: VoiceChannel;
};
