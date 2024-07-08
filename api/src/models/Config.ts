import fs = require("fs");
import ini = require("ini");
import { FedoraModel, License } from "../services/FedoraCatalog";

type ConfigValue = string | string[] | ConfigRecord;
interface ConfigRecord {
    [key: string]: ConfigValue;
}

class Config {
    private static instance: Config;

    protected ini;

    constructor(ini: ConfigRecord) {
        this.ini = ini;
    }

    public static getInstance(): Config {
        if (!Config.instance) {
            const filename = __dirname.replace(/\\/g, "/") + "/../../vudl.ini";
            let config;
            try {
                config = ini.parse(fs.readFileSync(filename, "utf-8"));
            } catch (e) {
                console.warn(`Could not load ${filename}; defaulting to empty configuration.`);
                config = {};
            }
            // ini returns any, but we can cast it to what we need:
            Config.setInstance(new Config(config as Record<string, string>));
        }
        return Config.instance;
    }

    public static setInstance(config: Config): void {
        Config.instance = config;
    }

    get backendUrl(): string {
        return this.ini["backend_url"] ?? "http://localhost:9000";
    }

    get clientUrl(): string {
        return this.ini["client_url"];
    }

    get fedoraUsername(): string {
        return this.ini["fedora_username"];
    }

    get fedoraPassword(): string {
        return this.ini["fedora_password"];
    }

    get fedoraPidNameSpace(): string {
        return this.ini["fedora_pid_namespace"];
    }

    get ffmpegPath(): string {
        return this.ini["ffmpeg_path"];
    }

    get fitsCommand(): string {
        return this.ini["fits_command"];
    }

    get sessionKey(): string {
        return this.ini["session_key"] ?? "vanilla hot cocoa";
    }

    get tesseractPath(): string {
        return this.ini["tesseract_path"];
    }

    get tesseractAllowedChars(): string {
        return this.ini["tesseract_allowed_characters"];
    }

    get vufindUrl(): string {
        return this.ini["vufind_url"] ?? "";
    }

    get pdfDirectory(): string {
        return this.ini["pdf_directory"];
    }

    get textcleanerPath(): string {
        return this.ini["textcleaner_path"];
    }

    get textcleanerSwitches(): string {
        return this.ini["textcleaner_switches"];
    }

    get holdingArea(): string {
        const holdingArea = this.ini["holding_area_path"];
        return holdingArea.endsWith("/") ? holdingArea : holdingArea + "/";
    }

    get ocrmypdfPath(): string {
        return this.ini["ocrmypdf_path"];
    }

    get processedAreaPath(): string {
        return this.ini["processed_area_path"];
    }

    get restBaseUrl(): string {
        return this.ini["base_url"];
    }

    get javaPath(): string {
        return this.ini["java_path"] ?? "java";
    }

    get tikaConfigFile(): string {
        return this.ini["tika_config_file"] ?? null;
    }

    get tikaPath(): string {
        return this.ini["tika_path"];
    }

    get solrCore(): string {
        return this.ini["solr_core"] ?? "biblio";
    }

    get solrUrl(): string {
        return this.ini["solr_url"] ?? "http://localhost:8983/solr";
    }

    get solrDocumentCacheDir(): boolean | string {
        return this.ini["solr_document_cache_dir"] ?? false;
    }

    get allowedOrigins(): string[] {
        return this.ini["allowed_origins"] ?? [];
    }

    get pidNamespace(): string {
        return this.ini["fedora_pid_namespace"] ?? "vudl";
    }

    get initialPidValue(): number {
        return parseInt(this.ini["fedora_initial_pid"] ?? "1");
    }

    get dataModels(): Record<string, string> {
        return this.ini["data_models"];
    }

    get collectionModels(): Record<string, string> {
        return this.ini["collection_models"];
    }

    get institution(): string {
        return this.ini["institution"] ?? "My University";
    }

    get collection(): string {
        return this.ini["collection"] ?? "Digital Library";
    }

    get topLevelPids(): Array<string> {
        return this.ini["top_level_pids"] ?? [];
    }

    get articlesToStrip(): Array<string> {
        return this.ini["articles_to_strip"] ?? [];
    }

    get favoritePids(): Array<string> {
        return this.ini["favorite_pids"] ?? [];
    }

    get languageMap(): Record<string, string> {
        return this.ini["LanguageMap"] ?? {};
    }

    get minimumValidYear(): number {
        return parseInt(this.ini["minimum_valid_year"] ?? 1000);
    }

    get models(): Record<string, FedoraModel> {
        return this.ini["models"] || {};
    }

    get databaseSettings(): ConfigRecord {
        return this.ini["Database"] ?? {};
    }

    get databaseClient(): string {
        return (this.databaseSettings["client"] as string) ?? "sqlite3";
    }

    get databaseConnectionSettings(): ConfigRecord {
        return (this.databaseSettings["connection"] as ConfigRecord) ?? { filename: "./data/auth.sqlite3" };
    }

    get authenticationSettings(): ConfigRecord {
        return this.ini["Authentication"] ?? [];
    }

    get authenticationStrategy(): string {
        return (this.authenticationSettings["strategy"] as string) ?? "local";
    }

    get authenticationHashAlgorithm(): string {
        return (this.authenticationSettings["hash_algorithm"] as string) ?? "sha1";
    }

    get authenticationLegalUsernames(): Array<string> {
        return (this.authenticationSettings["legal_usernames"] as Array<string>) ?? [];
    }

    get authenticationRequirePasswords(): boolean {
        if (typeof this.authenticationSettings["require_passwords"] === "boolean") {
            return this.authenticationSettings["require_passwords"];
        }
        const stringValue = (this.authenticationSettings["require_passwords"] as string) ?? "true";
        return stringValue.trim().toLowerCase() !== "false";
    }

    get authenticationSalt(): string {
        return (this.authenticationSettings["salt"] as string) ?? "VuDLSaltValue";
    }

    get databaseInitialUsers(): Record<string, string> {
        return (this.authenticationSettings["initial_users"] ?? []) as Record<string, string>;
    }

    get samlCertificate(): string {
        return (this.authenticationSettings["saml_certificate"] as string) ?? "";
    }

    get samlEntryPoint(): string {
        return (this.authenticationSettings["saml_entry_point"] as string) ?? "";
    }

    get licenses(): Record<string, License> {
        return this.ini["licenses"] ?? {};
    }

    get agentDefaults(): Record<string, string> {
        return this.ini?.["agent"]?.["defaults"] ?? {};
    }

    get agentRoles(): Array<string> {
        return this.ini?.["agent"]?.["roles"] ?? [];
    }

    get agentTypes(): Array<string> {
        return this.ini?.["agent"]?.["types"] ?? [];
    }

    get dublinCoreFields(): Record<string, Record<string, string | Array<string>>> {
        return this.ini?.["dublin_core"] ?? {};
    }

    get redisConnectionSettings(): Record<string, string> {
        return this.ini?.["queue"]?.["connection"] ?? {};
    }

    get redisDefaultQueueName(): string {
        return this.ini?.["queue"]?.["defaultQueueName"] ?? "vudl";
    }

    get redisQueueJobMap(): Record<string, string> {
        return this.ini?.["queue"]?.["jobMap"] ?? {};
    }

    get redisLockDuration(): number {
        return parseInt(this.ini?.["queue"]?.["lockDuration"] ?? "30000");
    }

    get processMetadataDefaults(): Record<string, string> {
        return this.ini?.["process_metadata_defaults"] ?? {};
    }

    get toolPresets(): Array<Record<string, string>> {
        return this.ini?.["tool_presets"] ?? [];
    }

    get sharpOptions(): Record<string, unknown> {
        const pixelLimit = this.ini?.["sharp"]?.["limitInputPixels"] ?? "268402689";
        return {
            limitInputPixels: parseInt(pixelLimit),
        };
    }

    get max409Retries(): number {
        return this.ini["max_409_retries"] ?? 3;
    }

    get maxUploadSize(): number {
        return this.ini?.["upload"]?.["sizeLimit"] ?? 200 * 1024 * 1024;
    }

    get notifyMethod(): string {
        return this.ini?.["notify"]?.["method"] ?? "ntfy";
    }

    get ntfyConfig(): Record<string, string> {
        return {
            defaultChannel: this.ini?.["notify"]?.["ntfy_defaultChannel"] ?? "vudl-ntfy",
        };
    }

    get indexerLockRetries(): number {
        return parseInt(this.ini?.["indexer"]?.["lockRetries"] ?? 60);
    }

    get indexerLockWaitMs(): number {
        return parseInt(this.ini?.["indexer"]?.["lockWaitMs"] ?? 1000);
    }

    get indexerExceptionRetries(): number {
        return parseInt(this.ini?.["indexer"]?.["exceptionRetries"] ?? 10);
    }

    get indexerExceptionWaitMs(): number {
        return parseInt(this.ini?.["indexer"]?.["exceptionWaitMs"] ?? 500);
    }
}

export default Config;
