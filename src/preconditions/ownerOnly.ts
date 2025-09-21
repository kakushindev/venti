import { ApplyOptions } from "@sapphire/decorators";
import type { PreconditionOptions, PreconditionResult } from "@sapphire/framework";
import { Precondition } from "@sapphire/framework";
import type { Message } from "discord.js";
import { devs } from "../config.js";

@ApplyOptions<PreconditionOptions>({
    name: "ownerOnly"
})
export class ownerOnly extends Precondition {
    public messageRun(message: Message): PreconditionResult {
        return devs.includes(message.author.id) ? this.ok() : this.error({ message: "Only bot owner can do this" });
    }
}
