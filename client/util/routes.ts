import config from "./config";

const baseUrl = config.API_SERVER_BASE_URL;
const apiUrl = `${baseUrl}/api`;
const authApiUrl = `${apiUrl}/auth`;
const ingestApiUrl = `${apiUrl}/ingest`;
const loginUrl = `${authApiUrl}/login`;
const logoutUrl = `${authApiUrl}/logout`;
const editObjectUrl = `${apiUrl}/edit/object`;
const newEditObjectUrl = `${editObjectUrl}/new`;
const datastreamsUrl = `${editObjectUrl}/datastreams`;
const editObjectCatalogUrl = `${apiUrl}/edit/catalog`;

const getJobUrl = (category: string, job: string, extra = ""): string => {
    return `${ingestApiUrl}/${encodeURIComponent(category)}/${encodeURIComponent(job)}${extra}`;
};
const getImageUrl = (category: string, job: string, filename: string, size: string): string => {
    return getJobUrl(category, job, `/${encodeURIComponent(filename)}/${encodeURIComponent(size)}`);
};

const getDerivUrl = (category: string, children: string): string => {
    return getJobUrl(category, children, "/derivatives");
};

const getIngestUrl = (category: string, children: string): string => {
    return getJobUrl(category, children, "/ingest");
};

const getStatusUrl = (category: string, children: string): string => {
    return getJobUrl(category, children, "/status");
};

const getPidActionUrl = (pid: string, action: string): string => {
    return `${editObjectUrl}/${encodeURIComponent(pid)}/${action}`;
}

const getObjectChildrenUrl = (pid: string, start = 0, rows = 10): string => {
    const base = pid.length > 0 ? getPidActionUrl(pid, "children") : `${apiUrl}/edit/topLevelObjects`;
    return `${base}?start=${start}&rows=${rows}`;
}

const getObjectDetailsUrl = (pid: string): string => {
    return getPidActionUrl(pid, "details");
}

const getObjectModelsDatastreamsUrl = (pid: string): string => {
    return getPidActionUrl(pid, "modelsdatastreams");
}

const getObjectParentsUrl = (pid: string): string => {
    return getPidActionUrl(pid, "parents");
}

const getDatastreamActionUrl = (pid: string, datastream: string, action = ""): string => {
    return getPidActionUrl(pid, `datastream/${encodeURIComponent(datastream)}` + (action.length > 0 ? `/${action}` : ""));
}

const postObjectDatastreamUrl = (pid: string, datastream: string): string => {
    return getDatastreamActionUrl(pid, datastream);
}

const deleteObjectDatastreamUrl = (pid: string, datastream: string): string => {
    return getDatastreamActionUrl(pid, datastream);
}

const downloadObjectDatastreamUrl = (pid: string, datastream: string) => {
    return getDatastreamActionUrl(pid, datastream, "download");
}

const getObjectDatastreamMetadataUrl = (pid: string, datastream: string) => {
    return getDatastreamActionUrl(pid, datastream, "metadata");
}

export {
    baseUrl,
    apiUrl,
    authApiUrl,
    ingestApiUrl,
    loginUrl,
    logoutUrl,
    newEditObjectUrl,
    datastreamsUrl,
    editObjectCatalogUrl,
    getJobUrl,
    getImageUrl,
    getDerivUrl,
    getIngestUrl,
    getStatusUrl,
    getObjectChildrenUrl,
    getObjectDetailsUrl,
    getObjectModelsDatastreamsUrl,
    getObjectParentsUrl,
    postObjectDatastreamUrl,
    deleteObjectDatastreamUrl,
    downloadObjectDatastreamUrl,
    getObjectDatastreamMetadataUrl
};
