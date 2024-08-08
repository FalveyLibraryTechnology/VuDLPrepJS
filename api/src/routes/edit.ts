import express = require("express");
import bodyParser = require("body-parser");
import Config from "../models/Config";
import Fedora from "../services/Fedora";
import ContainmentValidator from "../services/ContainmentValidator";
import FedoraCatalog from "../services/FedoraCatalog";
import DatastreamManager from "../services/DatastreamManager";
import FedoraObjectFactory from "../services/FedoraObjectFactory";
import FedoraDataCollector from "../services/FedoraDataCollector";
import { requireToken } from "./auth";
import { datastreamSanitizer, pidSanitizer, pidSanitizeRegEx, sanitizeParameters } from "./sanitize";
import { IncomingForm } from "formidable";
import Solr from "../services/Solr";
import FedoraDataCollection from "../models/FedoraDataCollection";
import { FedoraObject } from "../models/FedoraObject";

const edit = express.Router();

// Disable caching on the edit route to ensure that data always refreshes correctly:
edit.use((_, res, next) => {
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Expires", "0");
    next();
});

edit.get("/models", requireToken, function (req, res) {
    res.json({ CollectionModels: Config.getInstance().collectionModels, DataModels: Config.getInstance().dataModels });
});

edit.get("/catalog", requireToken, async function (req, res) {
    res.json(await FedoraCatalog.getInstance().getCompleteCatalog());
});

edit.get("/catalog/models", requireToken, function (req, res) {
    res.json(FedoraCatalog.getInstance().getModelCatalog());
});

edit.get("/catalog/datastreams", requireToken, function (req, res) {
    res.json(FedoraCatalog.getInstance().getDatastreamCatalog());
});

edit.get("/catalog/datastreammimetypes", requireToken, function (req, res) {
    res.json(FedoraCatalog.getInstance().getDatastreamMimetypes());
});

edit.get("/catalog/dublinCoreFields", requireToken, function (req, res) {
    res.json(FedoraCatalog.getInstance().getDublinCoreFields());
});

edit.get("/catalog/favoritePids", requireToken, async function (req, res) {
    res.json(await FedoraCatalog.getInstance().getFavoritePids());
});

edit.post("/query/solr", requireToken, bodyParser.json(), async function (req, res) {
    const emptyResponse = { numFound: 0, start: 0, docs: [] };
    const query = req?.body?.query ?? "";
    if (query.length < 1) {
        res.json(emptyResponse);
        return;
    }

    const config = Config.getInstance();
    const solr = Solr.getInstance();
    const rows = parseInt(req?.body?.rows ?? "100").toString();
    const start = parseInt(req?.body?.start ?? "0").toString();
    const sort = req?.body?.sort ?? "title_sort asc";
    const result = await solr.query(config.solrCore, query, { sort, fl: "id,title", rows, start });
    if (result.statusCode !== 200) {
        res.status(result.statusCode ?? 500).send("Unexpected Solr response code.");
        return;
    }
    const response = result?.body?.response ?? emptyResponse;
    res.json(response);
});

edit.post("/object/new", requireToken, bodyParser.json(), async function (req, res) {
    let parentPid = req?.body?.parent;
    if (parentPid !== null && !parentPid?.length) {
        parentPid = null;
    }
    // Validate model parameter:
    const model = req.body?.model;
    if (!model) {
        res.status(400).send("Missing model parameter.");
        return;
    }
    const childModels = ["vudl-system:CoreModel", model];
    const config = Config.getInstance();
    if (Object.values(config.collectionModels).indexOf(model) > -1) {
        childModels.push("vudl-system:CollectionModel");
    } else if (Object.values(config.dataModels).indexOf(model) > -1) {
        childModels.push("vudl-system:DataModel");
    } else {
        res.status(400).send(`Unrecognized model ${model}.`);
        return;
    }
    // Validate title parameter:
    const title = req.body?.title;
    if (!title) {
        res.status(400).send("Missing title parameter.");
        return;
    }
    // Validate state parameter:
    const state = req.body?.state;
    if (!state) {
        res.status(400).send("Missing state parameter.");
        return;
    }

    // Validate parent PID, if set:
    if (parentPid !== null) {
        const collector = FedoraDataCollector.getInstance();
        let parent: FedoraDataCollection;
        try {
            parent = await collector.getObjectData(parentPid);
        } catch (e) {
            res.status(404).send("Error loading parent PID: " + parentPid);
            return;
        }
        // Validate whether parent relationship is legal:
        const relationshipError = ContainmentValidator.getInstance().checkForParentModelErrors(
            parentPid,
            parent.models,
            childModels,
        );
        if (relationshipError !== null) {
            res.status(400).send(relationshipError);
            return;
        }
    }
    const factory = FedoraObjectFactory.getInstance();
    try {
        const newObject = await factory.build(model.replace("vudl-system:", ""), title, state, parentPid);
        res.status(200).send(newObject.pid);
    } catch (e) {
        console.error(e);
        res.status(400).send(e.message);
    }
});

async function getChildren(req, res) {
    let query;
    let sort;
    if ((req.params.pid ?? "").length > 0) {
        const cleanPid = req.params.pid.replace(/["]/g, "");
        query = `fedora_parent_id_str_mv:"${cleanPid}"`;
        sort = `sequence_${cleanPid.replace(/:/g, "_")}_str ASC,title_sort ASC`;
    } else {
        query = "-fedora_parent_id_str_mv:*";
        sort = "title_sort ASC";
    }
    const config = Config.getInstance();
    const solr = Solr.getInstance();
    const rows = parseInt(req.query.rows ?? "100000").toString();
    const start = parseInt(req.query.start ?? "0").toString();
    const result = await solr.query(config.solrCore, query, { sort, fl: "id,title", rows, start });
    if (result.statusCode !== 200) {
        res.status(result.statusCode ?? 500).send("Unexpected Solr response code.");
        return;
    }
    const response = result?.body?.response ?? { numFound: 0, start: 0, docs: [] };
    res.json(response);
}

async function getChildCounts(req, res) {
    const config = Config.getInstance();
    const solr = Solr.getInstance();

    const cleanPid = req.params.pid.replace(/["]/g, "");
    const childQuery = `fedora_parent_id_str_mv:"${cleanPid}"`;
    const childResult = await solr.query(config.solrCore, childQuery, { rows: "0" });
    if (childResult.statusCode !== 200) {
        res.status(childResult.statusCode ?? 500).send("Unexpected Solr response code.");
        return;
    }
    const descendantQuery = `hierarchy_all_parents_str_mv:"${cleanPid}"`;
    const descendantResult = await solr.query(config.solrCore, descendantQuery, { rows: "0" });
    if (descendantResult.statusCode !== 200) {
        res.status(descendantResult.statusCode ?? 500).send("Unexpected Solr response code.");
        return;
    }
    const response = {
        directChildren: childResult?.body?.response?.numFound ?? 0,
        totalDescendants: descendantResult?.body?.response?.numFound ?? 0,
    };
    res.json(response);
}

function uploadFile(req, res, next) {
    const { pid, stream } = req.params;
    const form = new IncomingForm({ multiples: true, maxFileSize: Config.getInstance().maxUploadSize });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            next(err);
            return;
        }
        try {
            const datastream = DatastreamManager.getInstance();
            const { filepath, mimetype } = files?.file;
            await datastream.uploadFile(pid, stream, filepath, mimetype);
            res.status(200).send("Upload success");
        } catch (error) {
            console.error(error);
            res.status(500).send(error.message);
        }
    });
}
edit.post("/object/:pid/datastream/:stream", requireToken, datastreamSanitizer, uploadFile);
edit.post(
    "/object/:pid/datastream/:stream/license",
    requireToken,
    bodyParser.json(),
    datastreamSanitizer,
    async function (req, res) {
        const { pid, stream } = req.params;
        const { licenseKey } = req.body;
        try {
            const datastream = DatastreamManager.getInstance();
            await datastream.uploadLicense(pid, stream, licenseKey);
            res.status(200).send("Upload license success");
        } catch (error) {
            console.log("error", error);
            res.status(500).send(error.message);
        }
    },
);

edit.get("/object/:pid/datastream/:stream/license", requireToken, datastreamSanitizer, async (req, res) => {
    try {
        const { pid, stream } = req.params;
        const datastream = DatastreamManager.getInstance();
        const licenseKey = await datastream.getLicenseKey(pid, stream);
        res.status(200).send(licenseKey);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

edit.post(
    "/object/:pid/datastream/:stream/agents",
    requireToken,
    bodyParser.json(),
    datastreamSanitizer,
    async (req, res) => {
        try {
            const { pid, stream } = req.params;
            const { agents } = req.body;
            const datastream = DatastreamManager.getInstance();
            await datastream.uploadAgents(pid, stream, agents);
            res.status(200).send("Upload agents success");
        } catch (error) {
            res.status(500).send(error.message);
        }
    },
);

edit.post(
    "/object/:pid/datastream/:stream/processMetadata",
    requireToken,
    bodyParser.json(),
    datastreamSanitizer,
    async (req, res) => {
        try {
            const { pid, stream } = req.params;
            const { processMetadata } = req.body;
            const datastream = DatastreamManager.getInstance();
            await datastream.uploadProcessMetadata(pid, stream, processMetadata);
            res.status(200).send("Upload process metadata success");
        } catch (error) {
            res.status(500).send(error.message);
        }
    },
);

edit.post(
    "/object/:pid/datastream/:stream/dublinCore",
    requireToken,
    bodyParser.json(),
    datastreamSanitizer,
    async (req, res) => {
        try {
            const { pid, stream } = req.params;
            const { metadata } = req.body;
            const datastream = DatastreamManager.getInstance();
            await datastream.uploadDublinCoreMetadata(pid, stream, metadata);
            res.status(200).send("Upload metadata success");
        } catch (error) {
            res.status(500).send(error.message);
        }
    },
);

edit.get("/object/:pid/datastream/:stream/agents", requireToken, datastreamSanitizer, async (req, res) => {
    try {
        const { pid, stream } = req.params;
        const datastream = DatastreamManager.getInstance();
        const agents = await datastream.getAgents(pid, stream);
        res.status(200).send(agents);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

edit.get("/object/:pid/datastream/:stream/metadata", requireToken, datastreamSanitizer, async (req, res) => {
    try {
        const { pid, stream } = req.params;
        const datastream = DatastreamManager.getInstance();
        const metadata = await datastream.getMetadata(pid, stream);
        res.status(200).send(metadata);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

edit.get("/object/:pid/datastream/:stream/processMetadata", requireToken, datastreamSanitizer, async (req, res) => {
    try {
        const { pid, stream } = req.params;
        const datastream = DatastreamManager.getInstance();
        const metadata = await datastream.getProcessMetadata(pid, stream);
        res.status(200).send(metadata);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

edit.get("/topLevelObjects", requireToken, getChildren);
edit.get("/object/:pid/children", requireToken, pidSanitizer, getChildren);
edit.get("/object/:pid/childCounts", requireToken, pidSanitizer, getChildCounts);
edit.get("/object/:pid/lastChildPosition", requireToken, pidSanitizer, async (req, res) => {
    const cleanPid = req.params.pid.replace(/["]/g, "");
    const query = `fedora_parent_id_str_mv:"${cleanPid}"`;
    const sequenceField = `sequence_${cleanPid.replace(/:/g, "_")}_str`;
    const sort = `${sequenceField} DESC`;
    const config = Config.getInstance();
    const solr = Solr.getInstance();
    const rows = "1";
    const result = await solr.query(config.solrCore, query, { sort, fl: sequenceField, rows });
    if (result.statusCode !== 200) {
        res.status(result.statusCode ?? 500).send("Unexpected Solr response code.");
        return;
    }
    const docs = result?.body?.response?.docs ?? [];
    res.status(200).send(docs?.[0]?.[sequenceField] ?? "0");
});
function getChildPidHandlerForField(field) {
    return async function (req, res) {
        const cleanPid = req.params.pid.replace(/["]/g, "");
        const query = `${field}:"${cleanPid}"`;
        const sort = req.query.sort ?? "id ASC";
        const config = Config.getInstance();
        const solr = Solr.getInstance();
        const rows = parseInt(req.query.rows ?? "100000").toString();
        const start = parseInt(req.query.start ?? "0").toString();
        const result = await solr.query(config.solrCore, query, { sort, fl: "id", rows, start });
        if (result.statusCode !== 200) {
            res.status(result.statusCode ?? 500).send("Unexpected Solr response code.");
            return;
        }
        const response = result?.body?.response ?? { numFound: 0, start: 0, docs: [] };
        res.json(response);
    };
}
edit.get(
    "/object/:pid/recursiveChildPids",
    requireToken,
    pidSanitizer,
    getChildPidHandlerForField("hierarchy_all_parents_str_mv"),
);
edit.get(
    "/object/:pid/directChildPids",
    requireToken,
    pidSanitizer,
    getChildPidHandlerForField("fedora_parent_id_str_mv"),
);
edit.get("/object/:pid/details", requireToken, pidSanitizer, async function (req, res) {
    try {
        const { fedoraDatastreams, metadata, models, pid, sortOn, sequences, state } =
            await FedoraDataCollector.getInstance().getObjectData(req.params.pid);
        res.json({ datastreams: fedoraDatastreams, metadata, models, pid, sortOn, sequences, state });
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

edit.get("/object/:pid/parents", pidSanitizer, requireToken, async function (req, res) {
    try {
        const fedoraData = await FedoraDataCollector.getInstance().getHierarchy(
            req.params.pid,
            (req.query.shallow ?? "") == "1",
        );
        res.json(fedoraData.getParentTree());
    } catch (e) {
        console.error("Error retrieving breadcrumbs: " + e);
        res.status(500).send("Unexpected error!!");
    }
});

edit.get("/object/:pid/datastream/:stream/download", datastreamSanitizer, requireToken, async function (req, res) {
    try {
        const pid = req.params.pid;
        const stream = req.params.stream;
        const datastream = DatastreamManager.getInstance();
        const mimeType = await datastream.getMimeType(pid, stream);
        const fileType = mimeType?.split("/")?.[1];
        const fileName = `${pid.replace(/:/g, "_")}_${stream}.${fileType}`;
        const buffer = await datastream.downloadBuffer(pid, stream);
        res.header({
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Content-Disposition": `attachment; filename=${fileName}`,
            "Content-Type": mimeType,
        });
        res.status(200).send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

edit.delete("/object/:pid/datastream/:stream", requireToken, datastreamSanitizer, async function (req, res) {
    const pid = req.params.pid;
    const stream = req.params.stream;
    const datastreamManager = DatastreamManager.getInstance();

    try {
        await datastreamManager.deleteDatastream(pid, stream);
        res.status(200).send("Datastream successfully deleted");
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

edit.get("/object/:pid/datastream/:stream/view", requireToken, datastreamSanitizer, async function (req, res) {
    try {
        const pid = req.params.pid;
        const stream = req.params.stream;
        const datastream = DatastreamManager.getInstance();
        const mimeType = await datastream.getMimeType(pid, stream);
        const buffer = await datastream.downloadBuffer(pid, stream);
        res.header({
            "Content-Disposition": "inline",
            "Content-Type": mimeType,
        });
        res.status(200).send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

edit.get("/object/:pid/datastream/:stream/mimetype", requireToken, datastreamSanitizer, async function (req, res) {
    try {
        const pid = req.params.pid;
        const stream = req.params.stream;
        const datastream = DatastreamManager.getInstance();
        const mimeType = await datastream.getMimeType(pid, stream);
        res.status(200).send(mimeType);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

edit.put("/object/:pid/state", requireToken, pidSanitizer, bodyParser.text(), async function (req, res) {
    try {
        const pid = req.params.pid;
        const fedora = Fedora.getInstance();
        const state = req.body;
        const legalStates = ["Active", "Deleted", "Inactive"];
        if (!legalStates.includes(state)) {
            res.status(400).send(`Illegal state: ${state}`);
            return;
        }
        // Only update state if it's different from the existing one:
        const existing = await FedoraDataCollector.getInstance().getObjectData(pid);
        if (existing.state !== state) {
            await fedora.modifyObjectState(pid, state);
        }
        res.status(200).send("ok");
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

const pidAndParentPidSanitizer = sanitizeParameters({ pid: pidSanitizeRegEx, parentPid: pidSanitizeRegEx });
edit.post(
    "/object/:pid/moveToParent/:parentPid",
    requireToken,
    pidAndParentPidSanitizer,
    bodyParser.text(),
    async function (req, res) {
        try {
            const { pid, parentPid } = req.params;
            const pos = parseInt(req.body);

            // Validate the input
            const parentData = await FedoraDataCollector.getInstance().getHierarchy(parentPid);
            const relationshipError = await ContainmentValidator.getInstance().checkForErrors(pid, parentData);
            if (relationshipError !== null) {
                res.status(400).send(relationshipError);
                return;
            }

            // If we got this far, we can safely update things
            await Fedora.getInstance().movePidToParent(pid, parentPid, parentData.sortOn === "custom" ? pos : null);
            res.status(200).send("ok");
        } catch (error) {
            console.error(error);
            res.status(500).send(error.message);
        }
    },
);
edit.put(
    "/object/:pid/parent/:parentPid",
    requireToken,
    pidAndParentPidSanitizer,
    bodyParser.text(),
    async function (req, res) {
        try {
            const { pid, parentPid } = req.params;
            const pos = parseInt(req.body);

            // Validate the input
            const parentData = await FedoraDataCollector.getInstance().getHierarchy(parentPid);
            const relationshipError = await ContainmentValidator.getInstance().checkForErrors(pid, parentData);
            if (relationshipError !== null) {
                res.status(400).send(relationshipError);
                return;
            }

            // If we got this far, we can safely update things
            const fedoraObject = FedoraObject.build(pid);
            await fedoraObject.addParentRelationship(parentPid);
            if (parentData.sortOn === "custom") {
                await fedoraObject.addSequenceRelationship(parentPid, pos);
            }
            res.status(200).send("ok");
        } catch (error) {
            console.error(error);
            res.status(500).send(error.message);
        }
    },
);
edit.delete("/object/:pid/parent/:parentPid", requireToken, pidAndParentPidSanitizer, async function (req, res) {
    try {
        const pid = req.params.pid;
        const parent = req.params.parentPid;
        const fedora = Fedora.getInstance();

        // Validate the input
        const fedoraData = await FedoraDataCollector.getInstance().getHierarchy(pid, true);
        const legalParent = fedoraData.parents.find((current) => current.pid === parent);
        if (!legalParent) {
            res.status(400).send(`${parent} is not an immediate parent of ${pid}.`);
            return;
        }

        // If we got this far, we can safely update things
        if ((legalParent as FedoraDataCollection).sortOn == "custom") {
            await fedora.deleteSequenceRelationship(pid, parent);
        }
        await fedora.deleteParentRelationship(pid, parent);
        res.status(200).send("ok");
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});
edit.put("/object/:pid/sortOn", requireToken, pidSanitizer, bodyParser.text(), async function (req, res) {
    try {
        const pid = req.params.pid;
        const fedora = Fedora.getInstance();
        const sortOn = req.body;

        // Validate the input
        if (sortOn !== "title" && sortOn !== "custom") {
            res.status(400).send(`Unrecognized sortOn value: ${sortOn}. Legal values: custom, title`);
            return;
        }

        // If we got this far, we can safely update things
        await fedora.updateSortOnRelationship(pid, sortOn);
        res.status(200).send("ok");
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});
edit.delete(
    "/object/:pid/positionInParent/:parentPid",
    requireToken,
    pidAndParentPidSanitizer,
    async function (req, res) {
        try {
            const pid = req.params.pid;
            const parent = req.params.parentPid;
            const fedora = Fedora.getInstance();

            // Validate the input
            const fedoraData = await FedoraDataCollector.getInstance().getHierarchy(pid, true);
            const legalParent = fedoraData.parents.find((current) => current.pid === parent);
            if (!legalParent) {
                res.status(400).send(`${parent} is not an immediate parent of ${pid}.`);
                return;
            }

            // If we got this far, we can safely update things
            await fedora.deleteSequenceRelationship(pid, parent);
            res.status(200).send("ok");
        } catch (error) {
            console.error(error);
            res.status(500).send(error.message);
        }
    },
);
edit.put(
    "/object/:pid/positionInParent/:parentPid",
    requireToken,
    pidAndParentPidSanitizer,
    bodyParser.text(),
    async function (req, res) {
        try {
            const pid = req.params.pid;
            const parent = req.params.parentPid;
            const fedora = Fedora.getInstance();
            const pos = parseInt(req.body);

            // Validate the input
            const fedoraData = await FedoraDataCollector.getInstance().getHierarchy(pid, true);
            const legalParent = fedoraData.parents.find((current) => current.pid === parent);
            if (!legalParent) {
                res.status(400).send(`${parent} is not an immediate parent of ${pid}.`);
                return;
            }
            const parentSort = (legalParent as FedoraDataCollection).sortOn;
            if (parentSort !== "custom") {
                res.status(400).send(`${parent} has sort value of ${parentSort}; custom is required.`);
                return;
            }

            // If we got this far, we can safely update things
            await fedora.updateSequenceRelationship(pid, parent, pos);
            res.status(200).send("ok");
        } catch (error) {
            console.error(error);
            res.status(500).send(error.message);
        }
    },
);
export default edit;
