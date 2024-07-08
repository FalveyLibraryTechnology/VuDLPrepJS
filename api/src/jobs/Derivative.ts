import { Job } from "bullmq";
import fs = require("fs");

import ImageFile from "../models/ImageFile";
import JobMetadata from "../models/JobMetadata";
import PageOrder from "../models/PageOrder";
import QueueJob from "./QueueJobInterface";

// TODO: Abstract Job?
class Derivative implements QueueJob {
    async run(job: Job): Promise<void> {
        console.log(": build derivatives: " + job.data.dir);

        // For each page
        const order = PageOrder.fromJob(job.data);
        const generatingPromises = [];
        order.raw.forEach((page) => {
            // For each size
            const image = ImageFile.build(`${job.data.dir}/${page.filename}`);
            for (const size in image.sizes) {
                // Check and generate
                const p = image.derivative(size);
                generatingPromises.push(p);
            }
        });

        // Wait for all image generation
        await Promise.all(generatingPromises);

        // Delete lock file
        try {
            console.log(": build derivatives done");
            const metadata = new JobMetadata(job.data);
            fs.rmSync(metadata.derivativeLockfile);
        } catch (e) {
            console.error("lock file not deleted: " + job.data.dir);
        }
    }
}

export default Derivative;
