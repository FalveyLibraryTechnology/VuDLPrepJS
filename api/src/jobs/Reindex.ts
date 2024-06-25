import { Job } from "bullmq";
import QueueJob from "./QueueJobInterface";
import Config from "../models/Config";
import Solr from "../services/Solr";

class Reindex implements QueueJob {
    async run(job: Job): Promise<void> {
        console.log("Reindexing...", job?.data);
        if (typeof job?.data?.file === "undefined") {
            throw new Error("No file provided!");
        }
        const solr = Solr.getInstance();
        const result = await solr.reindexFromFile(Config.getInstance().solrCore, job.data.file);
        if (result.statusCode !== 200) {
            const msg =
                `Problem reindexing from ${job.data.file}: ` +
                (((result.body ?? {}).error ?? {}).msg ?? "unspecified error");
            console.error(msg);
            throw new Error(msg);
        }
    }
}

export default Reindex;
