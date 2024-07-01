import Config from "../models/Config";
import Fedora from "./Fedora";
import FedoraDataCollector from "./FedoraDataCollector";
import MetadataExtractor from "./MetadataExtractor";
import SolrCache from "./SolrCache";
import TikaExtractor from "./TikaExtractor";

describe("FedoraDataCollector", () => {
    let collector;
    let getHierarchySpy;
    let getObjectDataSpy;
    const pid = "test:123";
    const parentPid = "test:124";

    beforeEach(() => {
        Config.setInstance(new Config({}));
        collector = FedoraDataCollector.getInstance();
        getHierarchySpy = jest.spyOn(collector, "getHierarchy");
        getObjectDataSpy = jest.spyOn(collector, "getObjectData");
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const runStandardNonCachedTest = async (shallow: boolean) => {
        const fedora = Fedora.getInstance();
        const extractor = MetadataExtractor.getInstance();
        const dcGenerator = function (name) {
            return {
                name,
                value: "foo",
                attributes: {},
                children: [],
            };
        };
        const dc1 = dcGenerator("dc1");
        const dc2 = dcGenerator("dc2");
        const dublinCoreSpy = jest.spyOn(fedora, "getDublinCore").mockResolvedValueOnce(dc1).mockResolvedValueOnce(dc2);
        const rdfSpy = jest.spyOn(fedora, "getRdf").mockResolvedValueOnce("rdf1").mockResolvedValueOnce("rdf2");
        const extraMetadataSpy = jest
            .spyOn(extractor, "extractMetadata")
            .mockReturnValueOnce({ "dc:title": ["test1"] })
            .mockReturnValueOnce({ "dc:title": ["test2"] });
        const details1 = { isMemberOf: [parentPid] };
        const details2 = { fake: ["stuff"] };
        const extractDetailsSpy = jest
            .spyOn(extractor, "extractFedoraDetails")
            .mockReturnValueOnce(details1)
            .mockReturnValueOnce(details2);
        const extractDatastreamsSpy = jest
            .spyOn(extractor, "extractFedoraDatastreams")
            .mockReturnValueOnce(["stream1"])
            .mockReturnValueOnce(["stream2"]);
        const result = await collector.getHierarchy(pid, shallow);
        expect(dublinCoreSpy).toHaveBeenCalledTimes(2);
        expect(dublinCoreSpy).toHaveBeenNthCalledWith(1, pid);
        expect(dublinCoreSpy).toHaveBeenNthCalledWith(2, parentPid);
        expect(rdfSpy).toHaveBeenCalledTimes(2);
        expect(rdfSpy).toHaveBeenNthCalledWith(1, pid);
        expect(rdfSpy).toHaveBeenNthCalledWith(2, parentPid);
        expect(extraMetadataSpy).toHaveBeenCalledTimes(2);
        expect(extraMetadataSpy).toHaveBeenNthCalledWith(1, dc1);
        expect(extraMetadataSpy).toHaveBeenNthCalledWith(2, dc2);
        expect(extractDetailsSpy).toHaveBeenCalledTimes(2);
        expect(extractDetailsSpy).toHaveBeenNthCalledWith(1, "rdf1");
        expect(extractDetailsSpy).toHaveBeenNthCalledWith(2, "rdf2");
        expect(extractDatastreamsSpy).toHaveBeenCalledTimes(2);
        expect(extractDatastreamsSpy).toHaveBeenNthCalledWith(1, "rdf1");
        expect(extractDatastreamsSpy).toHaveBeenNthCalledWith(2, "rdf2");
        expect(result.pid).toEqual(pid);
        expect(result.title).toEqual("test1");
        expect(result.fedoraDetails).toEqual(details1);
        expect(result.fedoraDatastreams).toEqual(["stream1"]);
        expect(result.parents.length).toEqual(1);
        const parent = result.parents[0];
        expect(parent.pid).toEqual(parentPid);
        expect(parent.title).toEqual("test2");
        expect(parent.fedoraDetails).toEqual(details2);
        expect(parent.fedoraDatastreams).toEqual(["stream2"]);
        expect(parent.parents.length).toEqual(0);
    };

    it("retrieves an appropriate full hierarchy", async () => {
        await runStandardNonCachedTest(false);
        expect(getHierarchySpy).toHaveBeenCalledWith(parentPid);
    });

    it("retrieves an appropriate shallow hierarchy", async () => {
        await runStandardNonCachedTest(true);
        expect(getHierarchySpy).not.toHaveBeenCalledWith(parentPid);
        expect(getObjectDataSpy).toHaveBeenCalledWith(parentPid);
    });

    it("can retrieve data from the cache", async () => {
        const cache = new SolrCache("/foo");
        const mockDoc = {
            pid: [pid],
            "dc.title": ["test1"],
            "fgs.fedorafield": ["foo"],
            "relsext.parentfield": ["bar"],
            meaningless_junk: ["ignore me"],
            datastream_str_mv: ["stream1", "stream2"],
        };
        const cacheSpy = jest.spyOn(cache, "getDocumentFromCache").mockReturnValue(mockDoc);
        const collector = new FedoraDataCollector(
            Fedora.getInstance(),
            MetadataExtractor.getInstance(),
            Config.getInstance(),
            TikaExtractor.getInstance(),
            cache,
        );
        const result = await collector.getObjectData(pid);
        expect(cacheSpy).toHaveBeenCalledTimes(1);
        expect(result.pid).toEqual(pid);
        expect(result.title).toEqual("test1");
        expect(result.fedoraDetails).toEqual({ fedorafield: ["foo"], parentfield: ["bar"] });
        expect(result.fedoraDatastreams).toEqual(["stream1", "stream2"]);
        expect(result.parents.length).toEqual(0);
    });
});
