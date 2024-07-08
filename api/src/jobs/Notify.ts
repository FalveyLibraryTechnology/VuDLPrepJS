import { Job } from "bullmq";

import Config from "../models/Config";
import { NeedleResponse } from "../services/interfaces";
import QueueJob from "./QueueJobInterface";

import http = require("needle");

class Notify implements QueueJob {
    protected _request(channel: string, body: string): Promise<NeedleResponse> {
        console.log(`: ntfy (${channel}): ${body}`);

        return http("POST", `https://ntfy.sh/${channel}`, body);
    }

    async run(job: Job): Promise<void> {
        if (!(job.data.body ?? false)) {
            throw new Error("Notify: no body specified");
        }

        const config = Config.getInstance();

        if (config.notifyMethod !== "ntfy") {
            throw new Error(`Notify: invalid method '${config.notifyMethod}'`);
        }

        const channel = job.data.channel ?? config.ntfyConfig.defaultChannel;

        await this._request(channel, job.data.body);
    }
}

export default Notify;
