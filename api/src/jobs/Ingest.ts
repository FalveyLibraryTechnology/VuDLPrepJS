import { Job as QueueJob } from "bullmq";
import fs = require("fs");
import path = require("path");
import AudioFile from "../models/AudioFile";
import Category from "../models/Category";
import Config from "../models/Config";
import { DatastreamParameters } from "../services/Fedora";
import { FedoraObject } from "../models/FedoraObject";
import DocumentFile from "../models/DocumentFile";
import FedoraObjectFactory from "../services/FedoraObjectFactory";
import ImageFile from "../models/ImageFile";
import Job from "../models/Job";
import Page from "../models/Page";
import QueueJobInterface from "./QueueJobInterface";
import VideoFile from "../models/VideoFile";
import winston = require("winston");
import xmlescape = require("xml-escape");

export class IngestProcessor {
    protected job: Job;
    protected category: Category;
    protected logger: winston.Logger;
    protected config: Config;
    protected objectFactory: FedoraObjectFactory;

    constructor(dir: string, config: Config, objectFactory: FedoraObjectFactory, logger: winston.Logger) {
        this.config = config;
        this.objectFactory = objectFactory;
        this.job = Job.build(dir);
        this.category = new Category(path.dirname(dir));
        this.logger = logger;
    }

    public static build(dir: string): IngestProcessor {
        const logger = winston.createLogger({
            level: "info",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
            ),
            transports: [
                new winston.transports.File({ filename: dir + "/ingest.log" }),
                new winston.transports.Console(),
            ],
        });
        return new IngestProcessor(dir, Config.getInstance(), FedoraObjectFactory.getInstance(), logger);
    }

    async addDatastreamsToPage(page: Page, imageData: FedoraObject): Promise<void> {
        const image = ImageFile.build(this.job.dir + "/" + page.filename);
        await imageData.addDatastreamFromFile(image.filename, "MASTER", "image/tiff");
        for (const size in image.sizes) {
            await imageData.addDatastreamFromFile(await image.derivative(size), size, "image/jpeg");
        }
        if (this.category.supportsOcr) {
            await imageData.addDatastreamFromFile(await image.ocr(), "OCR-DIRTY", "text/plain");
        }
    }

    async addDatastreamsToDocument(document: DocumentFile, documentData: FedoraObject): Promise<void> {
        const pdf = this.job.dir + "/" + document.filename;
        await documentData.addDatastreamFromFile(pdf, "MASTER", "application/pdf");
    }

    async addDatastreamsToAudio(audio: AudioFile, audioData: FedoraObject): Promise<void> {
        this.logger.info("Adding Flac");
        const flac = this.job.dir + "/" + audio.filename;
        await audioData.addDatastreamFromFile(flac, "MASTER", "audio/x-flac");
        this.logger.info("Adding MP3");
        await audioData.addDatastreamFromFile(audio.derivative("MP3"), "MP3", "audio/mpeg");
        this.logger.info("Adding OGG");
        await audioData.addDatastreamFromFile(audio.derivative("OGG"), "OGG", "audio/ogg");
    }

    async addDatastreamsToVideo(video: VideoFile, videoData: FedoraObject): Promise<void> {
        this.logger.info("Adding Primary Video");
        const primaryVideo = this.job.dir + "/" + video.filename;
        await videoData.addDatastreamFromFile(primaryVideo, "MASTER", video.mimeType);
        // If the MASTER is already MP4, we don't need to add a separate MP4 stream.
        if (video.mimeType !== "video/mp4") {
            this.logger.info("Adding MP4");
            await videoData.addDatastreamFromFile(video.derivative("MP4"), "MP4", "video/mp4");
        }
        // If we have VTT transcript and/or TXT transcript, add them.
        const textTranscript = video.textTranscript;
        if (textTranscript !== null) {
            this.logger.info("Adding text transcript");
            await videoData.addDatastreamFromFile(textTranscript, "TEXT-TRANSCRIPT", "text/plain");
        }
        const vtt = video.vtt;
        if (vtt !== null) {
            this.logger.info("Adding VTT transcript");
            await videoData.addDatastreamFromFile(vtt, "VTT", "text/vtt");
        }
    }

    async addPages(pageList: FedoraObject): Promise<void> {
        const order = this.job.metadata.order.pages;
        for (const i in order) {
            const page = order[i];
            const number = parseInt(i) + 1;
            this.logger.info("Adding " + number + " of " + order.length + " - " + page.filename);
            const imageData = await this.buildPage(pageList, page, number);
            await this.addDatastreamsToPage(page, imageData);
        }
    }

    async addDocuments(documentList: FedoraObject): Promise<void> {
        let order = this.job.metadata.documents.list;
        if (order.length == 0 && this.category.supportsPdfGeneration) {
            if (this.job.metadata.order.pages.length < 1) {
                this.logger.info("Skipping PDF generation; no pages found.");
            } else {
                this.logger.info("Generating PDF");
                const pdf = await this.job.generatePdf();
                order = [new DocumentFile(path.basename(pdf), "PDF")];
            }
        }
        for (const i in order) {
            const document = order[i];
            const number = parseInt(i) + 1;
            this.logger.info("Adding " + number + " of " + order.length + " - " + document.filename);
            const data = await this.buildDocument(documentList, document, number);
            await this.addDatastreamsToDocument(document, data);
        }
    }

    async addAudio(audioList: FedoraObject): Promise<void> {
        const order = this.job.metadata.audio.list;
        for (const i in order) {
            const audio = order[i];
            const number = parseInt(i) + 1;
            this.logger.info("Adding " + number + " of " + order.length + " - " + audio.filename);
            const audioData = await this.buildAudio(audioList, audio, number);
            await this.addDatastreamsToAudio(audio, audioData);
        }
    }

    async addVideo(videoList: FedoraObject): Promise<void> {
        const order = this.job.metadata.video.list;
        for (const i in order) {
            const video = order[i];
            const number = parseInt(i) + 1;
            this.logger.info("Adding " + number + " of " + order.length + " - " + video.filename);
            const videoData = await this.buildVideo(videoList, video, number);
            await this.addDatastreamsToVideo(video, videoData);
        }
    }

    async buildPage(pageList: FedoraObject, page: Page, number: number): Promise<FedoraObject> {
        const imageData = await this.objectFactory.build(
            "ImageData",
            String(page.label),
            "Inactive",
            pageList.pid,
            this.logger,
        );
        await imageData.addSequenceRelationship(pageList.pid, number);
        return imageData;
    }

    async buildDocument(documentList: FedoraObject, document: DocumentFile, number: number): Promise<FedoraObject> {
        const documentData = await this.objectFactory.build(
            "PDFData",
            String(document.label),
            "Inactive",
            documentList.pid,
            this.logger,
        );
        await documentData.addSequenceRelationship(documentList.pid, number);
        return documentData;
    }

    async buildAudio(audioList: FedoraObject, audio: AudioFile, number: number): Promise<FedoraObject> {
        const audioData = await this.objectFactory.build(
            "AudioData",
            String(audio.filename),
            "Inactive",
            audioList.pid,
            this.logger,
        );
        await audioData.addSequenceRelationship(audioList.pid, number);
        return audioData;
    }

    async buildVideo(videoList: FedoraObject, video: VideoFile, number: number): Promise<FedoraObject> {
        const videoData = await this.objectFactory.build(
            "VideoData",
            String(video.filename),
            "Inactive",
            videoList.pid,
            this.logger,
        );
        await videoData.addSequenceRelationship(videoList.pid, number);
        return videoData;
    }

    async buildListCollection(resource: FedoraObject, title: string): Promise<FedoraObject> {
        return this.objectFactory.build("ListCollection", title, "Inactive", resource.pid, this.logger);
    }

    async buildResource(holdingArea: FedoraObject): Promise<FedoraObject> {
        const resource = await this.objectFactory.build(
            "ResourceCollection",
            "Incomplete... / Processing...",
            "Inactive",
            holdingArea.pid,
            this.logger,
        );
        // Attach thumbnail to resource:
        if (this.job.metadata.order.pages.length > 0) {
            const page = this.job.metadata.order.pages[0];
            const image = ImageFile.build(this.job.dir + "/" + page.filename);
            await resource.addDatastreamFromFile(await image.derivative("THUMBNAIL"), "THUMBNAIL", "image/jpeg");
        }
        return resource;
    }

    async finalizeTitle(resource: FedoraObject): Promise<void> {
        const title = this.job.dir.substring(1).split("/").reverse().join("_");
        this.logger.info("Updating title to " + title);
        await resource.modifyObjectLabel(title);

        const dc = await resource.getDatastream("DC");
        const escapedTitle = xmlescape(title);
        const newDublinCore = dc.replace(/Incomplete... \/ Processing.../, escapedTitle);
        if (newDublinCore.indexOf(escapedTitle) < 0) {
            throw new Error("Problem updating Dublin Core title!");
        }
        await this.replaceDCMetadata(resource, newDublinCore, "Set dc:title to ingest/process path");
    }

    async replaceDCMetadata(resource: FedoraObject, dc: string, message: string): Promise<void> {
        const params: DatastreamParameters = {
            mimeType: "text/xml",
            logMessage: message,
        };
        await resource.modifyDatastream("DC", params, dc);
    }

    moveDirectory(): void {
        const basePath = this.config.processedAreaPath;
        const currentTime = new Date();
        const now = currentTime.toISOString().substring(0, 10);
        let target = basePath + "/" + now + "/" + this.category.name + "/" + this.job.name;
        if (fs.existsSync(target)) {
            let i = 2;
            while (fs.existsSync(target + "." + i)) {
                i++;
            }
            target = target + "." + i;
        }
        this.logger.info("Moving " + this.job.dir + " to " + target);
        const targetParent = path.dirname(target);
        if (!fs.existsSync(targetParent)) {
            fs.mkdirSync(targetParent, { recursive: true });
        }
        fs.renameSync(this.job.dir, target);
        fs.rmSync(target + "/ingest.lock");
    }

    async doIngest(): Promise<void> {
        const startTime = Date.now();
        this.logger.info("Beginning ingest.");
        this.logger.info("Target collection ID: " + this.category.targetCollectionId);
        const holdingArea = FedoraObject.build(this.category.targetCollectionId, this.logger);
        if ((await holdingArea.getSortOn()) == "custom") {
            // This was already a TODO in the Ruby code; low priority:
            throw new Error("TODO: implement custom sort support.");
        }

        const resource = await this.buildResource(holdingArea);

        // TODO: deal with ordered collection sequence numbers, if needed
        // (this was already a TODO in the Ruby code; low priority)

        if (this.job.metadata.order.pages.length > 0) {
            await this.addPages(await this.buildListCollection(resource, "Page List"));
        }

        if (this.job.metadata.documents.list.length > 0 || this.category.supportsPdfGeneration) {
            await this.addDocuments(await this.buildListCollection(resource, "Document List"));
        }

        if (this.job.metadata.audio.list.length > 0) {
            await this.addAudio(await this.buildListCollection(resource, "Audio List"));
        }

        if (this.job.metadata.video.list.length > 0) {
            await this.addVideo(await this.buildListCollection(resource, "Video List"));
        }

        await this.finalizeTitle(resource);
        if (this.job.metadata.dublinCore.length > 0) {
            this.replaceDCMetadata(resource, this.job.metadata.dublinCore, "Loading DC XML");
        }

        this.moveDirectory();

        const elapsed = (Date.now() - startTime) / 60000;
        this.logger.info("Done. Total time: " + elapsed + " minute(s).");
    }

    async run(): Promise<void> {
        try {
            await this.doIngest();
        } catch (e) {
            console.trace(e.message);
            this.logger.error("Unexpected problem: " + e.message);
            this.logger.close(); // Release file handle on log.
            // Rethrow error to fail job and display helpful details.
            throw new Error(`Exception during ingest -- ${e.stack}`);
        }
        this.logger.close(); // Release file handle on log.
    }
}

class Ingest implements QueueJobInterface {
    async run(job: QueueJob): Promise<void> {
        const handler = IngestProcessor.build(job.data.dir);
        await handler.run();
    }
}

export default Ingest;
