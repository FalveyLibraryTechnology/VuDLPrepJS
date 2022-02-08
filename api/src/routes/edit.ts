import express = require("express");
import bodyParser = require("body-parser");
import Config from "../models/Config";
import Fedora from "../services/Fedora";
import FedoraCatalog from "../services/FedoraCatalog";
import { FedoraObject } from "../models/FedoraObject";
import Datastream from "../services/Datastream";
import FedoraObjectFactory from "../services/FedoraObjectFactory";
import HierarchyCollector from "../services/HierarchyCollector";
import MetadataExtractor from "../services/MetadataExtractor";
import { requireToken } from "./auth";
import { pidSanitizer } from "./sanitize";
import * as formidable from "formidable";
import Solr from "../services/Solr";
const edit = express.Router();

edit.get("/models", requireToken, function (req, res) {
    res.json({ CollectionModels: Config.getInstance().collectionModels, DataModels: Config.getInstance().dataModels });
});

edit.get("/catalog", function (req, res) {
    res.json({ models: FedoraCatalog.getInstance().getCompleteCatalog() });
});

edit.get("/catalog/models", function (req, res) {
    res.json(FedoraCatalog.getInstance().getModelCatalog());
});

edit.get("/catalog/datastreams", function (req, res) {
    res.json(FedoraCatalog.getInstance().getDatastreamCatalog());
});

edit.get("/catalog/datastreammimetypes", function (req, res) {
    res.json(FedoraCatalog.getInstance().getDatastreamMimetypes());
});

edit.post("/object/new", requireToken, bodyParser.json(), async function (req, res) {
    let parentPid = req?.body?.parent;
    if (parentPid !== null && !parentPid?.length) {
        parentPid = null;
    }
    const model = req.body?.model;
    if (!model) {
        res.status(400).send("Missing model parameter.");
        return;
    }
    const title = req.body?.title;
    if (!title) {
        res.status(400).send("Missing title parameter.");
        return;
    }
    const state = req.body?.state;
    if (!state) {
        res.status(400).send("Missing state parameter.");
        return;
    }

    // Validate parent PID, if set:
    if (parentPid !== null) {
        const fedora = Fedora.getInstance();
        const extractor = MetadataExtractor.getInstance();
        let relsExt: string;
        try {
            relsExt = await fedora.getDatastreamAsString(parentPid, "RELS-EXT");
        } catch (e) {
            res.status(404).send("Error loading parent PID: " + parentPid);
            return;
        }
        const models = extractor.extractRelations(relsExt).hasModel ?? [];

        // Parents must be collections; validate!
        if (!models.includes("info:fedora/vudl-system:CollectionModel")) {
            res.status(400).send("Illegal parent " + parentPid + "; not a collection!");
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
    const query =
        (req.params.pid ?? "").length > 0
            ? `fedora_parent_id_str_mv:"${req.params.pid.replace('"', "")}"`
            : "-fedora_parent_id_str_mv:*";
    const config = Config.getInstance();
    const solr = Solr.getInstance();
    const rows = parseInt(req.query.rows ?? "100000").toString();
    const start = parseInt(req.query.start ?? "0").toString();
    const result = await solr.query(config.solrCore, query, { fl: "id,title", rows, start });
    if (result.statusCode !== 200) {
        res.status(result.statusCode ?? 500).send("Unexpected Solr response code.");
        return;
    }
    const response = result?.body?.response ?? { numFound: 0, start: 0, docs: [] };
    res.json(response);
}

function uploadFile(req, res, next) {
    const { pid } = req.params;
    const form = formidable({ multiples: true });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            next(err);
            return;
        }
        try {
            const datastream = Datastream.getInstance();
            const { stream } = fields;
            const { filepath, mimetype } = files?.file;
            await datastream.uploadFile(pid, stream, filepath, mimetype);
            res.status(200).send("Upload success");
        } catch (error) {
            res.status(500).send(error.message);
        }
    });
}

edit.get("/object/details/:pid", requireToken, pidSanitizer, async function (req, res) {
    try {
        const data = await HierarchyCollector.getInstance().getFedoraData(req.params.pid);
        res.json({ models: data.models, datastreams: data.fedoraDatastreams });
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});
edit.post("/object/:pid", requireToken, pidSanitizer, uploadFile);
edit.get("/object/children", requireToken, getChildren);
edit.get("/object/children/:pid", requireToken, pidSanitizer, getChildren);
edit.get("/object/details/:pid", requireToken, pidSanitizer, async function (req, res) {
    const pid = req.params.pid;
    const obj = FedoraObject.build(pid);
    const sort = await obj.getSort();
    const metadata = await Fedora.getInstance().getDublinCore(pid);
    const extractedMetadata = MetadataExtractor.getInstance().extractMetadata(metadata);
    res.json({ pid, sort, metadata: extractedMetadata });
});

export default edit;
