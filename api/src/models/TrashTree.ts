import TrashTreeNode from "./TrashTreeNode";

class TrashTree {
    protected _rootPid;
    protected _orphanedNodes: Array<TrashTreeNode> = [];
    protected needsOrphanCheck = false;
    protected rootNodes: Array<TrashTreeNode> = [];
    protected nodeIndex: Record<string, TrashTreeNode> = {};

    constructor(rootPid: string) {
        this._rootPid = rootPid;
    }

    linkParentsToNode(node: TrashTreeNode, parentList: Array<string>): void {
        for (const parentPid of parentList) {
            const parentNode = this.nodeIndex[parentPid] ?? null;
            if (parentNode !== null) {
                node.linkParentNode(parentNode);
            }
        }
    }

    getMissingParentPidsForNode(node: TrashTreeNode): Array<string> {
        // We need to account for not just parents within the tree, but also the root PID;
        // the root does not exist within the PID, but not having a node object for it is not
        // a problem.
        return node.missingParentNodePids.filter((x) => x !== this._rootPid);
    }

    addNode(node: TrashTreeNode): void {
        this.nodeIndex[node.pid] = node;
        if (node.parentPids.includes(this._rootPid)) {
            this.rootNodes.push(node);
        }
        this.linkParentsToNode(node, node.parentPids);
        if (this.getMissingParentPidsForNode(node).length > 0) {
            this._orphanedNodes.push(node);
        }
        this.needsOrphanCheck = this._orphanedNodes.length > 0;
    }

    addNodes(nodes: Array<TrashTreeNode>): void {
        for (const node of nodes) {
            this.addNode(node);
        }
    }

    removeLeafNode(node: TrashTreeNode): void {
        // Make sure internal indexing is up to date first:
        this.reuniteOrphans();
        const indexedNode = this.nodeIndex[node.pid] ?? null;
        if (indexedNode === null) {
            throw new Error("Unrecognized node provided.");
        }
        if (indexedNode.childNodes.length > 0) {
            throw new Error(`${node.pid} is not a leaf node!`);
        }
        for (const parent of indexedNode.parentNodes) {
            parent.removeChildByPid(node.pid);
        }
        this._orphanedNodes = this._orphanedNodes.filter((x) => x.pid !== node.pid);
        this.rootNodes = this.rootNodes.filter((x) => x.pid !== node.pid);
        delete this.nodeIndex[node.pid];
    }

    getNextLeaf(): TrashTreeNode | null {
        // Make sure internal indexing is up to date first:
        this.reuniteOrphans();
        for (const node of this.rootNodes) {
            return node.firstLeaf;
        }
        return null;
    }

    reuniteOrphans(): void {
        if (!this.needsOrphanCheck) {
            return;
        }
        this._orphanedNodes = this._orphanedNodes.filter((node) => {
            const missingNodes = this.getMissingParentPidsForNode(node);
            this.linkParentsToNode(node, missingNodes);
            return missingNodes.length === 0 ? false : this.getMissingParentPidsForNode(node).length > 0;
        });
        this.needsOrphanCheck = false;
    }

    get orphanedNodes(): Array<TrashTreeNode> {
        this.reuniteOrphans();
        return this._orphanedNodes;
    }

    get rootPid(): string {
        return this._rootPid;
    }
}

export default TrashTree;
