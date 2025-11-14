## Introduction

In many real-world scenarios—like building roads, setting up communication cables, or connecting computers in a network—we often need to link together multiple locations in the most efficient way possible. This is where the concept of a **Minimum Spanning Tree (MST)** becomes essential.

A Minimum Spanning Tree is a mathematical structure used to connect all the points (called **nodes** or **vertices**) in a graph with the **minimum total connection cost**, using a subset of the available connections (called **edges**) and **without forming any loops**.

---

## Graph Basics

Before understanding MSTs, it's important to recall what a **graph** is:

- A **graph** consists of **nodes** (also called vertices) and **edges** (lines connecting the nodes).
- Each edge may have a **weight**, representing cost, distance, time, or any quantity we wish to minimize.

---

## What Is a Spanning Tree?

A **spanning tree** of a graph is:

- A subgraph that connects **all the nodes** together
- Contains **no cycles** (i.e., no loops)
- Uses **exactly (V - 1)** edges if there are **V** nodes
- Is still a **tree** — a connected, acyclic graph

There can be **multiple spanning trees** in a single graph.

---

## What Is a Minimum Spanning Tree?

A **Minimum Spanning Tree (MST)** is a spanning tree where the **sum of the edge weights is as small as possible**.

### Properties of an MST:
- It spans all vertices (i.e., includes all nodes)
- It has no cycles
- It has the **minimum total edge weight** among all spanning trees
- For a graph with **V** vertices, the MST has exactly **V - 1 edges**

---

## Why Are MSTs Useful?

MSTs are important in many fields:
- **Network design**: laying cables or pipelines with minimum cost
- **Transportation planning**: building roads or tracks between cities optimally
- **Clustering in data analysis**: forming groups based on distances or similarities
- **Circuit design**: connecting components with minimal wiring

They help optimize cost, time, or effort when full connectivity is required.

---

## How Do We Find MSTs?

There are several efficient algorithms to find the MST of a graph. Two of the most widely used are:

### 1. **Kruskal’s Algorithm**
- Sort all edges in increasing order of weight
- Add the smallest edge to the tree, unless it forms a cycle
- Repeat until the tree connects all vertices

Kruskal’s approach treats the graph as a collection of disconnected components and **joins them step by step**.

### 2. **Prim’s Algorithm**
- Start with any node
- Grow the tree by repeatedly adding the **smallest edge** that connects a new node
- Stop when all nodes are included

Prim’s algorithm builds the tree **incrementally from one node**, always choosing the nearest new connection.

Both are **greedy algorithms**, meaning they make the best local choice at each step in hopes of reaching the global optimum.

---

## Uniqueness of MSTs

- If all edge weights are **distinct**, then the MST is **unique**.
- If edge weights are **not unique**, there may be **multiple valid MSTs** with the same total cost.

---
