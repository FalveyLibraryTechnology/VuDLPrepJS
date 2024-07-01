import { Job } from "bullmq";
import Config from "../models/Config";
import QueueJob from "./QueueJobInterface";
import QueueManager from "../services/QueueManager";
import Solr from "../services/Solr";
import SolrIndexer from "../services/SolrIndexer";
import SolrCache from "../services/SolrCache";

class Index implements QueueJob {
    sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    async isFirstMatchingJob(job) {
        const matchingJobs = await QueueManager.getInstance().getActiveIndexJobsForPid(job.data.pid);
        let isFirst = true;
        (await matchingJobs).forEach((activeJob) => {
            if (parseInt(activeJob.id) < parseInt(job.id)) {
                isFirst = false;
            }
        });
        return isFirst;
    }

    protected async waitForEarlierIndexersToComplete(job, maxTries = 60, sleepMs = 1000): Promise<void> {
        let tries = 0;
        while (!(await this.isFirstMatchingJob(job))) {
            console.log("Waiting for an earlier job to complete...");
            await this.sleep(sleepMs);
            if (++tries >= maxTries) {
                throw new Error("Exceeded retries waiting for queue to clear");
            }
        }
    }

    protected async getExistingSolrDocument(pid: string) {
        const query = `id:"${pid.replace(/"/g, '\\"')}"`;
        const result = await Solr.getInstance().query(Config.getInstance().solrCore, query);
        if (result.statusCode !== 200) {
            throw new Error("Unexpected Solr response code.");
        }
        const response = result?.body?.response ?? { numFound: 0, start: 0, docs: [] };
        return response?.docs?.[0] ?? {};
    }

    protected async reindexChildren(pid: string): Promise<Record<string, unknown>> {
        // Find all the children of pid:
        const solr = Solr.getInstance();
        const config = Config.getInstance();
        const queue = QueueManager.getInstance();
        let offset = 0;
        let numFound = 0;
        const pageSize = 1000;
        do {
            const result = await solr.query(config.solrCore, `fedora_parent_id_str_mv:"${pid}"`, {
                fl: "id",
                start: offset.toString(),
                rows: pageSize.toString(),
            });
            if (result.statusCode !== 200) {
                throw new Error("Unexpected problem communicating with Solr.");
            }
            const children = result?.body?.response ?? { numFound: 0, start: 0, docs: [] };
            numFound = children.numFound ?? 0;
            for (const doc of children.docs ?? []) {
                queue.performIndexOperation(doc.id, "index");
            }
            offset += pageSize;
        } while (numFound > offset);

        // Return a success response (to conform with other index operations):
        return { statusCode: 200 };
    }

    protected reindexChildrenRequired(
        existingSolrDocument: Record<string, unknown>,
        newResults: Record<string, unknown>,
    ): boolean {
        const oldTitle: string = (existingSolrDocument?.title ?? "") as string;
        const newTitle: string = (newResults?.title ?? "") as string;
        const oldHierarchyTitle: string = (existingSolrDocument?.hierarchy_top_title ?? "") as string;
        const newHierarchyTitle: string = (newResults?.hierarchy_top_title ?? "") as string;
        const oldParents: Array<string> = (existingSolrDocument?.hierarchy_all_parents_str_mv ?? []) as Array<string>;
        const newParents: Array<string> = (newResults?.hierarchy_all_parents_str_mv ?? []) as Array<string>;

        // If we have no old title or parents, this is almost certainly the first time this record
        // has been indexed, so the following comparisons are not meaningful. We'll assume that there
        // is no point in modifying children at this stage.
        if (oldTitle.length === 0 && oldParents.length === 0) {
            return false;
        }

        // We need to reindex children if our title has changed, or if our parents have changed:
        if (
            oldTitle !== newTitle ||
            oldHierarchyTitle !== newHierarchyTitle ||
            oldParents.length !== newParents.length
        ) {
            return true;
        }
        const intersection = oldParents.filter((x) => newParents.includes(x));
        return intersection.length !== oldParents.length;
    }

    async run(job: Job): Promise<void> {
        if (typeof job?.data?.pid === "undefined") {
            throw new Error("No pid provided!");
        }

        const config = Config.getInstance();

        // We don't want a race condition where two workers are indexing the same
        // job at the same time, and an earlier version of the data gets written after
        // a later version. If multiple jobs are working on the same pid at once, we
        // need to wait so that the work gets done in the proper order.
        await this.waitForEarlierIndexersToComplete(job, config.indexerLockRetries, config.indexerLockWaitMs);

        console.log("Indexing...", job?.data);
        const indexer = SolrIndexer.getInstance();

        // Unlock the PID if it is locked so subsequent jobs can be queued:
        const cache = SolrCache.getInstance();
        let existingSolrDocument = null;

        let indexOperation = null;
        switch (job.data.action) {
            case "delete":
                indexOperation = async () => await indexer.deletePid(job.data.pid);
                break;
            case "index":
                existingSolrDocument = await this.getExistingSolrDocument(job.data.pid);
                indexOperation = async () => await indexer.indexPid(job.data.pid);
                break;
            case "reindex_children":
                indexOperation = async () => await this.reindexChildren(job.data.pid);
                break;
            default:
                throw new Error("Unexpected index action: " + job.data.action);
        }

        // Unlock the PID before we start work, so if changes occur while we are
        // working, they get queued up appropriately.
        cache.unlockPidIfEnabled(job.data.pid, job.data.action);

        // Attempt to index inside a retry loop, so if various problems occur, we
        // have a chance of automatically recovering and proceeding with the indexing.
        const maxAttempts = config.indexerExceptionRetries;
        let attempt = 0;
        while (attempt++ < maxAttempts) {
            try {
                const result = await indexOperation();
                // Special case: if we have no parents, we should double check that nothing
                // has gone wrong. If an object is in the process of being created, we might
                // index it before its parents have been attached; if that happens, we should
                // wait and try again so as not to cause confusion in the index.
                if (
                    job.data.action === "index" &&
                    (indexer.getLastIndexResults()?.fedora_parent_id_str_mv ?? []).length < 1 &&
                    !config.topLevelPids.includes(job.data.pid)
                ) {
                    throw new Error(`${job.data.pid} has no parents and is not a configured top-level pid`);
                }
                if (result.statusCode !== 200) {
                    const msg =
                        `Problem performing ${job.data.action} on ${job.data.pid}: ` +
                        (((result.body ?? {}).error ?? {}).msg ?? "unspecified error");
                    throw new Error(msg);
                }
                // If we got this far and were working on an index operation, let's see if any
                // details changed that might require us to reindex our children.
                if (
                    job.data.action === "index" &&
                    this.reindexChildrenRequired(existingSolrDocument, indexer.getLastIndexResults())
                ) {
                    await QueueManager.getInstance().performIndexOperation(job.data.pid, "reindex_children");
                }
                return;
            } catch (e) {
                // Always log the error
                console.error(e);
                // If we're not on our last attempt, retry; otherwise, rethrow
                if (attempt < maxAttempts) {
                    console.error("Retrying...");
                    await this.sleep(config.indexerExceptionWaitMs);
                } else {
                    throw e;
                }
            }
        }
    }
}

export default Index;
