import { Queue, Job, Worker, WorkerOptions, Processor } from "bullmq";
import Config from "../models/Config";
import SolrCache from "./SolrCache";

class QueueManager {
    private static instance: QueueManager;
    protected config: Config;
    protected cache: SolrCache;

    constructor(config: Config, cache: SolrCache) {
        this.config = config;
        this.cache = cache;
    }

    public static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager(Config.getInstance(), SolrCache.getInstance());
        }
        return QueueManager.instance;
    }

    public static setInstance(manager: QueueManager): void {
        QueueManager.instance = manager;
    }

    protected get queueBaseOptions(): Record<string, Record<string, string>> {
        return {
            connection: this.config.redisConnectionSettings,
        };
    }

    protected getQueue(queueName: string = null): Queue {
        return new Queue(queueName ?? this.config.redisDefaultQueueName, this.queueBaseOptions);
    }

    public getWorker(callback: Processor, queueName: string = null): Worker {
        const options = this.queueBaseOptions as WorkerOptions;
        options.lockDuration = this.config.redisLockDuration;
        return new Worker(queueName ?? this.config.redisDefaultQueueName, callback, options);
    }

    protected getQueueNameForJob(jobName: string): string {
        return this.config.redisQueueJobMap[jobName] ?? this.config.redisDefaultQueueName;
    }

    protected async addToQueue(jobName: string, data: Record<string, string>): Promise<void> {
        const q = this.getQueue(this.getQueueNameForJob(jobName));
        await q.add(jobName, data);
        q.close();
    }

    public async buildDerivatives(dir: string): Promise<void> {
        return await this.addToQueue("derivatives", { dir });
    }

    public async generatePdf(pid: string): Promise<void> {
        return await this.addToQueue("generatepdf", { pid });
    }

    public async ingestJob(dir: string): Promise<void> {
        return await this.addToQueue("ingest", { dir });
    }

    public async sendNotification(body: string, channel: string | null = null): Promise<void> {
        return await this.addToQueue("notify", { body, channel });
    }

    public async performCacheReindexOperation(file: string): Promise<void> {
        return await this.addToQueue("reindex", { file });
    }

    public async hasPendingIndexJob(q, queueJob): Promise<boolean> {
        if (this.cache.isEnabled()) {
            return this.cache.isPidLocked(queueJob.pid, queueJob.action);
        }
        const jobs = await q.getJobs("wait");
        return this.isAlreadyAwaitingAction(jobs, "index", queueJob);
    }

    public async performIndexOperation(pid: string, action: string, force = false): Promise<void> {
        // Fedora often fires many change events about the same object in rapid succession;
        // we don't want to index more times than we have to, so let's not re-queue anything
        // that is already awaiting indexing.
        const q = this.getQueue(this.getQueueNameForJob("index"));
        const queueJob = { pid, action };
        if (!force && (await this.hasPendingIndexJob(q, queueJob))) {
            console.log(`Skipping queue; ${pid} is already awaiting ${action}.`);
        } else {
            // Clear the cache for the pid that needs to be reindexed; we don't want to read an
            // outdated version while updates are pending. Note that reindex_children is a
            // special case, since it does not directly modify the specified pid and should not
            // trigger a cache purge!
            if (action !== "reindex_children") {
                this.cache.purgeFromCacheIfEnabled(pid);
            }
            this.cache.lockPidIfEnabled(pid, action);
            await q.add("index", queueJob);
        }
        q.close();
    }

    protected isAlreadyAwaitingAction(
        jobs: Array<Job>,
        name: string,
        { pid, action }: { pid: string; action: string },
    ): boolean {
        const matchingJob = jobs.find((job) => {
            return job.name === name && job.data.pid === pid;
        });
        return matchingJob ? matchingJob?.data?.action === action : false;
    }

    public async getActiveIndexJobsForPid(pid: string): Promise<Array<Job>> {
        const q = this.getQueue(this.getQueueNameForJob("index"));
        const result = (await q.getJobs("active")).filter((job) => job.data.pid === pid);
        q.close();
        return result;
    }

    public async queueMetadataOperation(pid: string, action: string, force = false): Promise<void> {
        const q = this.getQueue(this.getQueueNameForJob("metadata"));
        const jobs = await q.getJobs("wait");
        const queueJob = { pid, action };
        if (!force && this.isAlreadyAwaitingAction(jobs, "metadata", queueJob)) {
            console.log(`Skipping queue; ${pid} is already awaiting ${action}.`);
        } else {
            await q.add("metadata", queueJob);
        }
        q.close();
    }
}

export default QueueManager;
