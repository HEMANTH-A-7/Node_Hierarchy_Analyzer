const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const USER_ID = 'Amarthi Hemanth Kumar_21032005';          
const EMAIL_ID = 'hemanthkumar_amarthi@srmap.edu.in';  
const COLLEGE_ROLL = 'AP23110010635';             

function isValidEntry(entry) {
  const trimmed = entry.trim();
  return /^[A-Z]->[A-Z]$/.test(trimmed);
}

function processData(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdges = new Set();
  const validEdges = [];

  for (const raw of data) {
    const entry = raw.trim();
    if (!isValidEntry(entry)) { invalidEntries.push(raw); continue; }
    const [parent, child] = entry.split('->');
    if (parent === child) { invalidEntries.push(raw); continue; }
    if (seenEdges.has(entry)) {
      if (!duplicateEdges.includes(entry)) duplicateEdges.push(entry);
    } else {
      seenEdges.add(entry);
      validEdges.push([parent, child]);
    }
  }

  const parentOf = {};
  const childrenOf = {};
  const allNodes = new Set();

  for (const [parent, child] of validEdges) {
    allNodes.add(parent); allNodes.add(child);
    if (!(parent in childrenOf)) childrenOf[parent] = [];
    if (!(child in childrenOf)) childrenOf[child] = [];
    if (child in parentOf) continue;
    parentOf[child] = parent;
    childrenOf[parent].push(child);
  }

  const visited = new Set();
  const components = [];

  function getComponent(start) {
    const component = new Set();
    const queue = [start];
    while (queue.length) {
      const node = queue.shift();
      if (component.has(node)) continue;
      component.add(node);
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

  function hasCycle(compNodes) {
    const color = {};
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
      if (color[node] === 0 && dfs(node)) return true;
    }
    return false;
  }

  function buildTree(node) {
    const obj = {};
    for (const child of (childrenOf[node] || [])) obj[child] = buildTree(child);
    return obj;
  }

  function calcDepth(node) {
    const children = childrenOf[node] || [];
    if (children.length === 0) return 1;
    return 1 + Math.max(...children.map(calcDepth));
  }

  const hierarchies = [];

  for (const comp of components) {
    const compNodes = [...comp];
    const cyclic = hasCycle(comp);
    const compRoots = compNodes.filter(n => !(n in parentOf));
    if (cyclic) {
      const root = compRoots.length > 0 ? compRoots.sort()[0] : compNodes.sort()[0];
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      for (const root of compRoots.sort()) {
        hierarchies.push({ root, tree: { [root]: buildTree(root) }, depth: calcDepth(root) });
      }
    }
  }

  hierarchies.sort((a, b) => {
    if (a.has_cycle && !b.has_cycle) return 1;
    if (!a.has_cycle && b.has_cycle) return -1;
    return a.root.localeCompare(b.root);
  });

  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);
  let largestTreeRoot = '';
  if (nonCyclic.length > 0) {
    let maxDepth = -1;
    for (const h of nonCyclic) {
      if (h.depth > maxDepth || (h.depth === maxDepth && h.root < largestTreeRoot)) {
        maxDepth = h.depth; largestTreeRoot = h.root;
      }
    }
  }

  return {
    user_id: USER_ID, email_id: EMAIL_ID, college_roll_number: COLLEGE_ROLL,
    hierarchies, invalid_entries: invalidEntries, duplicate_edges: duplicateEdges,
    summary: { total_trees: nonCyclic.length, total_cycles: cyclic.length, largest_tree_root: largestTreeRoot }
  };
}

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/bfhl', (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: '`data` must be an array of strings' });
  }
  res.json(processData(data));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
