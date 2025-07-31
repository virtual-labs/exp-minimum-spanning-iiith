class MSTVisualization {
    constructor() {
        this.canvas = document.getElementById('graphCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.vertexCount = 6;
        this.edgeDensity = 0.6;
        this.weightRange = { min: 1, max: 20 };
        this.vertices = [];
        this.edges = [];
        this.selectedEdges = []; // Edges selected for spanning tree
        this.edgeHistory = []; // For undo functionality
        this.currentMode = null; // 'manual', 'kruskal', 'prim'
        this.algorithmStep = 0;
        this.algorithmSteps = [];
        this.isAnimating = false;
        this.animationSpeed = 1000; // ms between steps
        this.totalWeight = 0;
        
        // Algorithm trace system
        this.algorithmTrace = [];
        this.traceVisible = false;
        
        // MST algorithm state
        this.unionFind = null;
        this.priorityQueue = [];
        this.visited = [];
        this.mstEdges = [];
        
        // Visual constants
        this.vertexRadius = 20;
        this.colors = {
            vertex: '#3b82f6',
            selectedVertex: '#ef4444',
            spanningEdge: '#22c55e',
            availableEdge: '#6b7280',
            invalidEdge: '#ef4444',
            mstEdge: '#10b981',
            background: '#ffffff',
            cycleHighlight: '#f59e0b'
        };
        
        this.setupCanvas();
        this.generateGraph();
        this.setupModeDropdown();
    }
    
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }
    
    setupModeDropdown() {
        const modeSelect = document.getElementById('modeSelect');
        if (modeSelect) {
            modeSelect.addEventListener('change', (e) => {
                const selectedMode = e.target.value;
                if (selectedMode) {
                    this.startMode(selectedMode);
                }
            });
        }
    }
    
    startMode(type) {
        this.resetTree();
        this.currentMode = type;
        
        switch(type) {
            case 'kruskal':
                this.startKruskalMode();
                break;
            case 'prim':
                this.startPrimMode();
                break;
        }
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerStyle = window.getComputedStyle(container);
        const containerWidth = container.clientWidth - 
            parseFloat(containerStyle.paddingLeft) - 
            parseFloat(containerStyle.paddingRight);
        
        // Use the full container height instead of limiting it
        const containerHeight = container.clientHeight - 
            parseFloat(containerStyle.paddingTop) - 
            parseFloat(containerStyle.paddingBottom);
        
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = containerHeight + 'px';
        
        const scale = window.devicePixelRatio || 1;
        this.canvas.width = containerWidth * scale;
        this.canvas.height = containerHeight * scale;
        
        this.ctx.scale(scale, scale);
        this.draw();
    }
    
    generateGraph() {
        this.vertices = [];
        this.edges = [];
        this.selectedEdges = [];
        this.edgeHistory = [];
        this.algorithmSteps = [];
        this.algorithmStep = 0;
        this.isAnimating = false;
        this.currentMode = null;
        this.totalWeight = 0;
        
        // Clear trace
        this.clearTrace();
        
        // Reset UI elements
        const modeSelect = document.getElementById('modeSelect');
        if (modeSelect) {
            modeSelect.value = '';
        }
        document.getElementById('modeQuestion').textContent = 'Select an algorithm to start!';
        document.getElementById('autoSolveBtn').disabled = true;
        document.getElementById('nextStepBtn').classList.add('hidden');
        document.getElementById('prevStepBtn').classList.add('hidden');
        document.getElementById('progressContainer').classList.add('hidden');
        this.hideFeedback();
        
        // Generate vertices in a circle for better visualization
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const radius = Math.min(centerX, centerY) * 0.85; // Increased from 0.7 to utilize more space
        
        for (let i = 0; i < this.vertexCount; i++) {
            const angle = (2 * Math.PI * i) / this.vertexCount - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            this.vertices.push({ x, y, id: i, label: String.fromCharCode(65 + i) });
        }
        
        // Generate edges based on density
        const maxEdges = (this.vertexCount * (this.vertexCount - 1)) / 2;
        const targetEdges = Math.floor(maxEdges * this.edgeDensity);
        
        // Ensure graph is connected by creating a spanning tree first
        this.ensureConnected();
        
        // Add random edges to reach target density
        while (this.edges.length < targetEdges) {
            const v1 = Math.floor(Math.random() * this.vertexCount);
            const v2 = Math.floor(Math.random() * this.vertexCount);
            
            if (v1 !== v2 && !this.hasEdge(v1, v2)) {
                this.addEdge(v1, v2);
            }
        }
        
        this.updateGraphInfo();
        this.draw();
    }
    
    ensureConnected() {
        // Create a minimum spanning tree to ensure connectivity
        for (let i = 1; i < this.vertexCount; i++) {
            this.addEdge(0, i);
        }
    }
    
    addEdge(v1, v2) {
        const weight = Math.floor(Math.random() * (this.weightRange.max - this.weightRange.min + 1)) + this.weightRange.min;
        this.edges.push({ v1, v2, weight, selected: false });
    }
    
    hasEdge(v1, v2) {
        return this.edges.some(edge => 
            (edge.v1 === v1 && edge.v2 === v2) || 
            (edge.v1 === v2 && edge.v2 === v1)
        );
    }
    
    handleCanvasClick(event) {
        if (!this.currentMode || this.isAnimating) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Find clicked edge
        const clickedEdge = this.findClickedEdge(x, y);
        if (clickedEdge) {
            this.handleInteractiveEdgeClick(clickedEdge);
        }
    }
    
    findClickedEdge(x, y) {
        for (let edge of this.edges) {
            const v1 = this.vertices[edge.v1];
            const v2 = this.vertices[edge.v2];
            
            // Calculate distance from point to line segment
            const distance = this.pointToLineDistance(x, y, v1.x, v1.y, v2.x, v2.y);
            if (distance <= 5) { // 5 pixel tolerance
                return edge;
            }
        }
        return null;
    }
    
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));
        
        const xx = x1 + param * C;
        const yy = y1 + param * D;
        
        const dx = px - xx;
        const dy = py - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    handleInteractiveEdgeClick(clickedEdge) {
        // Check if this is the correct edge according to the algorithm
        if (this.algorithmStep >= this.algorithmSteps.length) {
            this.showFeedback(false, 'Algorithm is already complete!');
            return;
        }
        
        const currentStep = this.algorithmSteps[this.algorithmStep];
        const correctEdge = currentStep.edge;
        
        // Check if clicked edge is the correct one
        if (this.isSameEdge(clickedEdge, correctEdge)) {
            // Correct edge clicked - provide educational affirmation
            let educationalMessage = '';
            let affirmation = '';
            
            if (this.currentMode === 'kruskal') {
                if (currentStep.action === 'accept') {
                    this.executeKruskalStep(currentStep);
                    this.algorithmStep++;
                    
                    // Educational affirmation for Kruskal's - more specific
                    const comp1Before = this.unionFind.find(correctEdge.v1);
                    const comp2Before = this.unionFind.find(correctEdge.v2);
                    
                    // Get the weight rank of this edge
                    const sortedEdges = [...this.edges].sort((a, b) => a.weight - b.weight);
                    const edgeRank = sortedEdges.findIndex(e => this.isSameEdge(e, correctEdge)) + 1;
                    const totalEdges = this.edges.length;
                    
                    educationalMessage = `Brilliant analysis! You correctly identified that edge ${this.getEdgeLabel(correctEdge)} (weight ${correctEdge.weight}) should be added. This edge ranks ${edgeRank} out of ${totalEdges} edges by weight, and most importantly, vertices ${this.vertices[correctEdge.v1].label} and ${this.vertices[correctEdge.v2].label} belong to different components (${comp1Before} ≠ ${comp2Before}), ensuring no cycle is formed.`;
                    affirmation = `You've mastered Kruskal's key insight: always process edges in weight order and use Union-Find to detect cycles!`;
                    
                    this.displayTrace({
                        type: 'user_correct',
                        message: `Correctly added edge ${this.getEdgeLabel(correctEdge)} (weight: ${correctEdge.weight})`,
                        details: `Your choice: Step ${currentStep.trace ? currentStep.trace.stepNumber : this.algorithmStep}: Kruskal's Algorithm`,
                        educational: educationalMessage,
                        result: affirmation
                    });
                    
                    this.showFeedback(true, `Correct! Added edge ${this.getEdgeLabel(correctEdge)} (weight: ${correctEdge.weight})`);
                } else {
                    // This edge would create a cycle
                    this.algorithmStep++;
                    
                    const comp1 = this.unionFind.find(correctEdge.v1);
                    const comp2 = this.unionFind.find(correctEdge.v2);
                    
                    educationalMessage = `Excellent cycle detection! You correctly recognized that adding edge ${this.getEdgeLabel(correctEdge)} (weight ${correctEdge.weight}) would create a cycle because vertices ${this.vertices[correctEdge.v1].label} and ${this.vertices[correctEdge.v2].label} are already in the same component (${comp1}). This shows deep understanding of how Union-Find tracks connectivity.`;
                    affirmation = `Perfect! You've demonstrated mastery of cycle detection in Kruskal's algorithm!`;
                    
                    this.displayTrace({
                        type: 'user_correct',
                        message: `Correctly rejected edge ${this.getEdgeLabel(correctEdge)} (would create cycle)`,
                        details: `Your choice: Step ${currentStep.trace ? currentStep.trace.stepNumber : this.algorithmStep}: Kruskal's Algorithm - Cycle Avoidance`,
                        educational: educationalMessage,
                        result: affirmation
                    });
                    
                    this.showFeedback(true, `Correct! Rejected edge ${this.getEdgeLabel(correctEdge)} (would create cycle)`);
                }
            } else if (this.currentMode === 'prim') {
                this.executePrimStep(currentStep);
                this.algorithmStep++;
                
                // Educational affirmation for Prim's - more specific and correct
                const newVertex = currentStep.newVertex;
                const mstVertices = [];
                for (let i = 0; i < this.visited.length; i++) {
                    if (this.visited[i] && i !== newVertex) { // Don't include the newly added vertex yet
                        mstVertices.push(this.vertices[i].label);
                    }
                }
                
                // Find what other options were available (edges from MST to unvisited vertices)
                const availableEdges = this.edges.filter(e => {
                    const v1InMST = this.visited[e.v1] && e.v1 !== newVertex;
                    const v2InMST = this.visited[e.v2] && e.v2 !== newVertex;
                    const v1IsNew = e.v1 === newVertex;
                    const v2IsNew = e.v2 === newVertex;
                    
                    // Edge must connect old MST to unvisited vertex (including the new one)
                    return (v1InMST && !this.visited[e.v2]) || (v2InMST && !this.visited[e.v1]) || 
                           (v1InMST && v2IsNew) || (v2InMST && v1IsNew);
                }).sort((a, b) => a.weight - b.weight);
                
                const alternatives = availableEdges.filter(e => !this.isSameEdge(e, correctEdge)).slice(0, 2).map(e => {
                    const target = this.visited[e.v1] && e.v1 !== newVertex ? e.v2 : e.v1;
                    return `${this.getEdgeLabel(e)}(${e.weight}) to ${this.vertices[target].label}`;
                });
                
                educationalMessage = `Outstanding choice! You applied Prim's greedy strategy perfectly. From current MST vertices {${mstVertices.join(', ')}}, edge ${this.getEdgeLabel(correctEdge)} (weight ${correctEdge.weight}) connecting to unvisited vertex ${this.vertices[newVertex].label} has the minimum weight among all options. ${alternatives.length > 0 ? `You correctly chose this over alternatives like ${alternatives.join(', ')}.` : 'This was the only available option.'}`;
                affirmation = `Perfect application of Prim's algorithm: always expand the tree with the cheapest connection to a new vertex!`;
                
                this.displayTrace({
                    type: 'user_correct',
                    message: `Correctly added edge ${this.getEdgeLabel(correctEdge)} (weight: ${correctEdge.weight})`,
                    details: `Your choice: Step ${currentStep.trace ? currentStep.trace.stepNumber : this.algorithmStep}: Prim's Algorithm - Added vertex ${this.vertices[newVertex].label}`,
                    educational: educationalMessage,
                    result: affirmation
                });
                
                this.showFeedback(true, `Correct! Added edge ${this.getEdgeLabel(correctEdge)} (weight: ${correctEdge.weight})`);
            }
            
            this.updateUI();
            this.draw();
            
            // Update the expected edge for visual hint
            this.highlightNextExpectedEdge();
            
            // Check if algorithm is complete
            if (this.algorithmStep >= this.algorithmSteps.length) {
                this.expectedEdge = null; // Clear highlighting
                setTimeout(() => {
                    this.showFeedback(true, `🎉 MST completed! Total weight: ${this.totalWeight}`);
                    
                    // Add completion trace
                    this.displayTrace({
                        type: 'algorithm_complete',
                        message: `🎉 Algorithm completed successfully!`,
                        details: `Total weight: ${this.totalWeight} | Edges: ${this.selectedEdges.length}/${this.vertexCount - 1}`,
                        educational: `Congratulations! You've successfully built a Minimum Spanning Tree using ${this.currentMode === 'kruskal' ? "Kruskal's" : "Prim's"} algorithm. The MST connects all vertices with the minimum possible total weight.`,
                        result: `You demonstrated mastery of ${this.currentMode === 'kruskal' ? "Kruskal's" : "Prim's"} algorithm!`
                    });
                    
                    // Create celebration effect on canvas
                    this.createCanvasCelebration();
                    
                    // Show congratulatory overlay
                    this.showCongratulationsOverlay();
                }, 1000);
            } else {
                // Show progress feedback for continuing
                const remaining = this.algorithmSteps.length - this.algorithmStep;
                this.showFeedback(true, `Great progress! ${remaining} edge${remaining > 1 ? 's' : ''} remaining to complete MST.`);
            }
        } else {
            // Wrong edge clicked - provide educational guidance
            const expectedEdge = this.getExpectedNextEdge();
            const expectedStep = this.algorithmSteps[this.algorithmStep];
            
            let wrongChoiceMessage = `Wrong edge! Expected: ${this.getEdgeLabel(expectedEdge)} (weight: ${expectedEdge.weight})`;
            let educationalGuidance = '';
            let detailedReason = '';
            
            if (this.currentMode === 'kruskal') {
                const sortedEdges = [...this.edges].sort((a, b) => a.weight - b.weight);
                const expectedRank = sortedEdges.findIndex(e => this.isSameEdge(e, expectedEdge)) + 1;
                const clickedRank = sortedEdges.findIndex(e => this.isSameEdge(e, clickedEdge)) + 1;
                
                if (expectedStep.action === 'accept') {
                    educationalGuidance = `In Kruskal's algorithm, we must process edges in strict weight order. Edge ${this.getEdgeLabel(expectedEdge)} (weight ${expectedEdge.weight}) is ranked ${expectedRank} while your choice ${this.getEdgeLabel(clickedEdge)} is ranked ${clickedRank}. The expected edge connects different components and won't create a cycle.`;
                    detailedReason = `Focus on weight ordering: always consider the lightest remaining edge first!`;
                } else {
                    educationalGuidance = `You chose ${this.getEdgeLabel(clickedEdge)}, but we must process edges in weight order. Edge ${this.getEdgeLabel(expectedEdge)} (weight ${expectedEdge.weight}, rank ${expectedRank}) should be considered next, but it must be rejected because it would create a cycle.`;
                    detailedReason = `Remember: even if an edge would be rejected, Kruskal's still considers it in weight order!`;
                }
            } else if (this.currentMode === 'prim') {
                const newVertex = expectedStep.newVertex;
                const mstVertices = this.visited.map((visited, i) => visited ? this.vertices[i].label : null).filter(v => v !== null);
                
                // Check if clicked edge connects to MST
                const clickedConnectsToMST = (this.visited[clickedEdge.v1] && !this.visited[clickedEdge.v2]) || 
                                           (!this.visited[clickedEdge.v1] && this.visited[clickedEdge.v2]);
                
                if (!clickedConnectsToMST) {
                    educationalGuidance = `Your choice ${this.getEdgeLabel(clickedEdge)} doesn't connect the current MST {${mstVertices.join(', ')}} to an unvisited vertex. Prim's algorithm can only add edges that extend the tree to new vertices.`;
                    detailedReason = `Key rule: each new edge must connect a vertex in the MST to a vertex outside the MST!`;
                } else {
                    educationalGuidance = `While ${this.getEdgeLabel(clickedEdge)} (weight ${clickedEdge.weight}) does connect the MST to an unvisited vertex, ${this.getEdgeLabel(expectedEdge)} (weight ${expectedEdge.weight}) to vertex ${this.vertices[newVertex].label} has lower weight. Prim's algorithm always chooses the minimum weight option.`;
                    detailedReason = `Greedy choice: among all valid edges, always pick the one with minimum weight!`;
                }
            }
            
            this.displayTrace({
                type: 'user_wrong',
                message: `Incorrect choice: ${this.getEdgeLabel(clickedEdge)} (weight: ${clickedEdge.weight})`,
                details: `Expected: ${this.getEdgeLabel(expectedEdge)} (weight: ${expectedEdge.weight})`,
                educational: educationalGuidance,
                result: detailedReason
            });
            
            if (expectedStep.trace && expectedStep.trace.reason) {
                wrongChoiceMessage += `\n\nHint: ${expectedStep.trace.reason}`;
            }
            
            this.showFeedback(false, wrongChoiceMessage);
        }
        
        // Auto-hide feedback after 3 seconds
        setTimeout(() => {
            this.hideFeedback();
        }, 3000);
    }
    
    isSameEdge(edge1, edge2) {
        return (edge1.v1 === edge2.v1 && edge1.v2 === edge2.v2) ||
               (edge1.v1 === edge2.v2 && edge1.v2 === edge2.v1);
    }
    
    getEdgeLabel(edge) {
        const v1Label = this.vertices[edge.v1].label;
        const v2Label = this.vertices[edge.v2].label;
        return `${v1Label}-${v2Label}`;
    }
    
    getExpectedNextEdge() {
        if (this.algorithmStep < this.algorithmSteps.length) {
            return this.algorithmSteps[this.algorithmStep].edge;
        }
        return null;
    }
    
    startKruskalMode() {
        this.currentMode = 'kruskal';
        this.algorithmStep = 0;
        this.prepareKruskalAlgorithm();
        this.clearTrace();
        
        // Display initial trace for user
        this.displayTrace({
            type: 'algorithm_start',
            message: `Started Kruskal's Algorithm`,
            details: `Graph: ${this.vertexCount} vertices, ${this.edges.length} edges`,
            educational: `Kruskal's algorithm builds the MST by considering edges in order of increasing weight and adding them if they don't create cycles. Use the Union-Find data structure to detect cycles.`,
            result: `Click on edges in weight order, skipping those that would create cycles!`
        });
        
        document.getElementById('modeQuestion').textContent = 
            "Kruskal's Algorithm: Click on the edges in order of increasing weight. Skip edges that would create cycles.";
        document.getElementById('autoSolveBtn').disabled = false;
        document.getElementById('nextStepBtn').classList.add('hidden');
        document.getElementById('prevStepBtn').classList.add('hidden');
        this.hideFeedback();
        this.highlightNextExpectedEdge();
        this.draw();
    }
    
    startPrimMode() {
        this.currentMode = 'prim';
        this.algorithmStep = 0;
        this.preparePrimAlgorithm();
        this.clearTrace();
        
        // Display initial trace for user
        this.displayTrace({
            type: 'algorithm_start',
            message: `Started Prim's Algorithm from vertex ${this.vertices[0].label}`,
            details: `Graph: ${this.vertexCount} vertices, ${this.edges.length} edges`,
            educational: `Prim's algorithm grows the MST from a starting vertex by always adding the minimum weight edge that connects the current tree to an unvisited vertex.`,
            result: `Click on the minimum weight edges connecting to unvisited vertices!`
        });
        
        document.getElementById('modeQuestion').textContent = 
            "Prim's Algorithm: Start from vertex A. Click on the minimum weight edge connecting to unvisited vertices.";
        document.getElementById('autoSolveBtn').disabled = false;
        document.getElementById('nextStepBtn').classList.add('hidden');
        document.getElementById('prevStepBtn').classList.add('hidden');
        this.hideFeedback();
        
        // Highlight starting vertex (vertex 0 = A)
        this.highlightStartingVertex();
        this.highlightNextExpectedEdge();
        this.draw();
    }
    
    prepareKruskalAlgorithm() {
        // Sort edges by weight
        const sortedEdges = [...this.edges].sort((a, b) => a.weight - b.weight);
        this.unionFind = new UnionFind(this.vertexCount);
        this.algorithmSteps = [];
        this.algorithmTrace = [];
        
        // Add initial trace
        this.algorithmTrace.push({
            type: 'initialization',
            message: `Kruskal's Algorithm started with ${this.vertexCount} vertices and ${this.edges.length} edges.`,
            details: `Sorted edges by weight: ${sortedEdges.map(e => `${this.getEdgeLabel(e)}(${e.weight})`).join(', ')}`
        });
        
        let edgeIndex = 0;
        for (let edge of sortedEdges) {
            edgeIndex++;
            const vertex1Component = this.unionFind.find(edge.v1);
            const vertex2Component = this.unionFind.find(edge.v2);
            const wouldCreateCycle = vertex1Component === vertex2Component;
            
            let traceEntry = {
                type: 'consider',
                edge: edge,
                stepNumber: edgeIndex,
                message: `Step ${edgeIndex}: Considering edge ${this.getEdgeLabel(edge)} with weight ${edge.weight}`,
                details: `Checking if vertices ${this.vertices[edge.v1].label} and ${this.vertices[edge.v2].label} are in same component...`
            };
            
            if (wouldCreateCycle) {
                traceEntry.action = 'reject';
                traceEntry.reason = `Both vertices are already connected (components: ${vertex1Component} = ${vertex2Component}). Adding this edge would create a cycle.`;
                traceEntry.result = `❌ REJECTED - Edge ${this.getEdgeLabel(edge)} skipped to avoid cycle.`;
            } else {
                traceEntry.action = 'accept';
                traceEntry.reason = `Vertices are in different components (${this.vertices[edge.v1].label} in component ${vertex1Component}, ${this.vertices[edge.v2].label} in component ${vertex2Component}). Safe to add.`;
                traceEntry.result = `✅ ACCEPTED - Edge ${this.getEdgeLabel(edge)} added to MST.`;
                this.unionFind.union(edge.v1, edge.v2);
            }
            
            this.algorithmSteps.push({
                type: 'consider',
                edge: edge,
                action: traceEntry.action,
                trace: traceEntry
            });
            
            this.algorithmTrace.push(traceEntry);
        }
        
        // Reset for step-by-step execution
        this.unionFind = new UnionFind(this.vertexCount);
        this.mstEdges = [];
    }
    
    preparePrimAlgorithm() {
        this.visited = new Array(this.vertexCount).fill(false);
        this.priorityQueue = [];
        this.algorithmSteps = [];
        this.algorithmTrace = [];
        this.mstEdges = [];
        
        // Start from vertex 0
        this.visited[0] = true;
        
        // Add initial trace
        this.algorithmTrace.push({
            type: 'initialization',
            message: `Prim's Algorithm started from vertex ${this.vertices[0].label}.`,
            details: `Marked vertex ${this.vertices[0].label} as visited. Looking for edges connecting to unvisited vertices.`
        });
        
        // Add all edges from vertex 0 to priority queue
        let initialEdges = [];
        for (let edge of this.edges) {
            if (edge.v1 === 0 || edge.v2 === 0) {
                this.priorityQueue.push(edge);
                const otherVertex = edge.v1 === 0 ? edge.v2 : edge.v1;
                initialEdges.push(`${this.getEdgeLabel(edge)}(${edge.weight}) to ${this.vertices[otherVertex].label}`);
            }
        }
        
        this.algorithmTrace.push({
            type: 'queue_update',
            message: `Added edges from vertex ${this.vertices[0].label} to priority queue.`,
            details: `Available edges: ${initialEdges.join(', ')}`
        });
        
        // Sort by weight
        this.priorityQueue.sort((a, b) => a.weight - b.weight);
        
        // Generate steps
        this.generatePrimSteps();
    }
    
    generatePrimSteps() {
        const tempVisited = new Array(this.vertexCount).fill(false);
        const tempQueue = [];
        tempVisited[0] = true;
        let stepNumber = 0;
        
        // Add initial edges
        for (let edge of this.edges) {
            if (edge.v1 === 0 || edge.v2 === 0) {
                tempQueue.push(edge);
            }
        }
        tempQueue.sort((a, b) => a.weight - b.weight);
        
        while (tempQueue.length > 0 && this.algorithmSteps.length < this.vertexCount - 1) {
            stepNumber++;
            
            // Find the minimum weight edge to an unvisited vertex
            let selectedEdge = null;
            let selectedIndex = -1;
            
            for (let i = 0; i < tempQueue.length; i++) {
                const edge = tempQueue[i];
                const newVertex = tempVisited[edge.v1] ? edge.v2 : edge.v1;
                
                if (!tempVisited[newVertex]) {
                    selectedEdge = edge;
                    selectedIndex = i;
                    break; // Queue is sorted, so first valid edge is minimum
                }
            }
            
            if (!selectedEdge) break;
            
            const newVertex = tempVisited[selectedEdge.v1] ? selectedEdge.v2 : selectedEdge.v1;
            const fromVertex = tempVisited[selectedEdge.v1] ? selectedEdge.v1 : selectedEdge.v2;
            
            // Create detailed trace
            const availableEdges = tempQueue
                .filter(e => {
                    const target = tempVisited[e.v1] ? e.v2 : e.v1;
                    return !tempVisited[target];
                })
                .slice(0, 5) // Show first 5 for brevity
                .map(e => {
                    const target = tempVisited[e.v1] ? e.v2 : e.v1;
                    return `${this.getEdgeLabel(e)}(${e.weight}) to ${this.vertices[target].label}`;
                });
            
            let traceEntry = {
                type: 'step',
                edge: selectedEdge,
                stepNumber: stepNumber,
                newVertex: newVertex,
                fromVertex: fromVertex,
                message: `Step ${stepNumber}: Selecting minimum weight edge from MST to unvisited vertex`,
                details: `Available edges: ${availableEdges.join(', ')}${tempQueue.length > 5 ? '...' : ''}`,
                reason: `Edge ${this.getEdgeLabel(selectedEdge)} has minimum weight (${selectedEdge.weight}) among edges connecting MST to unvisited vertices.`,
                result: `✅ Added edge ${this.getEdgeLabel(selectedEdge)} and vertex ${this.vertices[newVertex].label} to MST.`
            };
            
            this.algorithmSteps.push({
                type: 'add',
                edge: selectedEdge,
                newVertex: newVertex,
                trace: traceEntry
            });
            
            this.algorithmTrace.push(traceEntry);
            
            tempVisited[newVertex] = true;
            
            // Remove selected edge and update queue
            tempQueue.splice(selectedIndex, 1);
            
            // Add new edges to queue
            let newEdges = [];
            for (let e of this.edges) {
                if ((e.v1 === newVertex && !tempVisited[e.v2]) || 
                    (e.v2 === newVertex && !tempVisited[e.v1])) {
                    tempQueue.push(e);
                    const target = e.v1 === newVertex ? e.v2 : e.v1;
                    newEdges.push(`${this.getEdgeLabel(e)}(${e.weight}) to ${this.vertices[target].label}`);
                }
            }
            
            if (newEdges.length > 0) {
                this.algorithmTrace.push({
                    type: 'queue_update',
                    message: `Added new edges from vertex ${this.vertices[newVertex].label} to priority queue.`,
                    details: `New edges: ${newEdges.join(', ')}`
                });
            }
            
            tempQueue.sort((a, b) => a.weight - b.weight);
        }
    }
    
    executeAlgorithmStep() {
        if (this.algorithmStep >= this.algorithmSteps.length) return;
        
        const step = this.algorithmSteps[this.algorithmStep];
        
        // Execute the step
        if (this.currentMode === 'kruskal') {
            this.executeKruskalStep(step);
        } else if (this.currentMode === 'prim') {
            this.executePrimStep(step);
        }
        
        // Display trace for auto-solve steps with detailed explanations
        this.displayAutoSolveTrace(step);
        
        this.algorithmStep++;
        this.updateUI();
        this.draw();
        
        if (this.algorithmStep >= this.algorithmSteps.length) {
            this.showFeedback(true, `MST completed! Total weight: ${this.totalWeight}`);
            document.getElementById('nextStepBtn').disabled = true;
            
            // Add completion trace
            this.displayTrace({
                type: 'algorithm_complete',
                message: `🎉 Auto-solve completed successfully!`,
                details: `Total weight: ${this.totalWeight} | Edges: ${this.selectedEdges.length}/${this.vertexCount - 1}`,
                educational: `The algorithm found the optimal Minimum Spanning Tree! ${this.currentMode === 'kruskal' ? "Kruskal's algorithm processed all edges in weight order, using Union-Find to detect cycles." : "Prim's algorithm grew the tree from vertex A, always choosing the minimum weight edge to unvisited vertices."}`,
                result: `Optimal MST achieved with ${this.currentMode === 'kruskal' ? "Kruskal's" : "Prim's"} algorithm!`
            });
            
            // Create celebration effect on canvas
            setTimeout(() => this.createCanvasCelebration(), 500);
            
            // Show congratulatory overlay
            setTimeout(() => this.showCongratulationsOverlay(), 1000);
        } else {
            document.getElementById('nextStepBtn').disabled = false;
        }
        
        // Update Previous Step button
        document.getElementById('prevStepBtn').disabled = this.algorithmStep <= 0;
    }
    
    executeKruskalStep(step) {
        const edge = step.edge;
        
        if (step.action === 'accept') {
            if (this.unionFind.find(edge.v1) !== this.unionFind.find(edge.v2)) {
                this.unionFind.union(edge.v1, edge.v2);
                edge.selected = true;
                this.selectedEdges.push(edge);
                this.mstEdges.push(edge);
                this.totalWeight += edge.weight;
            }
        }
    }
    
    executePrimStep(step) {
        const edge = step.edge;
        edge.selected = true;
        this.selectedEdges.push(edge);
        this.mstEdges.push(edge);
        this.totalWeight += edge.weight;
        this.visited[step.newVertex] = true;
    }
    
    startAutoSolve() {
        // Reset everything and show step buttons
        this.resetTree();
        this.algorithmStep = 0;
        
        // Show initial auto-solve trace
        const sortedEdges = [...this.edges].sort((a, b) => a.weight - b.weight);
        const edgeList = sortedEdges.slice(0, 5).map(e => `${this.getEdgeLabel(e)}(${e.weight})`).join(', ');
        
        this.displayTrace({
            type: 'algorithm_start',
            message: `🤖 Auto-solve mode started for ${this.currentMode === 'kruskal' ? "Kruskal's" : "Prim's"} Algorithm`,
            details: `Graph: ${this.vertexCount} vertices, ${this.edges.length} edges | Mode: Step-by-step demonstration`,
            educational: `Watch how ${this.currentMode === 'kruskal' ? "Kruskal's algorithm processes edges in weight order (lightest first): " + edgeList + "..." : "Prim's algorithm grows the MST from vertex " + this.vertices[0].label + ", always choosing minimum weight edges to unvisited vertices."}`,
            result: `Use Next/Previous Step buttons to see each decision explained!`
        });
        
        // Hide Auto Solve button and show step buttons
        document.getElementById('autoSolveBtn').classList.add('hidden');
        document.getElementById('nextStepBtn').classList.remove('hidden');
        document.getElementById('prevStepBtn').classList.remove('hidden');
        
        // Enable/disable appropriate buttons
        document.getElementById('nextStepBtn').disabled = false;
        document.getElementById('prevStepBtn').disabled = true;
        
        document.getElementById('modeQuestion').textContent = 
            'Use Next Step and Previous Step to navigate through the algorithm.';
        
        this.draw();
    }
    
    executeNextStep() {
        if (this.algorithmStep >= this.algorithmSteps.length) return;
        
        this.executeAlgorithmStep();
    }
    
    executePrevStep() {
        if (this.algorithmStep <= 0) return;
        
        // Go back one step
        this.algorithmStep--;
        
        // Rebuild the state up to current step
        this.rebuildStateToStep(this.algorithmStep);
        
        this.updateUI();
        this.draw();
    }
    
    highlightNextExpectedEdge() {
        // This will be used to visually hint at the next expected edge
        this.expectedEdge = this.getExpectedNextEdge();
    }
    
    highlightStartingVertex() {
        // Mark vertex 0 as visited for Prim's algorithm
        if (this.currentMode === 'prim') {
            this.visited = new Array(this.vertexCount).fill(false);
            this.visited[0] = true;
        }
    }
    
    rebuildStateToStep(targetStep) {
        // Reset the tree
        for (let edge of this.edges) {
            edge.selected = false;
        }
        this.selectedEdges = [];
        this.totalWeight = 0;
        
        // Rebuild algorithm state
        if (this.currentMode === 'kruskal') {
            this.unionFind = new UnionFind(this.vertexCount);
        } else if (this.currentMode === 'prim') {
            this.visited = new Array(this.vertexCount).fill(false);
            this.visited[0] = true; // Start from vertex 0
        }
        
        // Execute steps up to target
        for (let i = 0; i < targetStep; i++) {
            const step = this.algorithmSteps[i];
            
            if (this.currentMode === 'kruskal') {
                this.executeKruskalStep(step);
            } else if (this.currentMode === 'prim') {
                this.executePrimStep(step);
            }
        }
        
        // Update button states
        document.getElementById('nextStepBtn').disabled = targetStep >= this.algorithmSteps.length;
        document.getElementById('prevStepBtn').disabled = targetStep <= 0;
    }
    
    checkSpanningTree() {
        const feedback = this.validateSpanningTree();
        this.showFeedback(feedback.isValid, feedback.message);
        
        if (!feedback.isValid) {
            setTimeout(() => this.hideFeedback(), 3000);
        }
    }
    
    validateSpanningTree() {
        // Check if we have n-1 edges
        if (this.selectedEdges.length !== this.vertexCount - 1) {
            return {
                isValid: false,
                message: `A spanning tree needs exactly ${this.vertexCount - 1} edges. You have ${this.selectedEdges.length}.`
            };
        }
        
        // Check if graph is connected using selected edges
        const uf = new UnionFind(this.vertexCount);
        for (let edge of this.selectedEdges) {
            uf.union(edge.v1, edge.v2);
        }
        
        const root = uf.find(0);
        for (let i = 1; i < this.vertexCount; i++) {
            if (uf.find(i) !== root) {
                return {
                    isValid: false,
                    message: 'Graph is not connected. Some vertices are isolated.'
                };
            }
        }
        
        return {
            isValid: true,
            message: `Perfect! Valid spanning tree with weight: ${this.totalWeight}`
        };
    }
    
    calculateOptimalMST() {
        // Use Kruskal's algorithm to find optimal MST weight
        const sortedEdges = [...this.edges].sort((a, b) => a.weight - b.weight);
        const uf = new UnionFind(this.vertexCount);
        let weight = 0;
        
        for (let edge of sortedEdges) {
            if (uf.find(edge.v1) !== uf.find(edge.v2)) {
                uf.union(edge.v1, edge.v2);
                weight += edge.weight;
            }
        }
        
        return weight;
    }
    
    resetTree() {
        for (let edge of this.edges) {
            edge.selected = false;
        }
        this.selectedEdges = [];
        this.edgeHistory = [];
        this.totalWeight = 0;
        this.algorithmStep = 0;
        this.algorithmSteps = [];
        this.isAnimating = false;
        this.mstEdges = [];
        
        // Clear trace
        this.clearTrace();
        
        // Reset button states based on current mode
        if (this.currentMode === 'kruskal' || this.currentMode === 'prim') {
            document.getElementById('autoSolveBtn').classList.remove('hidden');
            document.getElementById('nextStepBtn').classList.add('hidden');
            document.getElementById('prevStepBtn').classList.add('hidden');
            document.getElementById('autoSolveBtn').disabled = false;
            
            // Reset algorithm state and restart interactivity
            this.algorithmStep = 0;
            if (this.currentMode === 'kruskal') {
                this.prepareKruskalAlgorithm();
            } else if (this.currentMode === 'prim') {
                this.preparePrimAlgorithm();
                this.highlightStartingVertex();
            }
            
            // Only show trace if user is in interactive mode, not auto-solve
            if (!document.getElementById('nextStepBtn').classList.contains('hidden')) {
                // We're in auto-solve mode, don't show traces
            } else {
                // We're in interactive mode, show initial trace
                if (this.currentMode === 'kruskal') {
                    this.displayTrace({
                        type: 'algorithm_start',
                        message: `Restarted Kruskal's Algorithm`,
                        details: `Graph: ${this.vertexCount} vertices, ${this.edges.length} edges`,
                        educational: `Ready to practice Kruskal's algorithm again! Remember to process edges in weight order.`,
                        result: `Click on edges in weight order, skipping those that would create cycles!`
                    });
                } else if (this.currentMode === 'prim') {
                    this.displayTrace({
                        type: 'algorithm_start',
                        message: `Restarted Prim's Algorithm from vertex ${this.vertices[0].label}`,
                        details: `Graph: ${this.vertexCount} vertices, ${this.edges.length} edges`,
                        educational: `Ready to practice Prim's algorithm again! Always choose the minimum weight edge to unvisited vertices.`,
                        result: `Click on the minimum weight edges connecting to unvisited vertices!`
                    });
                }
            }
            
            this.highlightNextExpectedEdge();
        }
        
        this.updateUI();
        this.hideFeedback();
        this.draw();
    }
    
    draw() {
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw edges
        this.drawEdges();
        
        // Draw vertices
        this.drawVertices();
        
        // Draw mode indicator
        this.drawModeIndicator();
    }
    
    drawEdges() {
        for (let edge of this.edges) {
            const v1 = this.vertices[edge.v1];
            const v2 = this.vertices[edge.v2];
            
            // Determine edge color and width
            let strokeStyle = this.colors.availableEdge;
            let lineWidth = 2;
            
            if (edge.selected) {
                strokeStyle = this.colors.spanningEdge;
                lineWidth = 3;
            } else if (this.expectedEdge && this.isSameEdge(edge, this.expectedEdge)) {
                // Highlight the next expected edge
                strokeStyle = this.colors.cycleHighlight;
                lineWidth = 3;
            }
            
            this.ctx.strokeStyle = strokeStyle;
            this.ctx.lineWidth = lineWidth;
            
            // Draw edge
            this.ctx.beginPath();
            this.ctx.moveTo(v1.x, v1.y);
            this.ctx.lineTo(v2.x, v2.y);
            this.ctx.stroke();
            
            // Add pulsing effect for expected edge
            if (this.expectedEdge && this.isSameEdge(edge, this.expectedEdge)) {
                this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
                this.ctx.lineWidth = 5;
                this.ctx.beginPath();
                this.ctx.moveTo(v1.x, v1.y);
                this.ctx.lineTo(v2.x, v2.y);
                this.ctx.stroke();
            }
            
            // Calculate optimal weight label position (avoiding intersections)
            const labelPos = this.calculateOptimalWeightPosition(edge, v1, v2);
            
            // Draw weight with enhanced styling
            this.drawWeightLabel(edge, labelPos.x, labelPos.y);
        }
    }
    
    calculateOptimalWeightPosition(currentEdge, v1, v2) {
        // Calculate edge direction and perpendicular vectors
        const edgeLength = Math.sqrt((v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2);
        const dirX = (v2.x - v1.x) / edgeLength;
        const dirY = (v2.y - v1.y) / edgeLength;
        const perpX = -dirY;
        const perpY = dirX;
        
        // Start with positions along the edge (staying ON the line)
        const candidatePositions = [
            0.5,  // midpoint (default)
            0.4, 0.6,  // slightly off-center
            0.35, 0.65, // more off-center
            0.3, 0.7,   // even more off-center
            0.25, 0.75  // near the ends but not too close
        ];
        
        // Test each position along the edge
        for (let t of candidatePositions) {
            const baseX = v1.x + (v2.x - v1.x) * t;
            const baseY = v1.y + (v2.y - v1.y) * t;
            
            // First try the position directly on the line
            if (this.isPositionClearOfConflicts(baseX, baseY, currentEdge)) {
                return { x: baseX, y: baseY };
            }
            
            // If on-line position has conflicts, try small perpendicular offsets
            const smallOffsets = [8, 12, 16]; // Very small offsets to stay close to the line
            
            for (let offset of smallOffsets) {
                for (let side of [1, -1]) {
                    const testX = baseX + perpX * offset * side;
                    const testY = baseY + perpY * offset * side;
                    
                    if (this.isPositionClearOfConflicts(testX, testY, currentEdge)) {
                        return { x: testX, y: testY };
                    }
                }
            }
        }
        
        // Fallback: use midpoint (even if there might be slight overlap)
        const midX = (v1.x + v2.x) / 2;
        const midY = (v1.y + v2.y) / 2;
        return { x: midX, y: midY };
    }
    
    findNearbyEdgeConflicts(currentEdge, x, y) {
        const conflicts = [];
        const conflictRadius = 30; // Distance threshold for conflicts
        
        for (let otherEdge of this.edges) {
            if (otherEdge === currentEdge) continue;
            
            const otherV1 = this.vertices[otherEdge.v1];
            const otherV2 = this.vertices[otherEdge.v2];
            
            // Check if edges intersect or pass close to the point
            const distanceToOtherEdge = this.pointToLineDistance(x, y, otherV1.x, otherV1.y, otherV2.x, otherV2.y);
            
            if (distanceToOtherEdge < conflictRadius) {
                conflicts.push({
                    edge: otherEdge,
                    distance: distanceToOtherEdge,
                    midpoint: {
                        x: (otherV1.x + otherV2.x) / 2,
                        y: (otherV1.y + otherV2.y) / 2
                    }
                });
            }
        }
        
        return conflicts;
    }
    
    isPositionClearOfConflicts(x, y, currentEdge) {
        const clearanceRadius = 15; // Reduced clearance for less aggressive spacing
        
        // Check distance from vertices (but allow closer positioning)
        for (let vertex of this.vertices) {
            const distanceToVertex = Math.sqrt((x - vertex.x) ** 2 + (y - vertex.y) ** 2);
            if (distanceToVertex < this.vertexRadius + 8) { // Reduced vertex clearance
                return false;
            }
        }
        
        // Check distance from other edges (more lenient)
        for (let otherEdge of this.edges) {
            if (otherEdge === currentEdge) continue;
            
            const otherV1 = this.vertices[otherEdge.v1];
            const otherV2 = this.vertices[otherEdge.v2];
            const distanceToEdge = this.pointToLineDistance(x, y, otherV1.x, otherV1.y, otherV2.x, otherV2.y);
            
            // Only avoid very close proximity to other edges
            if (distanceToEdge < 12) {
                return false;
            }
        }
        
        // Check canvas boundaries with smaller margin
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        const margin = 20; // Reduced margin
        
        if (x < margin || x > canvasWidth - margin || y < margin || y > canvasHeight - margin) {
            return false;
        }
        
        return true;
    }
    
    drawWeightLabel(edge, x, y) {
        const weight = edge.weight;
        
        // Determine label styling based on edge state
        let bgColor = 'white';
        let borderColor = '#374151';
        let textColor = '#374151';
        let radius = 16; // Increased base radius for less compact appearance
        
        if (edge.selected) {
            bgColor = '#dcfce7'; // Light green background for selected edges
            borderColor = '#16a34a';
            textColor = '#15803d';
            radius = 18; // Larger for selected edges
        } else if (this.expectedEdge && this.isSameEdge(edge, this.expectedEdge)) {
            bgColor = '#fef3c7'; // Light yellow background for expected edge
            borderColor = '#f59e0b';
            textColor = '#d97706';
            radius = 18; // Larger for expected edge
        }
        
        // Draw shadow for depth (slightly more pronounced)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.beginPath();
        this.ctx.arc(x + 3, y + 3, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw main weight circle
        this.ctx.fillStyle = bgColor;
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 2.5; // Slightly thicker border
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Weight text (larger and more readable)
        this.ctx.fillStyle = textColor;
        this.ctx.font = 'bold 14px Poppins'; // Increased font size
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(weight.toString(), x, y);
    }
    
    drawVertices() {
        for (let vertex of this.vertices) {
            let fillColor = this.colors.vertex;
            
            // Highlight visited vertices in Prim's algorithm
            if (this.currentMode === 'prim' && this.visited && this.visited[vertex.id]) {
                fillColor = this.colors.spanningEdge;
            }
            
            // Draw vertex shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.beginPath();
            this.ctx.arc(vertex.x + 2, vertex.y + 2, this.vertexRadius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw vertex
            this.ctx.fillStyle = fillColor;
            this.ctx.beginPath();
            this.ctx.arc(vertex.x, vertex.y, this.vertexRadius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#374151';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw vertex label
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 14px Poppins';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(vertex.label, vertex.x, vertex.y);
        }
    }
    
    drawModeIndicator() {
        if (!this.currentMode) return;
        
        const modeNames = {
            'kruskal': "Kruskal's Algorithm (Interactive)",
            'prim': "Prim's Algorithm (Interactive)"
        };
        
        const modeColors = {
            'kruskal': '#3b82f6',
            'prim': '#8b5cf6'
        };
        
        this.ctx.fillStyle = modeColors[this.currentMode];
        this.ctx.font = 'bold 16px Poppins';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`Mode: ${modeNames[this.currentMode]}`, 10, 10);
        
        // Show total weight
        this.ctx.fillStyle = '#374151';
        this.ctx.fillText(`Total Weight: ${this.totalWeight}`, 10, 35);
    }
    
    updateUI() {
        // Update UI elements
        this.updateGraphInfo();
        this.updateProgressBar();
    }
    
    updateProgressBar() {
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (this.currentMode && this.algorithmSteps.length > 0) {
            progressContainer.classList.remove('hidden');
            
            const completed = this.algorithmStep;
            const total = this.algorithmSteps.length;
            const percentage = (completed / total) * 100;
            
            progressBar.style.width = percentage + '%';
            progressText.textContent = `${completed} / ${total} steps completed`;
            
            // Change color based on progress
            if (percentage >= 100) {
                progressBar.className = 'bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300';
            } else if (percentage >= 75) {
                progressBar.className = 'bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300';
            } else if (percentage >= 50) {
                progressBar.className = 'bg-gradient-to-r from-yellow-500 to-blue-500 h-2 rounded-full transition-all duration-300';
            } else {
                progressBar.className = 'bg-gradient-to-r from-red-500 to-yellow-500 h-2 rounded-full transition-all duration-300';
            }
        } else {
            progressContainer.classList.add('hidden');
        }
    }
    
    showFeedback(isCorrect, message) {
        const feedbackElement = document.getElementById('feedback');
        feedbackElement.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'text-green-800', 'text-red-800');
        
        if (isCorrect) {
            feedbackElement.classList.add('bg-green-100', 'text-green-800');
            // Play success sound effect (simple beep using Web Audio API)
            this.playSuccessSound();
        } else {
            feedbackElement.classList.add('bg-red-100', 'text-red-800');
            // Play error sound
            this.playErrorSound();
        }
        
        feedbackElement.textContent = message;
        
        // Add slide-in animation
        feedbackElement.style.transform = 'translateY(-10px)';
        feedbackElement.style.opacity = '0';
        setTimeout(() => {
            feedbackElement.style.transition = 'all 0.3s ease-out';
            feedbackElement.style.transform = 'translateY(0)';
            feedbackElement.style.opacity = '1';
        }, 10);
    }
    
    playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Fallback for browsers that don't support Web Audio API
            console.log('Success!');
        }
    }
    
    playErrorSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
            oscillator.frequency.setValueAtTime(196, audioContext.currentTime + 0.1); // G3
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            // Fallback for browsers that don't support Web Audio API
            console.log('Error!');
        }
    }
    
    playCelebrationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const times = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
            const frequencies = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
            
            times.forEach((time, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequencies[index], audioContext.currentTime + time);
                gainNode.gain.setValueAtTime(0.15, audioContext.currentTime + time);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + time + 0.15);
                
                oscillator.start(audioContext.currentTime + time);
                oscillator.stop(audioContext.currentTime + time + 0.15);
            });
        } catch (e) {
            // Fallback for browsers that don't support Web Audio API
            console.log('🎉 Celebration!');
        }
    }
    
    hideFeedback() {
        const feedbackElement = document.getElementById('feedback');
        feedbackElement.classList.add('hidden');
    }
    
    displayTrace(traceEntry) {
        const traceContainer = document.getElementById('algorithmTrace');
        const traceContent = document.getElementById('traceContent');
        
        if (!traceContainer || !traceContent) return;
        
        // Clear the placeholder text if it exists
        const placeholder = traceContent.querySelector('.text-slate-500.italic');
        if (placeholder) {
            placeholder.remove();
        }
        
        // Create trace element
        const traceElement = document.createElement('div');
        traceElement.className = 'p-3 mb-2 border rounded-lg bg-white shadow-sm';
        
        // Add step number and type indicator
        let typeIcon = '';
        let typeColor = 'text-blue-600';
        let borderColor = 'border-blue-200';
        
        switch(traceEntry.type) {
            case 'user_correct':
                typeIcon = '✅';
                typeColor = 'text-green-600';
                borderColor = 'border-green-200';
                traceElement.className += ' bg-green-50';
                break;
            case 'user_wrong':
                typeIcon = '❌';
                typeColor = 'text-red-600';
                borderColor = 'border-red-200';
                traceElement.className += ' bg-red-50';
                break;
            case 'algorithm_start':
                typeIcon = '🚀';
                typeColor = 'text-blue-600';
                borderColor = 'border-blue-200';
                traceElement.className += ' bg-blue-50';
                break;
            case 'algorithm_complete':
                typeIcon = '🎉';
                typeColor = 'text-purple-600';
                borderColor = 'border-purple-200';
                traceElement.className += ' bg-purple-50';
                break;
            default:
                typeIcon = 'ℹ️';
                break;
        }
        
        traceElement.className = traceElement.className.replace('border', `border ${borderColor}`);
        
        traceElement.innerHTML = `
            <div class="flex items-start gap-2">
                <span class="text-lg flex-shrink-0">${typeIcon}</span>
                <div class="flex-1 min-w-0">
                    <div class="font-medium ${typeColor} text-sm mb-1">
                        ${traceEntry.message}
                    </div>
                    ${traceEntry.details ? `<div class="text-xs text-slate-600 mb-2">${traceEntry.details}</div>` : ''}
                    ${traceEntry.educational ? `<div class="text-xs text-blue-700 bg-blue-100 rounded px-2 py-1 italic mb-1">💡 ${traceEntry.educational}</div>` : ''}
                    ${traceEntry.result ? `<div class="text-xs font-medium ${traceEntry.type === 'user_correct' || traceEntry.type === 'algorithm_complete' ? 'text-green-700' : 'text-red-700'}">${traceEntry.result}</div>` : ''}
                </div>
            </div>
        `;
        
        // Add to trace content (most recent at top)
        traceContent.insertBefore(traceElement, traceContent.firstChild);
        
        // Limit to last 15 entries to prevent overflow
        while (traceContent.children.length > 15) {
            traceContent.removeChild(traceContent.lastChild);
        }
        
        // Scroll to top to show latest entry
        traceContent.scrollTop = 0;
    }
    
    clearTrace() {
        const traceContent = document.getElementById('traceContent');
        
        if (traceContent) {
            traceContent.innerHTML = `
                <div class="text-sm text-slate-500 italic text-center py-8">
                    Start an algorithm and make your choices to see your learning progress here!
                </div>
            `;
        }
    }
    
    clearUserTrace() {
        this.clearTrace();
    }
    
    displayAutoSolveTrace(step) {
        if (this.currentMode === 'kruskal') {
            this.displayKruskalAutoSolveTrace(step);
        } else if (this.currentMode === 'prim') {
            this.displayPrimAutoSolveTrace(step);
        }
    }
    
    displayKruskalAutoSolveTrace(step) {
        const edge = step.edge;
        const edgeLabel = this.getEdgeLabel(edge);
        
        if (step.action === 'accept') {
            // Check what components vertices are in before union
            const comp1 = this.unionFind.find(edge.v1);
            const comp2 = this.unionFind.find(edge.v2);
            
            this.displayTrace({
                type: 'user_correct',
                message: `✅ Added edge ${edgeLabel} (weight: ${edge.weight})`,
                details: `Step ${this.algorithmStep + 1}: Kruskal's Algorithm - Edge Processing`,
                educational: `This edge has the smallest weight among remaining edges (${edge.weight}) and connects vertices from different components (${this.vertices[edge.v1].label} in component ${comp1}, ${this.vertices[edge.v2].label} in component ${comp2}). Since they're not connected, adding this edge is safe and won't create a cycle.`,
                result: `Edge ${edgeLabel} safely added to MST using Union-Find verification.`
            });
        } else {
            // Edge would create cycle
            const comp1 = this.unionFind.find(edge.v1);
            const comp2 = this.unionFind.find(edge.v2);
            
            this.displayTrace({
                type: 'user_wrong',
                message: `❌ Rejected edge ${edgeLabel} (weight: ${edge.weight})`,
                details: `Step ${this.algorithmStep + 1}: Kruskal's Algorithm - Cycle Detection`,
                educational: `Although this edge has weight ${edge.weight}, it must be rejected because both vertices ${this.vertices[edge.v1].label} and ${this.vertices[edge.v2].label} are already in the same component (${comp1}). Adding this edge would create a cycle, violating the tree property.`,
                result: `Edge ${edgeLabel} skipped to maintain acyclic structure.`
            });
        }
    }
    
    displayPrimAutoSolveTrace(step) {
        const edge = step.edge;
        const edgeLabel = this.getEdgeLabel(edge);
        const newVertex = step.newVertex;
        
        // Find which edges were available at this step
        const availableEdges = this.edges.filter(e => {
            const v1InMST = this.visited[e.v1];
            const v2InMST = this.visited[e.v2];
            const connectsToUnvisited = (v1InMST && !v2InMST) || (!v1InMST && v2InMST);
            return connectsToUnvisited && !e.selected;
        }).sort((a, b) => a.weight - b.weight);
        
        const availableEdgesList = availableEdges.slice(0, 3).map(e => {
            const target = this.visited[e.v1] ? e.v2 : e.v1;
            return `${this.getEdgeLabel(e)}(${e.weight}) to ${this.vertices[target].label}`;
        });
        
        this.displayTrace({
            type: 'user_correct',
            message: `✅ Added edge ${edgeLabel} (weight: ${edge.weight})`,
            details: `Step ${this.algorithmStep + 1}: Prim's Algorithm - Growing MST to vertex ${this.vertices[newVertex].label}`,
            educational: `Among all edges connecting the current MST to unvisited vertices, edge ${edgeLabel} has the minimum weight (${edge.weight}). Available options were: ${availableEdgesList.join(', ')}${availableEdges.length > 3 ? '...' : ''}. Prim's greedy strategy always selects the cheapest way to expand the tree.`,
            result: `Vertex ${this.vertices[newVertex].label} added to MST with minimum cost connection.`
        });
    }
    
    updateGraphInfo() {
        document.getElementById('vertexCount').textContent = this.vertexCount;
        document.getElementById('edgeCount').textContent = this.edges.length;
        document.getElementById('selectedEdges').textContent = this.selectedEdges.length;
        document.getElementById('totalWeight').textContent = this.totalWeight;
        
        // Show MST weight
        const optimalWeight = this.calculateOptimalMST();
        document.getElementById('mstWeight').textContent = optimalWeight;
    }
    
    updateVertexCount() {
        const slider = document.getElementById('vertexCountSlider');
        this.vertexCount = parseInt(slider.value);
        document.getElementById('vertexCountValue').textContent = this.vertexCount;
        this.generateGraph();
    }
    
    updateEdgeDensity() {
        const slider = document.getElementById('edgeDensitySlider');
        this.edgeDensity = parseFloat(slider.value);
        document.getElementById('edgeDensityValue').textContent = this.edgeDensity;
        this.generateGraph();
    }
    
    updateWeightRange() {
        const slider = document.getElementById('weightRangeSlider');
        this.weightRange.max = parseInt(slider.value);
        document.getElementById('weightRangeValue').textContent = this.weightRange.max;
        this.generateGraph();
    }
}

// Union-Find data structure for cycle detection
class UnionFind {
    constructor(size) {
        this.parent = Array.from({length: size}, (_, i) => i);
        this.rank = new Array(size).fill(0);
    }
    
    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]); // Path compression
        }
        return this.parent[x];
    }
    
    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);
        
        if (rootX !== rootY) {
            // Union by rank
            if (this.rank[rootX] < this.rank[rootY]) {
                this.parent[rootX] = rootY;
            } else if (this.rank[rootX] > this.rank[rootY]) {
                this.parent[rootY] = rootX;
            } else {
                this.parent[rootY] = rootX;
                this.rank[rootX]++;
            }
        }
    }

    showCongratulationsOverlay() {
        const overlay = document.getElementById('congratsOverlay');
        if (overlay) {
            // Update dynamic content
            const algorithmUsed = this.currentMode === 'kruskal' ? "Kruskal's" : "Prim's";
            const totalWeight = this.totalWeight;
            const edgeCount = this.selectedEdges.length;
            const optimalWeight = this.calculateOptimalMST();
            
            // Update congratulations message
            const congratsMessage = document.getElementById('congratsMessage');
            if (congratsMessage) {
                congratsMessage.innerHTML = `
                    🎉 <strong>Perfect!</strong> You've successfully completed <strong>${algorithmUsed} Algorithm</strong>!<br><br>
                    <div class="bg-green-50 p-3 rounded-lg mt-3 text-sm">
                        <div class="font-semibold text-green-800 mb-2">Your MST Results:</div>
                        <div class="text-green-700 space-y-1">
                            <div>✅ Total Weight: <strong>${totalWeight}</strong></div>
                            <div>✅ Edges Used: <strong>${edgeCount}/${this.vertexCount - 1}</strong></div>
                            <div>✅ Status: <strong>${totalWeight === optimalWeight ? 'Optimal Solution!' : 'Valid Spanning Tree'}</strong></div>
                        </div>
                    </div>
                `;
            }
            
            // Create confetti effect
            this.createConfettiEffect();
            
            // Play celebration sound
            this.playCelebrationSound();
            
            // Show overlay with animation
            overlay.classList.remove('hidden');
            
            // Add entrance animations to the content
            const overlayContent = overlay.querySelector('div > div');
            if (overlayContent) {
                overlayContent.style.transform = 'scale(0.8)';
                overlayContent.style.opacity = '0';
                overlayContent.classList.add('celebration-slide-up');
                
                setTimeout(() => {
                    overlayContent.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    overlayContent.style.transform = 'scale(1)';
                    overlayContent.style.opacity = '1';
                    
                    // Add pulse animation to the emoji
                    const emoji = overlayContent.querySelector('.text-6xl');
                    if (emoji) {
                        emoji.classList.add('celebration-pulse');
                    }
                }, 50);
                
                // Add celebration shake to the title after a delay
                setTimeout(() => {
                    const title = overlayContent.querySelector('h2');
                    if (title) {
                        title.classList.add('celebration-shake');
                    }
                }, 600);
            }
        }
    }

    createCanvasCelebration() {
        // Add sparkle effect to completed MST edges
        const sparkleCount = 20;
        const sparkles = [];
        
        for (let i = 0; i < sparkleCount; i++) {
            // Pick random positions along MST edges
            if (this.selectedEdges.length > 0) {
                const randomEdge = this.selectedEdges[Math.floor(Math.random() * this.selectedEdges.length)];
                const v1 = this.vertices[randomEdge.v1];
                const v2 = this.vertices[randomEdge.v2];
                
                const t = Math.random(); // Random point along edge
                const x = v1.x + t * (v2.x - v1.x);
                const y = v1.y + t * (v2.y - v1.y);
                
                sparkles.push({
                    x: x,
                    y: y,
                    life: 60, // frames
                    maxLife: 60,
                    color: this.colors.mstEdge,
                    size: Math.random() * 4 + 2
                });
            }
        }
        
        // Animate sparkles
        const animateSparkles = () => {
            this.draw(); // Redraw the base graph
            
            // Draw sparkles
            for (let i = sparkles.length - 1; i >= 0; i--) {
                const sparkle = sparkles[i];
                const alpha = sparkle.life / sparkle.maxLife;
                
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = sparkle.color;
                this.ctx.shadowColor = sparkle.color;
                this.ctx.shadowBlur = 10;
                
                this.ctx.beginPath();
                this.ctx.arc(sparkle.x, sparkle.y, sparkle.size * alpha, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.restore();
                
                sparkle.life--;
                if (sparkle.life <= 0) {
                    sparkles.splice(i, 1);
                }
            }
            
            // Continue animation if sparkles remain
            if (sparkles.length > 0) {
                requestAnimationFrame(animateSparkles);
            }
        };
        
        animateSparkles();
    }

    createConfettiEffect() {
        const confettiContainer = document.body;
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            confettiContainer.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 5000);
        }
    }

    hideCongratulationsOverlay() {
        const overlay = document.getElementById('congratsOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            // Reset transform and animations for next time
            const overlayContent = overlay.querySelector('div > div');
            if (overlayContent) {
                overlayContent.style.transform = '';
                overlayContent.style.opacity = '';
                overlayContent.style.transition = '';
                overlayContent.classList.remove('celebration-slide-up');
                
                // Remove animation classes
                const emoji = overlayContent.querySelector('.text-6xl');
                const title = overlayContent.querySelector('h2');
                if (emoji) emoji.classList.remove('celebration-pulse');
                if (title) title.classList.remove('celebration-shake');
            }
        }
    }
}

// Global game instance
let mstGame;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    mstGame = new MSTVisualization();
    
    // Update the initial slider values
    const vertexCountSlider = document.getElementById('vertexCountSlider');
    const edgeDensitySlider = document.getElementById('edgeDensitySlider');
    const weightRangeSlider = document.getElementById('weightRangeSlider');
    
    if (vertexCountSlider) {
        vertexCountSlider.value = mstGame.vertexCount;
        document.getElementById('vertexCountValue').textContent = mstGame.vertexCount;
    }
    
    if (edgeDensitySlider) {
        edgeDensitySlider.value = mstGame.edgeDensity;
        document.getElementById('edgeDensityValue').textContent = mstGame.edgeDensity;
    }
    
    if (weightRangeSlider) {
        weightRangeSlider.value = mstGame.weightRange.max;
        document.getElementById('weightRangeValue').textContent = mstGame.weightRange.max;
    }
    
    // Add congratulatory overlay event listeners
    const tryAnotherBtn = document.getElementById('tryAnotherAlgorithmBtn');
    const newGraphBtn = document.getElementById('generateNewGraphBtn');
    const closeOverlayBtn = document.getElementById('closeOverlayBtn');
    
    if (tryAnotherBtn) {
        tryAnotherBtn.addEventListener('click', () => {
            mstGame.hideCongratulationsOverlay();
            // Switch to the other algorithm
            const currentMode = mstGame.currentMode;
            const otherMode = currentMode === 'kruskal' ? 'prim' : 'kruskal';
            mstGame.changeAlgorithm(otherMode);
        });
    }
    
    if (newGraphBtn) {
        newGraphBtn.addEventListener('click', () => {
            mstGame.hideCongratulationsOverlay();
            mstGame.generateGraph();
        });
    }
    
  
    
    if (closeOverlayBtn) {
        closeOverlayBtn.addEventListener('click', () => {
            mstGame.hideCongratulationsOverlay();
        });
    }
});

// Control functions
function updateVertexCount() {
    if (mstGame) {
        mstGame.updateVertexCount();
    }
}

function updateEdgeDensity() {
    if (mstGame) {
        mstGame.updateEdgeDensity();
    }
}

function updateWeightRange() {
    if (mstGame) {
        mstGame.updateWeightRange();
    }
}

function generateNewGraph() {
    if (mstGame) {
        mstGame.generateGraph();
    }
}

function startKruskal() {
    if (mstGame) {
        mstGame.startMode('kruskal');
    }
}

function startPrim() {
    if (mstGame) {
        mstGame.startMode('prim');
    }
}

function resetTree() {
    if (mstGame) {
        mstGame.resetTree();
    }
}

function checkSpanningTree() {
    if (mstGame) {
        mstGame.checkSpanningTree();
    }
}

function startAutoSolve() {
    if (mstGame) {
        mstGame.startAutoSolve();
    }
}

function executeNextStep() {
    if (mstGame) {
        mstGame.executeNextStep();
    }
}

function executePrevStep() {
    if (mstGame) {
        mstGame.executePrevStep();
    }
}

function clearUserTrace() {
    if (mstGame) {
        mstGame.clearUserTrace();
    }
}

function hideCongratsOverlay() {
    if (mstGame) {
        mstGame.hideCongratulationsOverlay();
    }
}

// Floating Panel Controls (keeping existing functionality)
document.addEventListener('DOMContentLoaded', function() {
    // Controls panel
    const controlsButton = document.getElementById('controlsButton');
    const controlsPanel = document.getElementById('controlsPanel');
    const controlsPanelClose = document.getElementById('controlsPanelClose');
    
    // Info panel
    const infoButton = document.getElementById('infoButton');
    const infoPanel = document.getElementById('infoPanel');
    const infoPanelClose = document.getElementById('infoPanelClose');
    
    // Panel toggle functions
    function togglePanel(panel, button, otherPanel) {
        const isActive = panel.classList.contains('active');
        // Close other panel if active
        if (otherPanel && otherPanel.classList.contains('active')) {
            otherPanel.classList.remove('active');
        }
        // Toggle current panel
        if (isActive) {
            panel.classList.remove('active');
        } else {
            panel.classList.add('active');
            button.style.transform = 'translateY(-5px)';
            setTimeout(() => {
                button.style.transform = '';
            }, 300);
        }
    }
    
    // Control panel events
    if (controlsButton) {
        controlsButton.addEventListener('click', function() {
            togglePanel(controlsPanel, controlsButton, infoPanel);
        });
    }
    
    if (controlsPanelClose) {
        controlsPanelClose.addEventListener('click', function() {
            controlsPanel.classList.remove('active');
        });
    }
    
    // Info panel events
    if (infoButton) {
        infoButton.addEventListener('click', function() {
            togglePanel(infoPanel, infoButton, controlsPanel);
        });
    }
    
    if (infoPanelClose) {
        infoPanelClose.addEventListener('click', function() {
            infoPanel.classList.remove('active');
        });
    }
    
    // Close panels when clicking outside
    document.addEventListener('click', function(event) {
        if (controlsPanel && !controlsPanel.contains(event.target) && 
            controlsButton && !controlsButton.contains(event.target) && 
            controlsPanel.classList.contains('active')) {
            controlsPanel.classList.remove('active');
        }
        if (infoPanel && !infoPanel.contains(event.target) && 
            infoButton && !infoButton.contains(event.target) && 
            infoPanel.classList.contains('active')) {
            infoPanel.classList.remove('active');
        }
    });
});
