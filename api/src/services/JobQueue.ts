import { Job, Worker } from "bullmq";
import Derivative from "../jobs/Derivative";
import GeneratePdf from "../jobs/GeneratePdf";
import Index from "../jobs/Index";
import Ingest from "../jobs/Ingest";
import Metadata from "../jobs/Metadata";
import Notify from "../jobs/Notify";
import QueueJob from "../jobs/QueueJobInterface";
import QueueManager from "./QueueManager";
import Reindex from "../jobs/Reindex";

class JobQueue {
    workers: { [key: string]: QueueJob } = {};
    manager: Worker;
    queueManager: QueueManager;
    private static instance: JobQueue;

    constructor(queueManager: QueueManager) {
        this.queueManager = queueManager;
    }

    public static getInstance(): JobQueue {
        if (!JobQueue.instance) {
            JobQueue.instance = new JobQueue(QueueManager.getInstance());
        }
        return JobQueue.instance;
    }

    start(queueName: string = null): void {
        this.workers.derivatives = new Derivative();
        this.workers.generatepdf = new GeneratePdf();
        this.workers.index = new Index();
        this.workers.ingest = new Ingest();
        this.workers.metadata = new Metadata();
        this.workers.notify = new Notify();
        this.workers.reindex = new Reindex();
        this.manager = this.queueManager.getWorker(async (job) => {
            console.log("JOB: " + job.name);
            if (typeof this.workers[job.name] === "undefined") {
                console.error("Unidentified job from queue: " + job.name);
                return;
            }

            return await this.workers[job.name].run(job);
        }, queueName);
        this.manager.on("failed", (job: Job, error: Error) => {
            console.error("Job failed; reason: " + error.message);
        });

        console.log("JobQueue started");
    }
}

export default JobQueue;
