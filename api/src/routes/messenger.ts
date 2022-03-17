import SolrIndexer from "../services/SolrIndexer";
import bodyParser = require("body-parser");
import express = require("express");
import Config from "../models/Config";
import QueueManager from "../services/QueueManager";
import { requireToken } from "./auth";
import { pidSanitizer } from "./sanitize";
const messenger = express.Router();

messenger.post("/pdfgenerator/:pid", pidSanitizer, requireToken, async function (req, res) {
    QueueManager.getInstance().generatePdf(req.params.pid);
    res.status(200).send("ok");
});

messenger.get("/solrindex/:pid", pidSanitizer, requireToken, async function (req, res) {
    const indexer = SolrIndexer.getInstance();
    try {
        const fedoraFields = await indexer.getFields(req.params.pid);
        res.send(JSON.stringify(fedoraFields, null, "\t"));
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

messenger.post("/solrindex/:pid", pidSanitizer, requireToken, async function (req, res) {
    const indexer = SolrIndexer.getInstance();
    try {
        const result = await indexer.indexPid(req.params.pid);
        res.status(result.statusCode).send(
            result.statusCode === 200 ? "ok" : ((result.body ?? {}).error ?? {}).msg ?? "error"
        );
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

messenger.post("/camel", bodyParser.json(), async function (req, res) {
    const fedoraBase = Config.getInstance().restBaseUrl;
    const idParts = req?.body?.id.replace(fedoraBase, "").split("/");
    if (idParts === null) {
        res.status(400).send("Missing id in body");
        return;
    }
    const pid = idParts[1];
    const datastream = idParts[2] ?? null;
    let action = req?.body?.type.split("#").pop();
    if (action === null) {
        res.status(400).send("Missing type in body");
        return;
    }

    // If we deleted a datastream, we should treat that as an update operation
    // (because we don't want to delete the whole PID!):
    if (datastream !== null && (action === "Delete" || action === "Purge")) {
        console.log(pid + " datastream " + datastream + " deleted; updating...");
        action = "Update";
    }

    switch (action) {
        case "Create":
        case "Update":
            if (datastream == "MASTER") {
                await QueueManager.getInstance().queueMetadataOperation(pid, "add");
            }
            await QueueManager.getInstance().performIndexOperation(pid, "index");
            break;
        case "Delete":
        case "Purge":
            await QueueManager.getInstance().performIndexOperation(pid, "delete");
            break;
        default: {
            const msg = "Unexpected action: " + action + " (on PID: " + pid + ")";
            console.error(msg);
            res.status(400).send(msg);
            return;
        }
    }

    res.status(200).send("ok");
});

export default messenger;
