import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import type { Venti } from "../../structures/Venti.js";

@ApplyOptions<Listener.Options>({
    once: true,
    event: "ready"
})
export class ReadyListener extends Listener {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, options);
    }

    public run(client: Venti): any {
        this.container.client.logger.info(`Venti: Logged in as ${client.user!.tag} (${client.user!.id})`);
    }
}
