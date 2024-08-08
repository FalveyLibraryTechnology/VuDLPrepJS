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

const getObjectChildCountsUrl = (pid: string): string => {
    return getPidActionUrl(pid, "childCounts");
}

const getObjectChildrenUrl = (pid: string, start = 0, rows = 10): string => {
    const base = pid.length > 0 ? getPidActionUrl(pid, "children") : `${apiUrl}/edit/topLevelObjects`;
    return `${base}?start=${start}&rows=${rows}`;
}

const getObjectDirectChildPidsUrl = (pid: string, start = 0, rows = 10, sort: string|null = null): string => {
    const base = getPidActionUrl(pid, "directChildPids");
    return `${base}?start=${start}&rows=${rows}` + (sort ? `&sort=${encodeURIComponent(sort)}` : "");
}

const getObjectRecursiveChildPidsUrl = (pid: string, start = 0, rows = 10, sort: string|null = null): string => {
    const base = getPidActionUrl(pid, "recursiveChildPids");
    return `${base}?start=${start}&rows=${rows}` + (sort ? `&sort=${encodeURIComponent(sort)}` : "");
}

const getObjectDetailsUrl = (pid: string): string => {
    return getPidActionUrl(pid, "details");
}

const getObjectLastChildPositionUrl = (pid: string): string => {
    return getPidActionUrl(pid, "lastChildPosition");
}

const getObjectParentsUrl = (pid: string, shallow = false): string => {
    return getPidActionUrl(pid, "parents") + (shallow ? "?shallow=1" : "");
}

const getObjectSortOnUrl = (pid: string): string => {
    return getPidActionUrl(pid, "sortOn");
}

const getObjectStateUrl = (pid: string): string => {
    return getPidActionUrl(pid, "state");
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

const viewObjectDatastreamUrl = (pid: string, datastream: string) => {
    return getDatastreamActionUrl(pid, datastream, "view");
};

const getObjectDatastreamMimetypeUrl = (pid: string, datastream: string) => {
    return getDatastreamActionUrl(pid, datastream, "mimetype");
};

const getObjectDatastreamMetadataUrl = (pid: string, datastream: string) => {
    return getDatastreamActionUrl(pid, datastream, "metadata");
}

const getMoveToParentUrl = (pid: string, parentPid: string) => {
    return getPidActionUrl(pid, `moveToParent/${encodeURIComponent(parentPid)}`);
}

const getParentUrl = (pid: string, parentPid: string) => {
    return getPidActionUrl(pid, `parent/${encodeURIComponent(parentPid)}`);
}

const getPositionInParentUrl = (pid: string, parentPid: string) => {
    return getPidActionUrl(pid, `positionInParent/${encodeURIComponent(parentPid)}`);
}

const objectDatastreamLicenseUrl = (pid: string, datastream: string) => {
    return getDatastreamActionUrl(pid, datastream, "license");
};

const objectDatastreamAgentsUrl = (pid: string, datastream: string) => {
    return getDatastreamActionUrl(pid, datastream, "agents")
};

const objectDatastreamDublinCoreUrl = (pid: string, datastream: string) => {
    return getDatastreamActionUrl(pid, datastream, "dublinCore")
};

const objectDatastreamProcessMetadataUrl = (pid: string, datastream: string): string => {
    return getDatastreamActionUrl(pid, datastream, "processMetadata")
};

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
    getMoveToParentUrl,
    getObjectChildCountsUrl,
    getObjectChildrenUrl,
    getObjectDetailsUrl,
    getObjectLastChildPositionUrl,
    getObjectParentsUrl,
    getObjectDirectChildPidsUrl,
    getObjectRecursiveChildPidsUrl,
    getObjectSortOnUrl,
    getObjectStateUrl,
    getParentUrl,
    getPositionInParentUrl,
    postObjectDatastreamUrl,
    deleteObjectDatastreamUrl,
    downloadObjectDatastreamUrl,
    viewObjectDatastreamUrl,
    getObjectDatastreamMimetypeUrl,
    getObjectDatastreamMetadataUrl,
    objectDatastreamLicenseUrl,
    objectDatastreamAgentsUrl,
    objectDatastreamDublinCoreUrl,
    objectDatastreamProcessMetadataUrl,
};
