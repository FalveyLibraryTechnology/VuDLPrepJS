import { Job as QueueJob } from "bullmq";
import fs = require("fs");
import Config from "../models/Config";
import { FedoraObject } from "../models/FedoraObject";
import { execSync } from "child_process";
import FedoraObjectFactory from "../services/FedoraObjectFactory";
import http = require("needle");
import PDFDocument = require("pdfkit");
import QueueJobInterface from "./QueueJobInterface";
import tmp = require("tmp");

class PdfGenerator {
    protected pid: string;
    protected config: Config;
    protected objectFactory: FedoraObjectFactory;

    constructor(pid: string, config: Config, objectFactory: FedoraObjectFactory) {
        this.pid = pid;
        this.config = config;
        this.objectFactory = objectFactory;
    }

    public static build(pid: string): PdfGenerator {
        return new PdfGenerator(pid, Config.getInstance(), FedoraObjectFactory.getInstance());
    }

    private hasPdfAlready(manifest): boolean {
        const rendering = (((manifest ?? {}).sequences ?? [])[0] ?? {}).rendering ?? [];
        if (rendering.length === 0) {
            return false;
        }
        const renderingFormats = rendering.map((current) => {
            return current.format ?? "";
        });
        return renderingFormats.includes("application/pdf");
    }

    private getLargeJpegs(manifest): string[] {
        const canvases = (((manifest ?? {}).sequences ?? [])[0] ?? {}).canvases ?? [];
        return canvases.map((current) => {
            return current.images[0].resource["@id"];
        });
    }

    private async generatePdf(jpegs: string[]): Promise<string> {
        const tmpobj = tmp.fileSync();
        const pdf = tmpobj.name;
        const pdfObj = new PDFDocument({ autoFirstPage: false });
        const stream = fs.createWriteStream(pdf);
        pdfObj.pipe(stream);
        for (const jpeg of jpegs) {
            const pageTmp = tmp.fileSync();
            const pageFile = pageTmp.name;
            const response = await http("get", jpeg);
            if (response.statusCode !== 200) {
                const msg = "Unexpected status code (" + response.statusCode + ") for " + jpeg;
                console.error(msg);
                throw new Error(msg);
            }
            fs.writeFileSync(pageFile, response.body);
            const img = pdfObj.openImage(pageFile);
            pdfObj.addPage({ size: [img.width, img.height] }).image(img, 0, 0);
            fs.truncateSync(pageFile, 0);
            fs.rmSync(pageFile);
        }
        pdfObj.end();
        // Wait for the PDF to finish generating (i.e. for the write stream to be closed):
        await new Promise<void>((resolve) => {
            stream.on("finish", function () {
                resolve();
            });
        });

        // Now apply OCR:
        const ocrmypdf = this.config.ocrmypdfPath;
        if (ocrmypdf) {
            const ocrmypdfCommand = ocrmypdf + " " + pdf + " " + pdf;
            execSync(ocrmypdfCommand);
        }

        return pdf;
    }

    private async addPdfToPid(pdf: string): Promise<void> {
        const documentList = await this.objectFactory.build("ListCollection", "Document List", "Active", this.pid);
        const pdfObject = await this.buildDocument(documentList, 1);
        await this.addDatastreamsToDocument(pdf, pdfObject);
    }

    private async buildDocument(documentList: FedoraObject, number: number): Promise<FedoraObject> {
        const documentData = await this.objectFactory.build("PDFData", "PDF", "Active", documentList.pid);
        await documentData.addSequenceRelationship(documentList.pid, number);
        return documentData;
    }

    private async addDatastreamsToDocument(pdf: string, documentData: FedoraObject): Promise<void> {
        await documentData.addDatastreamFromFile(pdf, "MASTER", "application/pdf");
    }

    async run(): Promise<void> {
        const manifestUrl = this.config.vufindUrl + "/Item/" + this.pid + "/Manifest";
        const response = await http("get", manifestUrl);
        if (response.statusCode !== 200) {
            const msg = "Unexpected " + response.statusCode + " status for " + manifestUrl;
            console.error(msg);
            throw new Error(msg);
        }
        const manifest = response.body;
        if (this.hasPdfAlready(manifest)) {
            console.log(this.pid + " already has a PDF; exiting early.");
            return;
        }
        const largeJpegs = this.getLargeJpegs(manifest);
        const pdf = await this.generatePdf(largeJpegs);
        await this.addPdfToPid(pdf);
        fs.truncateSync(pdf, 0);
        fs.rmSync(pdf);
    }
}

class GeneratePdf implements QueueJobInterface {
    async run(job: QueueJob): Promise<void> {
        const handler = PdfGenerator.build(job.data.pid);
        await handler.run();
    }
}

export default GeneratePdf;
