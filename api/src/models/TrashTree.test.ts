import TrashTree from "./TrashTree";
import TrashTreeNode from "./TrashTreeNode";

describe("TrashTree", () => {
    it("can return its own root PID", () => {
        const tree = new TrashTree("trashcan");
        expect(tree.rootPid).toEqual("trashcan");
    });

    it("can attach nodes to the tree out of parent-to-child order and remove them", () => {
        const tree = new TrashTree("trashcan");
        const parent = new TrashTreeNode("parent", ["trashcan"]);
        const child = new TrashTreeNode("child", ["parent"]);

        // attach child node out of order -- we'll have an orphan!
        tree.addNode(child);
        expect(tree.orphanedNodes).toEqual([child]);

        // now attach parent -- this should sort everything out!
        tree.addNode(parent);
        expect(tree.orphanedNodes).toEqual([]);
        expect(tree.getNextLeaf().pid).toEqual("child");

        // now detach child -- the parent should be our next leaf.
        tree.removeLeafNode(child);
        expect(tree.getNextLeaf().pid).toEqual("parent");

        // now detach parent -- the tree should be empty again.
        tree.removeLeafNode(parent);
        expect(tree.getNextLeaf()).toEqual(null);
    });

    it("can attach nodes to the tree in parent-to-child order and remove them", () => {
        const tree = new TrashTree("trashcan");
        const parent = new TrashTreeNode("parent", ["trashcan"]);
        const child = new TrashTreeNode("child", ["parent"]);
        tree.addNodes([parent, child]);

        // there should be no orphaned nodes at this point...
        expect(tree.orphanedNodes).toEqual([]);
        expect(tree.getNextLeaf().pid).toEqual("child");

        // now detach child -- the parent should be our next leaf.
        tree.removeLeafNode(child);
        expect(tree.getNextLeaf().pid).toEqual("parent");

        // now detach parent -- the tree should be empty again.
        tree.removeLeafNode(parent);
        expect(tree.getNextLeaf()).toEqual(null);
    });

    it("removes nodes from the orphaned list when they are no longer orphaned", () => {
        const tree = new TrashTree("trashcan");
        const parent = new TrashTreeNode("parent", ["trashcan"]);
        const child = new TrashTreeNode("child", ["parent"]);
        tree.addNode(child);
        expect(tree.orphanedNodes.length).toEqual(1);
        tree.addNode(parent);
        expect(tree.orphanedNodes.length).toEqual(0);
    });

    it("fails if you try to remove a non-existent leaf", () => {
        const tree = new TrashTree("trashcan");
        let message = "";
        try {
            tree.removeLeafNode(new TrashTreeNode("foo", []));
        } catch (e) {
            message = e.message;
        }
        expect(message).toEqual("Unrecognized node provided.");
    });

    it("fails if you try to remove a non-leaf node", () => {
        const tree = new TrashTree("trashcan");
        const parent = new TrashTreeNode("parent", ["trashcan"]);
        const child = new TrashTreeNode("child", ["parent"]);
        tree.addNodes([child, parent]);
        let message = "";
        try {
            tree.removeLeafNode(parent);
        } catch (e) {
            message = e.message;
        }
        expect(message).toEqual("parent is not a leaf node!");
    });
});
