import Config from "../models/Config";
import Fedora from "./Fedora";
import FedoraDataCollector from "./FedoraDataCollector";
import Solr from "./Solr";
import TrashTree from "../models/TrashTree";
import TrashTreeNode from "../models/TrashTreeNode";

class TrashCollector {
    private static instance: TrashCollector;
    protected fedora: Fedora;
    protected collector: FedoraDataCollector;
    protected solr: Solr;
    protected config: Config;

    constructor(fedora: Fedora, collector: FedoraDataCollector, solr: Solr, config: Config) {
        this.fedora = fedora;
        this.collector = collector;
        this.solr = solr;
        this.config = config;
    }

    public static getInstance(): TrashCollector {
        if (!TrashCollector.instance) {
            TrashCollector.instance = new TrashCollector(
                Fedora.getInstance(),
                FedoraDataCollector.getInstance(),
                Solr.getInstance(),
                Config.getInstance(),
            );
        }
        return TrashCollector.instance;
    }

    public static setInstance(collector: TrashCollector): void {
        TrashCollector.instance = collector;
    }

    /**
     * Check whether or not the provided PID is safe to purge.
     *
     * @param pid PID to check
     */
    public async pidIsSafeToPurge(pid: string): Promise<boolean> {
        let data = null;
        try {
            data = await this.collector.getObjectData(pid);
        } catch (e) {
            // Special case: if an object was partially deleted but its tombstone wasn't purged, it will return a 410.
            // If this happens, we should go ahead and finish the job!
            if (e.message === "Unexpected status code: 410") {
                return true;
            }
            throw e;
        }
        // Only allow purging if the item is flagged as deleted in the system:
        return data?.fedoraDetails?.state?.[0] === "Deleted";
    }

    /**
     * Purge a single PID. Return true on success, false on failure (due to technical problem or ineligibility for purging)
     *
     * @param pid PID to purge
     */
    public async purgePid(pid: string): Promise<boolean> {
        if (!(await this.pidIsSafeToPurge(pid))) {
            return false;
        }
        // We need to both mark the object as deleted AND delete its subsequent tombstone to fully reclaim space from Fedora:
        await this.fedora.deleteObject(pid);
        await this.fedora.deleteObjectTombstone(pid);
        return true;
    }

    /**
     * Purge a list of PIDs; return an array of PIDs that could NOT be deleted.
     *
     * @param pids PIDs to purge
     */
    public async purgePids(pids: Array<string>): Promise<Array<string>> {
        const notDeleted: Array<string> = [];
        for (const pid of pids) {
            let result = false;
            try {
                result = await this.purgePid(pid);
            } catch (e) {
                console.error(e);
            }
            if (!result) {
                notDeleted.push(pid);
            }
        }
        return notDeleted;
    }

    /**
     * Check if a PID has children.
     *
     * @param pid PID to check
     * @param childrenToIgnore Child PIDs we don't care about (because they've been purged, but the index may not have caught up)
     */
    public async pidHasChildren(pid: string, childrenToIgnore: Array<string> = []): Promise<boolean> {
        const childLimit = 100000;
        const result = await this.solr.query(this.config.solrCore, `hierarchy_all_parents_str_mv:"${pid}"`, {
            fl: "id",
            rows: childLimit.toString(),
        });
        if (result.statusCode !== 200) {
            throw new Error("Unexpected problem communicating with Solr.");
        }
        const response = result?.body?.response ?? {};
        if ((response?.numFound ?? 0) > childLimit) {
            throw new Error(`${pid} has too many children to analyze.`);
        }
        const docs = (response?.docs ?? []).filter((doc) => !childrenToIgnore.includes(doc.id));
        return docs.length > 0;
    }

    /**
     * Assemble a trash tree using Solr lookups.
     *
     * @param pid PID representing root of trash tree
     * @param pageSize Number of PIDs to retrieve from Solr at once
     */
    public async getTrashTreeForPid(pid: string, pageSize = 100000): Promise<TrashTree> {
        const tree = new TrashTree(pid);
        let offset = 0;
        let numFound = 0;
        do {
            const result = await this.solr.query(
                this.config.solrCore,
                `hierarchy_all_parents_str_mv:"${pid}" AND fgs.state_txt_mv:"Deleted"`,
                { fl: "id,fedora_parent_id_str_mv", start: offset.toString(), rows: pageSize.toString() },
            );
            if (result.statusCode !== 200) {
                throw new Error("Unexpected problem communicating with Solr.");
            }
            const deletedChildren = result?.body?.response ?? { numFound: 0, start: 0, docs: [] };
            numFound = deletedChildren.numFound ?? 0;
            for (const doc of deletedChildren.docs) {
                const node = new TrashTreeNode(doc.id, doc.fedora_parent_id_str_mv);
                tree.addNode(node);
            }
            offset += pageSize;
        } while (numFound > offset);
        return tree;
    }

    /**
     * Safely purge all deleted PIDs beneath a specified PID.
     *
     * @param pid PID containing deleted PIDs to purge
     */
    public async purgeDeletedPidsInContainer(pid: string): Promise<void> {
        let tree;
        try {
            tree = await this.getTrashTreeForPid(pid);
        } catch (e) {
            console.error(e);
            return;
        }
        if (tree.orphanedNodes.length > 0) {
            console.error("Unexpected orphaned nodes found: " + tree.orphanedNodes.map((node) => node.pid).join(", "));
            return;
        }
        let nextLeaf;
        const purged = [];
        while ((nextLeaf = tree.getNextLeaf())) {
            try {
                if (await this.pidIsSafeToPurge(nextLeaf.pid)) {
                    // Double check the index to be absolutely sure the leaf is really a leaf.
                    if (await this.pidHasChildren(nextLeaf.pid, purged)) {
                        console.error(`${nextLeaf.pid} has unexpected children!`);
                        return;
                    }
                    await this.purgePid(nextLeaf.pid);
                    purged.push(nextLeaf.pid);
                    tree.removeLeafNode(nextLeaf);
                    console.log(`Purged ${nextLeaf.pid}`);
                } else {
                    console.error(`${nextLeaf.pid} is not safe to purge!`);
                    return;
                }
            } catch (e) {
                console.error(`Problem purging ${nextLeaf.pid} -- `, e);
                return;
            }
        }
        if (purged.length === 0) {
            console.log("Nothing found to delete.");
        }
    }
}

export default TrashCollector;
