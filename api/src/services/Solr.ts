import http = require("needle");
import { NeedleResponse } from "./interfaces";
import Config from "../models/Config";
import SolrCache from "./SolrCache";
import { readFileSync } from "fs";

class Solr {
    private static instance: Solr;
    cache: SolrCache;
    baseUrl: string;

    constructor(baseUrl: string, cache: SolrCache) {
        this.baseUrl = baseUrl;
        this.cache = cache;
    }

    public static getInstance(): Solr {
        if (!Solr.instance) {
            Solr.instance = new Solr(Config.getInstance().solrUrl, SolrCache.getInstance());
        }
        return Solr.instance;
    }

    /**
     * Make request to Solr
     */
    protected _request(
        method = "get",
        _path = "/",
        data: string = null,
        options: Record<string, unknown> = {},
        log = false,
    ): Promise<NeedleResponse> {
        const path = _path[0] == "/" ? _path.slice(1) : _path;
        const url = this.baseUrl + "/" + path;
        if (log) {
            console.log(method, url, data);
        }
        return http(method, url, data, options);
    }

    public async query(
        core: string,
        solrQuery: string,
        queryParams: Record<string, string> = {},
        log = false,
    ): Promise<NeedleResponse> {
        const formatter = ([key, val]) => {
            return "&" + encodeURIComponent(key) + "=" + encodeURIComponent(val);
        };
        const extras = Object.entries(queryParams).map(formatter).join("");
        return this._request("get", core + "/select?q=" + encodeURIComponent(solrQuery) + extras, null, {}, log);
    }

    public async deleteRecord(core: string, pid: string): Promise<NeedleResponse> {
        // Strip double quotes from PID -- they should never be present, and it protects
        // against malicious query manipulation.
        const data = JSON.stringify({ delete: { query: 'id:"' + pid.replace(/["]/g, "") + '"' } });
        this.cache.purgeFromCacheIfEnabled(pid);
        return this.updateSolr(core, data);
    }

    public async indexRecord(core: string, _data: Record<string, unknown>): Promise<NeedleResponse> {
        const data = JSON.stringify({ add: { doc: _data } });
        this.cache.writeToCacheIfEnabled(_data.id as string, data);
        return this.updateSolr(core, data);
    }

    public async reindexFromFile(core: string, filename): Promise<NeedleResponse> {
        const data = readFileSync(filename).toString();
        return this.updateSolr(core, data);
    }

    protected async updateSolr(core: string, data: string): Promise<NeedleResponse> {
        const headers = {
            headers: { "Content-Type": "application/json" },
        };
        return this._request("post", core + "/update?commit=true", data, headers);
    }
}

export default Solr;
