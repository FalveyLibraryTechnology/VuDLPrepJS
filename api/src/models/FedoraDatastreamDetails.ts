import Fedora from "../services/Fedora";
import FedoraDataCollection from "./FedoraDataCollection";
import MetadataExtractor from "../services/MetadataExtractor";
import TikaExtractor from "../services/TikaExtractor";

interface LicenseData {
    url: string[];
}

class FedoraDatastreamDetails {
    protected data: FedoraDataCollection;
    protected fedora: Fedora;
    protected extractor: MetadataExtractor;
    protected tika: TikaExtractor;
    protected license: LicenseData;
    protected agents: Record<string, Array<string>>;
    protected thumbnails: Record<string, Array<string>>;
    protected fitsData: Record<string, Array<string>>;
    protected fullText: Record<string, Array<string>>;

    constructor(data: FedoraDataCollection, fedora: Fedora, extractor: MetadataExtractor, tika: TikaExtractor) {
        this.data = data;
        this.fedora = fedora;
        this.extractor = extractor;
        this.tika = tika;
    }

    async getLicense(): Promise<LicenseData> {
        if (typeof this.license === "undefined") {
            if (this.data.fedoraDatastreams.includes("LICENSE")) {
                const licenseStream = await this.fedora.getDatastreamAsString(this.data.pid, "LICENSE");
                this.license = { url: [this.extractor.extractLicense(licenseStream)] };
            } else {
                this.license = { url: [] };
            }
        }
        return this.license;
    }

    async getAgents(): Promise<Record<string, Array<string>>> {
        if (typeof this.agents === "undefined") {
            if (this.data.fedoraDatastreams.includes("AGENTS")) {
                const agentsStream = await this.fedora.getDatastreamAsString(this.data.pid, "AGENTS");
                this.agents = this.extractor.extractAgents(agentsStream);
            } else {
                this.agents = {};
            }
        }
        return this.agents;
    }

    async getThumbnails(): Promise<Record<string, Array<string>>> {
        if (typeof this.thumbnails === "undefined") {
            if (this.data.fedoraDatastreams.includes("THUMBNAIL")) {
                const thumbRdf = await this.fedora.getRdf(this.data.pid + "/THUMBNAIL/fcr:metadata");
                this.thumbnails = this.extractor.extractThumbnailDetails(thumbRdf);
            } else {
                this.thumbnails = {};
            }
        }
        return this.thumbnails;
    }

    async getFitsData(): Promise<Record<string, Array<string>>> {
        if (typeof this.fitsData === "undefined") {
            if (this.data.fedoraDatastreams.includes("MASTER-MD")) {
                const fitsXml = await this.fedora.getDatastreamAsString(this.data.pid, "MASTER-MD");
                this.fitsData = this.extractor.extractFitsData(fitsXml);
            } else {
                this.fitsData = {};
            }
        }
        return this.fitsData;
    }

    async getFullText(): Promise<Record<string, Array<string>>> {
        if (typeof this.fullText === "undefined") {
            this.fullText = {};
            if (this.data.fedoraDatastreams.includes("OCR-DIRTY")) {
                this.fullText.ocrDirty = [await this.fedora.getDatastreamAsString(this.data.pid, "OCR-DIRTY")];
            }
            if (this.data.fedoraDatastreams.includes("TEXT-TRANSCRIPT")) {
                this.fullText.transcript = [await this.fedora.getDatastreamAsString(this.data.pid, "TEXT-TRANSCRIPT")];
            } else if (this.data.fedoraDatastreams.includes("VTT")) {
                this.fullText.transcript = [await this.fedora.getDatastreamAsString(this.data.pid, "VTT")];
            }
            if (this.data.models.includes("vudl-system:DOCData") || this.data.models.includes("vudl-system:PDFData")) {
                const file = (await this.fedora.getDatastream(this.data.pid, "MASTER")).body;
                this.fullText.fromDocument = [this.tika.extractText(file)];
            }
        }
        return this.fullText;
    }
}

export default FedoraDatastreamDetails;
