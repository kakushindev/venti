import { ApplyOptions } from "@sapphire/decorators";
import type { PreconditionOptions, PreconditionResult } from "@sapphire/framework";
import { Precondition } from "@sapphire/framework";

@ApplyOptions<PreconditionOptions>({
    name: "isNodeAvailable"
})
export class isNodeAvailable extends Precondition {
    public chatInputRun(): PreconditionResult {
        return this.precondition();
    }

    public messageRun(): PreconditionResult {
        return this.precondition();
    }

    private precondition(): PreconditionResult {
        // eslint-disable-next-line typescript/no-unsafe-enum-comparison
        return this.container.client.shoukaku.getIdealNode() ? this.ok() : this.error({ message: "There's no node available" });
    }
}
