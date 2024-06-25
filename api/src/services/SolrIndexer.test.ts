import Config from "../models/Config";
import Fedora from "./Fedora";
import FedoraDataCollection from "../models/FedoraDataCollection";
import FedoraDataCollector from "./FedoraDataCollector";
import { NeedleResponse } from "./interfaces";
import Solr from "./Solr";
import SolrCache from "./SolrCache";
import SolrIndexer from "./SolrIndexer";
import TikaExtractor from "./TikaExtractor";

describe("SolrIndexer", () => {
    let indexer;
    beforeEach(() => {
        Config.setInstance(
            new Config({
                articles_to_strip: ["a ", "an ", "the "],
                LanguageMap: { en: "English" },
            }),
        );
        indexer = SolrIndexer.getInstance();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("returns reasonable results in response to almost-empty input", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const collector = FedoraDataCollector.getInstance();
        const record = FedoraDataCollection.build(pid);
        const getHierarchySpy = jest.spyOn(collector, "getHierarchy").mockResolvedValue(record);
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            allfields: [],
            collection: "Digital Library",
            datastream_str_mv: [],
            fedora_parent_id_str_mv: [],
            has_order_str: "no",
            has_thumbnail_str: "false",
            hierarchy_all_parents_str_mv: [],
            hierarchy_first_parent_id_str: pid,
            hierarchy_parent_title: [],
            hierarchy_sequence: "0000000000",
            hierarchy_top_id: [pid],
            hierarchy_top_title: [""],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            modeltype_str_mv: [],
            record_format: "vudl",
        });
        expect(getHierarchySpy).toHaveBeenCalledTimes(1);
        expect(getHierarchySpy).toHaveBeenCalledWith(pid);
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(pid, "1900-01-01T00:00:00Z");
    });

    it("indexes hierarchies correctly", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const parentPid = "test:122";
        const grandparentPid = "test:121";
        const collector = FedoraDataCollector.getInstance();
        const recordDetails = {
            hasModel: ["vudl-system:CoreModel", "vudl-system:DataModel", "vudl-system:ImageData"],
            sequence: [parentPid + "#1"],
        };
        const record = FedoraDataCollection.build(pid, { "dc:title": ["page"] }, recordDetails);
        const parentRecordDetails = {
            hasModel: ["vudl-system:CoreModel", "vudl-system:CollectionModel", "vudl-system:ListCollection"],
            sortOn: ["custom"],
        };
        const parentRecord = FedoraDataCollection.build(parentPid, { "dc:title": ["page list"] }, parentRecordDetails);
        record.addParent(parentRecord);
        const grandparentRecordDetails = {
            hasModel: ["vudl-system:CoreModel", "vudl-system:CollectionModel", "vudl-system:ResourceCollection"],
        };
        const grandparentRecord = FedoraDataCollection.build(
            grandparentPid,
            { "dc:title": ["test record"] },
            grandparentRecordDetails,
        );
        parentRecord.addParent(grandparentRecord);
        const getHierarchySpy = jest
            .spyOn(collector, "getHierarchy")
            .mockResolvedValueOnce(record)
            .mockResolvedValueOnce(parentRecord);
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            allfields: ["page"],
            collection: "Digital Library",
            datastream_str_mv: [],
            "dc.title_txt_mv": ["page"],
            dc_title_str: "page",
            fedora_parent_id_str_mv: [parentPid],
            has_order_str: "no",
            has_thumbnail_str: "false",
            hierarchy_all_parents_str_mv: [parentPid, grandparentPid],
            hierarchy_browse: ["test record{{{_ID_}}}test:121"],
            hierarchy_first_parent_id_str: grandparentPid,
            hierarchy_parent_id: [grandparentPid],
            hierarchy_parent_title: ["test record"],
            hierarchy_sequence: ["0000000000"],
            hierarchy_sequence_sort_str: "0000000000",
            hierarchy_top_id: [grandparentPid],
            hierarchy_top_title: ["test record"],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            modeltype_str_mv: recordDetails.hasModel,
            record_format: "vudl",
            "relsext.hasModel_txt_mv": recordDetails.hasModel,
            "relsext.sequence_txt_mv": ["test:122#1"],
            sequence_test_122_str: "0000000001",
            title: "page",
            title_full: "page",
            title_short: "page",
            title_sort: "page",
        });
        const parentResult = await indexer.getFields(parentPid);
        expect(parentResult).toEqual({
            allfields: ["page list"],
            collection: "Digital Library",
            collection_title_sort_str: "page list",
            datastream_str_mv: [],
            "dc.title_txt_mv": ["page list"],
            dc_title_str: "page list",
            fedora_parent_id_str_mv: [grandparentPid],
            has_order_str: "yes",
            has_thumbnail_str: "false",
            hierarchy_all_parents_str_mv: [grandparentPid],
            hierarchy_browse: ["test record{{{_ID_}}}test:121"],
            hierarchy_first_parent_id_str: parentPid,
            hierarchy_parent_id: [grandparentPid],
            hierarchy_parent_title: ["test record"],
            hierarchy_sequence: ["0000000000"],
            hierarchy_sequence_sort_str: "0000000000",
            hierarchy_top_id: [grandparentPid],
            hierarchy_top_title: ["test record"],
            hierarchytype: "",
            id: parentPid,
            institution: "My University",
            modeltype_str_mv: parentRecordDetails.hasModel,
            "relsext.hasModel_txt_mv": parentRecordDetails.hasModel,
            record_format: "vudl",
            "relsext.sortOn_txt_mv": ["custom"],
            title: "page list",
            title_full: "page list",
            title_short: "page list",
            title_sort: "page list",
        });
        expect(getHierarchySpy).toHaveBeenCalledTimes(2);
        expect(getHierarchySpy).toHaveBeenNthCalledWith(1, pid);
        expect(getHierarchySpy).toHaveBeenNthCalledWith(2, parentPid);
        expect(changeSpy).toHaveBeenCalledTimes(2);
        expect(changeSpy).toHaveBeenNthCalledWith(1, pid, "1900-01-01T00:00:00Z");
        expect(changeSpy).toHaveBeenNthCalledWith(2, parentPid, "1900-01-01T00:00:00Z");
    });

    it("processes title data correctly", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const altTitle = "alternate title";
        const title = "the test title";
        const metadata = {
            "dc:title": [title, altTitle],
        };
        const collector = FedoraDataCollector.getInstance();
        const record = FedoraDataCollection.build(pid, metadata);
        const getHierarchySpy = jest.spyOn(collector, "getHierarchy").mockResolvedValue(record);
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            allfields: [title, altTitle],
            collection: "Digital Library",
            collection_title_sort_str: "test title",
            datastream_str_mv: [],
            "dc.title_txt_mv": [title, altTitle],
            dc_title_str: title,
            fedora_parent_id_str_mv: [],
            has_order_str: "no",
            has_thumbnail_str: "false",
            hierarchy_all_parents_str_mv: [],
            hierarchy_first_parent_id_str: pid,
            hierarchy_parent_title: [],
            hierarchy_sequence: "0000000000",
            hierarchy_top_id: [pid],
            hierarchy_top_title: [title],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            modeltype_str_mv: [],
            record_format: "vudl",
            title: title,
            title_alt: [altTitle],
            title_full: title,
            title_short: title,
            title_sort: "test title",
        });
        expect(getHierarchySpy).toHaveBeenCalledTimes(1);
        expect(getHierarchySpy).toHaveBeenCalledWith(pid);
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(pid, "1900-01-01T00:00:00Z");
    });

    it("processes Dublin Core fields correctly", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const title = "title";
        const metadata = {
            "dc:title": [title],
            "dc:creator": ["Doe, Jane"],
            "dc:contributor": ["Smith, John"],
            "dc:language": ["en"],
            "dc:source": ["Source"],
            "dc:description": ["Description"],
            "dc:format": ["Book"],
            "dc:publisher": ["Publisher"],
            "dc:series": ["Series"],
            "dc:subject": ["Topic"],
            "dc:relation": ["Relation"],
            "dc:date": ["1979-12-06"],
        };
        const collector = FedoraDataCollector.getInstance();
        const record = FedoraDataCollection.build(pid, metadata);
        const getHierarchySpy = jest.spyOn(collector, "getHierarchy").mockResolvedValue(record);
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            allfields: [
                title,
                "Doe, Jane",
                "Smith, John",
                "en",
                "Source",
                "Description",
                "Book",
                "Publisher",
                "Series",
                "Topic",
                "Relation",
                "1979-12-06",
            ],
            author: ["Doe, Jane"],
            author2: ["Smith, John"],
            author_sort: "Doe, Jane",
            collection: "Digital Library",
            collection_title_sort_str: title,
            datastream_str_mv: [],
            "dc.contributor_txt_mv": ["Smith, John"],
            "dc.creator_txt_mv": ["Doe, Jane"],
            "dc.date_txt_mv": ["1979-12-06"],
            "dc.description_txt_mv": ["Description"],
            "dc.format_txt_mv": ["Book"],
            "dc.language_txt_mv": ["en"],
            "dc.publisher_txt_mv": ["Publisher"],
            "dc.relation_txt_mv": ["Relation"],
            "dc.series_txt_mv": ["Series"],
            "dc.source_txt_mv": ["Source"],
            "dc.subject_txt_mv": ["Topic"],
            "dc.title_txt_mv": [title],
            dc_date_str: "1979-12-06",
            dc_relation_str: "Relation",
            dc_source_str_mv: ["Source"],
            dc_title_str: title,
            description: "Description",
            fedora_parent_id_str_mv: [],
            format: ["Book"],
            has_order_str: "no",
            has_thumbnail_str: "false",
            hierarchy_all_parents_str_mv: [],
            hierarchy_first_parent_id_str: pid,
            hierarchy_parent_title: [],
            hierarchy_sequence: "0000000000",
            hierarchy_top_id: [pid],
            hierarchy_top_title: [title],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            language: ["English"],
            modeltype_str_mv: [],
            normalized_sort_date: "1979-12-06T00:00:00Z",
            publishDate: "1979",
            publishDateSort: "1979",
            publisher: ["Publisher"],
            publisher_str_mv: ["Publisher"],
            record_format: "vudl",
            series: ["Relation"],
            title: title,
            title_full: title,
            title_short: title,
            title_sort: title,
            topic: ["Topic"],
            topic_facet: ["Topic"],
            topic_str_mv: ["Topic"],
        });
        expect(getHierarchySpy).toHaveBeenCalledTimes(1);
        expect(getHierarchySpy).toHaveBeenCalledWith(pid);
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(pid, "1900-01-01T00:00:00Z");
    });

    it("processes agent data correctly", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const collector = FedoraDataCollector.getInstance();
        const record = FedoraDataCollection.build(pid, {}, {}, ["AGENTS"]);
        const getHierarchySpy = jest.spyOn(collector, "getHierarchy").mockResolvedValue(record);
        const fedora = Fedora.getInstance();
        const agentXml = `<METS:metsHdr xmlns:METS="http://www.loc.gov/METS/" CREATEDATE="2012-08-16T02:28:47.698Z" LASTMODDATE="2012-08-17T20:25:54.802Z" RECORDSTATUS="PUBLISHED">
    <METS:agent ROLE="DISSEMINATOR" TYPE="ORGANIZATION">
        <METS:name>Falvey Memorial Library, Villanova University</METS:name>
    </METS:agent>
    <METS:agent ROLE="CREATOR" TYPE="INDIVIDUAL">
        <METS:name>MPF</METS:name>
    </METS:agent>
    <METS:agent ROLE="EDITOR" TYPE="INDIVIDUAL">
        <METS:name>MPF</METS:name>
    </METS:agent>
</METS:metsHdr>`;
        const getStreamSpy = jest.spyOn(fedora, "getDatastreamAsString").mockResolvedValue(agentXml);
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            "agent.name_txt_mv": ["Falvey Memorial Library, Villanova University", "MPF", "MPF"],
            allfields: [],
            collection: "Digital Library",
            datastream_str_mv: ["AGENTS"],
            fedora_parent_id_str_mv: [],
            has_order_str: "no",
            has_thumbnail_str: "false",
            hierarchy_all_parents_str_mv: [],
            hierarchy_first_parent_id_str: pid,
            hierarchy_parent_title: [],
            hierarchy_sequence: "0000000000",
            hierarchy_top_id: [pid],
            hierarchy_top_title: [""],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            modeltype_str_mv: [],
            record_format: "vudl",
        });
        expect(getStreamSpy).toHaveBeenCalledTimes(1);
        expect(getStreamSpy).toHaveBeenCalledWith(pid, "AGENTS");
        expect(getHierarchySpy).toHaveBeenCalledTimes(1);
        expect(getHierarchySpy).toHaveBeenCalledWith(pid);
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(pid, "1900-01-01T00:00:00Z");
    });

    it("processes license data correctly", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const collector = FedoraDataCollector.getInstance();
        const record = FedoraDataCollection.build(pid, {}, {}, ["LICENSE"]);
        const getHierarchySpy = jest.spyOn(collector, "getHierarchy").mockResolvedValue(record);
        const fedora = Fedora.getInstance();
        const licenseXml = `<METS:rightsMD xmlns:METS="http://www.loc.gov/METS/" ID="0">
    <METS:mdRef xmlns:xlink="http://www.w3.org/1999/xlink" LOCTYPE="URL" MDTYPE="OTHER" MIMETYPE="text/html" OTHERMDTYPE="HTML" xlink:href="http://creativecommons.org/licenses/by-sa/4.0/"></METS:mdRef>
</METS:rightsMD>`;
        const getStreamSpy = jest.spyOn(fedora, "getDatastreamAsString").mockResolvedValue(licenseXml);
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            allfields: [],
            collection: "Digital Library",
            datastream_str_mv: ["LICENSE"],
            fedora_parent_id_str_mv: [],
            has_order_str: "no",
            has_thumbnail_str: "false",
            hierarchy_all_parents_str_mv: [],
            hierarchy_first_parent_id_str: pid,
            hierarchy_parent_title: [],
            hierarchy_sequence: "0000000000",
            hierarchy_top_id: [pid],
            hierarchy_top_title: [""],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            "license.mdRef_str": "http://creativecommons.org/licenses/by-sa/4.0/",
            modeltype_str_mv: [],
            record_format: "vudl",
        });
        expect(getStreamSpy).toHaveBeenCalledTimes(1);
        expect(getStreamSpy).toHaveBeenCalledWith(pid, "LICENSE");
        expect(getHierarchySpy).toHaveBeenCalledTimes(1);
        expect(getHierarchySpy).toHaveBeenCalledWith(pid);
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(pid, "1900-01-01T00:00:00Z");
    });

    it("processes FITS data correctly", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const collector = FedoraDataCollector.getInstance();
        const record = FedoraDataCollection.build(pid, {}, {}, ["MASTER-MD"]);
        const getHierarchySpy = jest.spyOn(collector, "getHierarchy").mockResolvedValue(record);
        const fedora = Fedora.getInstance();
        const fitsXml = `<?xml version="1.0" encoding="UTF-8"?>
<fits xmlns="http://hul.harvard.edu/ois/xml/ns/fits/fits_output" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://hul.harvard.edu/ois/xml/ns/fits/fits_output http://hul.harvard.edu/ois/xml/xsd/fits/fits_output.xsd" version="0.6.1" timestamp="12/13/12 7:24 PM">
    <identification>
    <identity format="Tagged Image File Format" mimetype="image/tiff" toolname="FITS" toolversion="0.6.1">
        <tool toolname="Jhove" toolversion="1.5" />
        <tool toolname="file utility" toolversion="5.04" />
        <tool toolname="Exiftool" toolversion="7.74" />
        <tool toolname="Droid" toolversion="3.0" />
        <tool toolname="NLNZ Metadata Extractor" toolversion="3.4GA" />
        <tool toolname="ffident" toolversion="0.2" />
        <version toolname="Jhove" toolversion="1.5" status="CONFLICT">5.0</version>
        <version toolname="Droid" toolversion="3.0" status="CONFLICT">3</version>
        <version toolname="Droid" toolversion="3.0" status="CONFLICT">4</version>
        <version toolname="Droid" toolversion="3.0" status="CONFLICT">6</version>
        <externalIdentifier toolname="Droid" toolversion="3.0" type="puid">fmt/7</externalIdentifier>
        <externalIdentifier toolname="Droid" toolversion="3.0" type="puid">fmt/8</externalIdentifier>
        <externalIdentifier toolname="Droid" toolversion="3.0" type="puid">fmt/9</externalIdentifier>
        <externalIdentifier toolname="Droid" toolversion="3.0" type="puid">fmt/10</externalIdentifier>
    </identity>
    </identification>
    <fileinfo>
    <size toolname="Jhove" toolversion="1.5">21627336</size>
    <lastmodified toolname="Exiftool" toolversion="7.74" status="SINGLE_RESULT">2012:12:13 19:24:01-05:00</lastmodified>
    <filepath toolname="OIS File Information" toolversion="0.1" status="SINGLE_RESULT">/var/tmp/outFile</filepath>
    <filename toolname="OIS File Information" toolversion="0.1" status="SINGLE_RESULT">/var/tmp/outFile</filename>
    <md5checksum toolname="OIS File Information" toolversion="0.1" status="SINGLE_RESULT">5f56d86c1ee7b0531717f070046786cc</md5checksum>
    <fslastmodified toolname="OIS File Information" toolversion="0.1" status="SINGLE_RESULT">1355444641000</fslastmodified>
    </fileinfo>
    <filestatus>
    <well-formed toolname="Jhove" toolversion="1.5" status="SINGLE_RESULT">true</well-formed>
    <valid toolname="Jhove" toolversion="1.5" status="SINGLE_RESULT">true</valid>
    </filestatus>
    <metadata>
    <image>
        <byteOrder toolname="Jhove" toolversion="1.5" status="SINGLE_RESULT">little endian</byteOrder>
        <compressionScheme toolname="Jhove" toolversion="1.5">Uncompressed</compressionScheme>
        <imageWidth toolname="Jhove" toolversion="1.5">2318</imageWidth>
        <imageHeight toolname="Jhove" toolversion="1.5">3110</imageHeight>
        <colorSpace toolname="Jhove" toolversion="1.5">RGB</colorSpace>
        <referenceBlackWhite toolname="Jhove" toolversion="1.5" status="SINGLE_RESULT">0.0 255.0 0.0 255.0 0.0 255.0</referenceBlackWhite>
        <orientation toolname="Jhove" toolversion="1.5">normal*</orientation>
        <samplingFrequencyUnit toolname="Jhove" toolversion="1.5">in.</samplingFrequencyUnit>
        <xSamplingFrequency toolname="Jhove" toolversion="1.5">400</xSamplingFrequency>
        <ySamplingFrequency toolname="Jhove" toolversion="1.5">400</ySamplingFrequency>
        <bitsPerSample toolname="Jhove" toolversion="1.5">8 8 8</bitsPerSample>
        <samplesPerPixel toolname="Jhove" toolversion="1.5">3</samplesPerPixel>
    </image>
    </metadata>
</fits>`;
        const getStreamSpy = jest.spyOn(fedora, "getDatastreamAsString").mockResolvedValue(fitsXml);
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            allfields: [],
            collection: "Digital Library",
            datastream_str_mv: ["MASTER-MD"],
            fedora_parent_id_str_mv: [],
            has_order_str: "no",
            has_thumbnail_str: "false",
            height_str: "3110",
            hierarchy_all_parents_str_mv: [],
            hierarchy_first_parent_id_str: pid,
            hierarchy_parent_title: [],
            hierarchy_sequence: "0000000000",
            hierarchy_top_id: [pid],
            hierarchy_top_title: [""],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            mime_str_mv: ["image/tiff"],
            modeltype_str_mv: [],
            record_format: "vudl",
            sizebytes_str: "21627336",
            width_str: "2318",
        });
        expect(getStreamSpy).toHaveBeenCalledTimes(1);
        expect(getStreamSpy).toHaveBeenCalledWith(pid, "MASTER-MD");
        expect(getHierarchySpy).toHaveBeenCalledTimes(1);
        expect(getHierarchySpy).toHaveBeenCalledWith(pid);
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(pid, "1900-01-01T00:00:00Z");
    });

    it("processes thumbnail data correctly", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const collector = FedoraDataCollector.getInstance();
        const record = FedoraDataCollection.build(pid, {}, {}, ["THUMBNAIL"]);
        const getHierarchySpy = jest.spyOn(collector, "getHierarchy").mockResolvedValue(record);
        const fedora = Fedora.getInstance();
        const agentXml = `<rdf:RDF
        xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
        xmlns:dcterms="http://purl.org/dc/terms/"
        xmlns:ebucore="http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#"
        xmlns:premis="http://www.loc.gov/premis/rdf/v1#"
        xmlns:fedora="http://fedora.info/definitions/v4/repository#"
        xmlns:ldp="http://www.w3.org/ns/ldp#"
        xmlns:j.0="http://fedora.info/definitions/1/0/access/" > 
      <rdf:Description rdf:about="http://localhost:8080/rest/vudl:8/THUMBNAIL">
        <j.0:objState>A</j.0:objState>
        <rdf:type rdf:resource="http://fedora.info/definitions/v4/repository#Binary"/>
        <rdf:type rdf:resource="http://fedora.info/definitions/v4/repository#Resource"/>
        <fedora:hasFixityService rdf:resource="http://localhost:8080/rest/vudl:8/THUMBNAIL/fcr:fixity"/>
        <premis:hasMessageDigest rdf:resource="urn:md5:fb36b2582b217396361c85e784015efb"/>
        <rdf:type rdf:resource="http://www.w3.org/ns/ldp#Resource"/>
        <ebucore:filename>THUMBNAIL</ebucore:filename>
        <fedora:lastModified rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime">2022-03-18T19:51:22.280867Z</fedora:lastModified>
        <premis:hasMessageDigest rdf:resource="urn:sha-512:6165712b868b5ffcc0885a7c069bc7d0bab981da54864c23ec8a3a1444c2c3ec76fbf662806095558f7e045759e8b7f442787b0eb8a9f2bbbb4d21509abe1896"/>
        <rdf:type rdf:resource="http://www.w3.org/ns/ldp#NonRDFSource"/>
        <dcterms:title>vudl_8_THUMBNAIL</dcterms:title>
        <ebucore:hasMimeType>image/jpeg</ebucore:hasMimeType>
        <premis:hasSize rdf:datatype="http://www.w3.org/2001/XMLSchema#long">1005</premis:hasSize>
        <fedora:created rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime">2022-03-18T19:51:22.234645Z</fedora:created>
      </rdf:Description>
    </rdf:RDF>`;
        const getRdfSpy = jest.spyOn(fedora, "getRdf").mockResolvedValue(agentXml);
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            THUMBNAIL_contentDigest_digest_str: "fb36b2582b217396361c85e784015efb",
            allfields: [],
            collection: "Digital Library",
            datastream_str_mv: ["THUMBNAIL"],
            fedora_parent_id_str_mv: [],
            has_order_str: "no",
            has_thumbnail_str: "true",
            hierarchy_all_parents_str_mv: [],
            hierarchy_first_parent_id_str: pid,
            hierarchy_parent_title: [],
            hierarchy_sequence: "0000000000",
            hierarchy_top_id: [pid],
            hierarchy_top_title: [""],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            modeltype_str_mv: [],
            record_format: "vudl",
        });
        expect(getRdfSpy).toHaveBeenCalledTimes(1);
        expect(getRdfSpy).toHaveBeenCalledWith(pid + "/THUMBNAIL/fcr:metadata");
        expect(getHierarchySpy).toHaveBeenCalledTimes(1);
        expect(getHierarchySpy).toHaveBeenCalledWith(pid);
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(pid, "1900-01-01T00:00:00Z");
    });

    it("processes full text data correctly", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const collector = FedoraDataCollector.getInstance();
        const record = FedoraDataCollection.build(pid, {}, { hasModel: ["vudl-system:PDFData"] }, [
            "MASTER",
            "OCR-DIRTY",
        ]);
        const getHierarchySpy = jest.spyOn(collector, "getHierarchy").mockResolvedValue(record);
        const fedora = Fedora.getInstance();
        const getStreamSpy = jest.spyOn(fedora, "getDatastreamAsString").mockResolvedValue("dirty OCR");
        const mockMsg = { body: "foo" };
        const getStreamSpy2 = jest.spyOn(fedora, "getDatastream").mockResolvedValue(mockMsg as NeedleResponse);
        const tika = TikaExtractor.getInstance();
        const tikaSpy = jest.spyOn(tika, "extractText").mockReturnValue("tika text");
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            allfields: [],
            collection: "Digital Library",
            datastream_str_mv: ["MASTER", "OCR-DIRTY"],
            fedora_parent_id_str_mv: [],
            fulltext: ["dirty OCR", "tika text"],
            has_order_str: "no",
            has_thumbnail_str: "false",
            hierarchy_all_parents_str_mv: [],
            hierarchy_first_parent_id_str: pid,
            hierarchy_parent_title: [],
            hierarchy_sequence: "0000000000",
            hierarchy_top_id: [pid],
            hierarchy_top_title: [""],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            modeltype_str_mv: ["vudl-system:PDFData"],
            record_format: "vudl",
            "relsext.hasModel_txt_mv": ["vudl-system:PDFData"],
        });
        expect(getStreamSpy).toHaveBeenCalledTimes(1);
        expect(getStreamSpy).toHaveBeenCalledWith(pid, "OCR-DIRTY");
        expect(getStreamSpy2).toHaveBeenCalledTimes(1);
        expect(getStreamSpy2).toHaveBeenCalledWith(pid, "MASTER");
        expect(tikaSpy).toHaveBeenCalledTimes(1);
        expect(tikaSpy).toHaveBeenCalledWith("foo");
        expect(getHierarchySpy).toHaveBeenCalledTimes(1);
        expect(getHierarchySpy).toHaveBeenCalledWith(pid);
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(pid, "1900-01-01T00:00:00Z");
    });

    it("prefers text transcript when both text and VTT are available", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const collector = FedoraDataCollector.getInstance();
        const record = FedoraDataCollection.build(pid, {}, {}, ["TEXT-TRANSCRIPT", "VTT"]);
        const getHierarchySpy = jest.spyOn(collector, "getHierarchy").mockResolvedValue(record);
        const fedora = Fedora.getInstance();
        const getStreamSpy = jest.spyOn(fedora, "getDatastreamAsString").mockResolvedValue("text transcript");
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            allfields: [],
            collection: "Digital Library",
            datastream_str_mv: ["TEXT-TRANSCRIPT", "VTT"],
            fedora_parent_id_str_mv: [],
            fulltext: ["text transcript"],
            has_order_str: "no",
            has_thumbnail_str: "false",
            hierarchy_all_parents_str_mv: [],
            hierarchy_first_parent_id_str: pid,
            hierarchy_parent_title: [],
            hierarchy_sequence: "0000000000",
            hierarchy_top_id: [pid],
            hierarchy_top_title: [""],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            modeltype_str_mv: [],
            record_format: "vudl",
        });
        expect(getStreamSpy).toHaveBeenCalledTimes(1);
        expect(getStreamSpy).toHaveBeenCalledWith(pid, "TEXT-TRANSCRIPT");
        expect(getHierarchySpy).toHaveBeenCalledTimes(1);
        expect(getHierarchySpy).toHaveBeenCalledWith(pid);
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(pid, "1900-01-01T00:00:00Z");
    });

    it("processes transcript data correctly when there is only a VTT", async () => {
        const changeSpy = jest.spyOn(indexer, "getChangeTrackerDetails").mockResolvedValue({});
        const pid = "test:123";
        const collector = FedoraDataCollector.getInstance();
        const record = FedoraDataCollection.build(pid, {}, {}, ["VTT"]);
        const getHierarchySpy = jest.spyOn(collector, "getHierarchy").mockResolvedValue(record);
        const fedora = Fedora.getInstance();
        const getStreamSpy = jest.spyOn(fedora, "getDatastreamAsString").mockResolvedValue("VTT transcript");
        const result = await indexer.getFields(pid);
        expect(result).toEqual({
            allfields: [],
            collection: "Digital Library",
            datastream_str_mv: ["VTT"],
            fedora_parent_id_str_mv: [],
            fulltext: ["VTT transcript"],
            has_order_str: "no",
            has_thumbnail_str: "false",
            hierarchy_all_parents_str_mv: [],
            hierarchy_first_parent_id_str: pid,
            hierarchy_parent_title: [],
            hierarchy_sequence: "0000000000",
            hierarchy_top_id: [pid],
            hierarchy_top_title: [""],
            hierarchytype: "",
            id: pid,
            institution: "My University",
            modeltype_str_mv: [],
            record_format: "vudl",
        });
        expect(getStreamSpy).toHaveBeenCalledTimes(1);
        expect(getStreamSpy).toHaveBeenCalledWith(pid, "VTT");
        expect(getHierarchySpy).toHaveBeenCalledTimes(1);
        expect(getHierarchySpy).toHaveBeenCalledWith(pid);
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(pid, "1900-01-01T00:00:00Z");
    });

    it("can initiate Solr delete operations", async () => {
        const pid = "test:123";
        const deleteSpy = jest.spyOn(Solr.getInstance(), "deleteRecord").mockImplementation(jest.fn());
        await indexer.deletePid(pid);
        expect(deleteSpy).toHaveBeenCalledWith("biblio", pid);
    });

    it("can initiate Solr index operations and store the result", async () => {
        const pid = "test:123";
        const fakeFields = { pid };
        const getSpy = jest.spyOn(indexer, "getFields").mockReturnValue(fakeFields);
        const purgeSpy = jest.spyOn(SolrCache.getInstance(), "purgeFromCacheIfEnabled").mockImplementation(jest.fn());
        const indexSpy = jest.spyOn(Solr.getInstance(), "indexRecord").mockImplementation(jest.fn());
        await indexer.indexPid(pid);
        expect(purgeSpy).toHaveBeenCalledWith(pid);
        expect(getSpy).toHaveBeenCalledWith(pid);
        expect(indexSpy).toHaveBeenCalledWith("biblio", fakeFields);
        expect(indexer.getLastIndexResults()).toEqual(fakeFields);
    });
});
