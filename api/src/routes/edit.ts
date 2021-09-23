import express = require("express");
import bodyParser = require("body-parser");
import Config from "../models/Config";
const router = express.Router();
import { requireToken } from "./auth";

router.get("/models", requireToken, function (req, res) {
    res.json({ CollectionModels: Config.getInstance().collectionModels, DataModels: Config.getInstance().dataModels });
});

router.post("/object/new", requireToken, bodyParser.json(), function (req, res) {
    console.log("form post! object new!", req.body);
    res.json({ TODO: "Handle this form", ...req.body });
});

module.exports = router;
