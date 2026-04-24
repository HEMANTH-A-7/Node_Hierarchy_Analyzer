const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));


const USER_ID = 'Amarthi Hemanth Kumar_21032005';          
const EMAIL_ID = 'hemanthkumar_amarthi@srmap.edu.in';  
const COLLEGE_ROLL = 'AP23110010635';             
// ───────────────────────────────────────────────────────────────────────────

function isValidEntry(entry) {
  const trimmed = entry.trim();
  // Must match exactly X->Y where X and Y are single uppercase letters
  return /^[A-Z]->[A-Z]$/.test(trimmed);
}

function processData(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdges = new Set();
  const validEdges = [];

  for (const raw of data) {
    const entry = raw.trim();

    if (!isValidEntry(entry)) {
      invalidEntries.push(raw);
      continue;
    }

    // Self-loop check: A->A is already blocked by regex (same letter both sides)
    // but let's double check
    const [parent, child] = entry.split('->');
    if (parent === child) {
      invalidEntries.push(raw);
      continue;
    }

    if (seenEdges.has(entry)) {
      // Only push first duplicate occurrence
      if (!duplicateEdges.includes(entry)) {
        duplicateEdges.push(entry);
      }
    } else {
      seenEdges.add(entry);
      validEdges.push([parent, child]);
    }
  }

  // Build adjacency (multi-parent: first-encountered parent wins)
  const parentOf = {}; // child -> parent
  const childrenOf = {}; // parent -> [children]
  const allNodes = new Set();

  for (const [parent, child] of validEdges) {
    allNodes.add(parent);
    allNodes.add(child);

    if (!(parent in childrenOf)) childrenOf[parent] = [];
    if (!(child in childrenOf)) childrenOf[child] = [];

    if (child in parentOf) {
      // Multi-parent: discard subsequent parent edge silently
      continue;
    }
    parentOf[child] = parent;
    childrenOf[parent].push(child);
  }

  // Find roots (nodes not appearing as child in any valid edge)
  const roots = [];
  for (const node of allNodes) {
    if (!(node in parentOf)) {
      roots.push(node);
    }
  }

  // Group nodes into connected components (undirected)
  const visited = new Set();
  const components = [];

  function getComponent(start) {
    const component = new Set();
    const queue = [start];
    while (queue.length) {
      const node = queue.shift();
      if (component.has(node)) continue;
      component.add(node);
      // Add neighbors (children + parent)
      for (const child of (childrenOf[node] || [])) queue.push(child);
      if (parentOf[node]) queue.push(parentOf[node]);
    }
    return component;
  }

  for (const node of allNodes) {
    if (!visited.has(node)) {
      const comp = getComponent(node);
      for (const n of comp) visited.add(n);
      components.push(comp);
    }
  }

  // Detect cycle using DFS
  function hasCycle(compNodes) {
    const color = {}; // 0=white, 1=gray, 2=black
    for (const n of compNodes) color[n] = 0;

    function dfs(node) {
      color[node] = 1;
      for (const child of (childrenOf[node] || [])) {
        if (color[child] === 1) return true;
        if (color[child] === 0 && dfs(child)) return true;
      }
      color[node] = 2;
      return false;
    }

    for (const node of compNodes) {
      if (color[node] === 0) {
        if (dfs(node)) return true;
      }
    }
    return false;
  }

  // Build nested tree object
  function buildTree(node) {
    const children = childrenOf[node] || [];
    const obj = {};
    for (const child of children) {
      obj[child] = buildTree(child);
    }
    return obj;
  }

  function buildNestedTree(root) {
    return { [root]: buildTree(root) };
  }

  // Calculate depth (longest root-to-leaf path, counting nodes)
  function calcDepth(node) {
    const children = childrenOf[node] || [];
    if (children.length === 0) return 1;
    return 1 + Math.max(...children.map(calcDepth));
  }

  const hierarchies = [];

  for (const comp of components) {
    const compNodes = [...comp];
    const cyclic = hasCycle(comp);

    // Find root(s) for this component
    const compRoots = compNodes.filter(n => !(n in parentOf));

    if (cyclic) {
      // Use lex smallest as root if pure cycle (no natural root)
      const root = compRoots.length > 0
        ? compRoots.sort()[0]
        : compNodes.sort()[0];

      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
      });
    } else {
      for (const root of compRoots.sort()) {
        const depth = calcDepth(root);
        hierarchies.push({
          root,
          tree: buildNestedTree(root),
          depth,
        });
      }
    }
  }

  // Sort hierarchies: non-cyclic first (by root lex), then cyclic
  hierarchies.sort((a, b) => {
    if (a.has_cycle && !b.has_cycle) return 1;
    if (!a.has_cycle && b.has_cycle) return -1;
    return a.root.localeCompare(b.root);
  });

  // Summary
  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);

  let largestTreeRoot = '';
  if (nonCyclic.length > 0) {
    let maxDepth = -1;
    for (const h of nonCyclic) {
      if (h.depth > maxDepth || (h.depth === maxDepth && h.root < largestTreeRoot)) {
        maxDepth = h.depth;
        largestTreeRoot = h.root;
      }
    }
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: nonCyclic.length,
      total_cycles: cyclic.length,
      largest_tree_root: largestTreeRoot,
    },
  };
}

app.post('/bfhl', (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: '`data` must be an array of strings' });
  }

  const result = processData(data);
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
