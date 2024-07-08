import express = require("express");
import CategoryCollection from "../models/CategoryCollection";
import Category from "../models/Category";
import Config from "../models/Config";
import Job from "../models/Job";
import { requireToken } from "./auth";
import { sanitizeParameters } from "./sanitize";
import fs = require("fs");

const ingest = express.Router();
function getJobFromRequest(req): Job {
    const jobDir = Config.getInstance().holdingArea + req.params.category + "/" + req.params.job;
    return fs.existsSync(jobDir) ? Job.build(jobDir) : null;
}

ingest.get("/", requireToken, function (req, res) {
    const categoryCollection = new CategoryCollection(Config.getInstance().holdingArea);
    res.json(categoryCollection.raw());
});

ingest.get("/:category", sanitizeParameters(), requireToken, function (req, res) {
    const categoryDir = Config.getInstance().holdingArea + req.params.category;
    if (!fs.existsSync(categoryDir)) {
        return res.status(404).json({ error: "Not Found" });
    }
    const category = new Category(categoryDir);
    res.json(category.raw());
});

ingest.get("/:category/:job", sanitizeParameters(), requireToken, function (req, res) {
    const job = getJobFromRequest(req);
    if (job == null) {
        return res.status(404).json({ error: "Job not found" });
    }
    res.json(job.metadata.raw);
});

ingest.get("/:category/:job/status", sanitizeParameters(), requireToken, function (req, res) {
    const job = getJobFromRequest(req);
    if (job == null) {
        return res.status(404).json({ error: "Job not found" });
    }
    res.json(job.metadata.status);
});

ingest.put("/:category/:job/derivatives", sanitizeParameters(), requireToken, async function (req, res) {
    const job = getJobFromRequest(req);
    if (job == null) {
        return res.status(404).json({ error: "Job not found" });
    }
    await job.makeDerivatives();
    res.json({ status: "ok" });
});

ingest.put("/:category/:job/ingest", sanitizeParameters(), requireToken, async function (req, res) {
    const job = getJobFromRequest(req);
    if (job == null) {
        return res.status(404).json({ error: "Job not found" });
    }
    await job.ingest();
    res.json({ status: "ok" });
});

ingest.put("/:category/:job", sanitizeParameters(), requireToken, function (req, res) {
    const job = getJobFromRequest(req);
    const raw = req.body;
    try {
        if (job == null) {
            return res.status(404).json({ error: "Job not found" });
        }
        job.metadata.raw = raw;
        const problems = job.metadata.status.file_problems as Record<string, Array<string>>;
        if (problems.added.length > 0 || problems.deleted.length > 0) {
            throw new Error("file problem found");
        }
        job.metadata.save();
        res.json({ status: "ok" });
    } catch (e) {
        res.status(500).json({ status: "error saving job" });
    }
});

ingest.get("/:category/:job/:image/:size", sanitizeParameters(), requireToken, async function (req, res) {
    const legalSizes: Record<string, string> = {
        thumb: "THUMBNAIL",
        medium: "MEDIUM",
        large: "LARGE",
    };
    const image: string = req.params.image;
    const size: string = req.params.size;
    const job = getJobFromRequest(req);
    if (job == null) {
        return res.status(404).json({ error: "Job not found" });
    }
    const deriv = await job.getImage(image).derivative(legalSizes[size] ?? "THUMBNAIL");
    res.sendFile(deriv);
});

ingest.delete(
    "/:category/:job/:image/*",
    ingest.delete(
        "/:category/:job/:image/*",
        sanitizeParameters({ 0: /^\*$/ }),
        requireToken,
        async function (req, res) {
            const image: string = req.params.image;
            const job = getJobFromRequest(req);
            if (job == null) {
                return res.status(404).json({ error: "Job not found" });
            }
            const imageObj = job.getImage(image);
            if (imageObj !== null) {
                imageObj.delete();
                res.json({ status: "ok" });
            } else {
                res.status(404).json({ status: "image missing" });
            }
        },
    ),
);

export default ingest;
