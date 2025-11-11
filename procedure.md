#### Initial Setup

1. **Access the Simulation Interface**
   - The simulation displays a graph with vertices labeled A, B, C, etc., and edges with weights.
   - The left side contains the interactive graph canvas where you will work.
   - The right side shows the "Learning Trace" panel that tracks your progress and decisions.

2. **Understanding the Graph**
   - Vertices are represented as circles with labels (A, B, C, etc.).
   - Edges are lines connecting vertices, each displaying a numerical weight.
   - The goal is to find the minimum spanning tree that connects all vertices with the smallest total weight.

#### Working with Graph Parameters

1. **Customizing the Graph**
   - Click the settings button (gear icon) in the bottom-right corner to open the Graph Parameters panel.
   - Adjust the number of vertices using the "Vertices" slider (4-10 vertices).
   - Modify edge density with the "Edge Density" slider to control how many edges are present.
   - Set the maximum edge weight using the "Max Weight" slider.

2. **Generating New Graphs**
   - Click the "New Graph" button to generate a fresh random graph with your current parameter settings.
   - Use this feature to practice on different graph structures and edge weight distributions.

#### Algorithm Selection and Execution

1. **Choosing an Algorithm**
   - Use the dropdown menu at the top to select either "Kruskal's Algorithm" or "Prim's Algorithm".
   - Upon selection, the simulation will prepare the algorithm and display instructions specific to your choice.

2. **Interactive Learning Mode**
   - After selecting an algorithm, you will enter interactive mode where you must make decisions step by step.
   - Read the instructions displayed below the algorithm selector carefully.
   - The Learning Trace panel will provide feedback on your choices and educational insights.

#### Kruskal's Algorithm Procedure

1. **Algorithm Overview**
   - Kruskal's algorithm builds the minimum spanning tree by examining edges in order of increasing weight.
   - It uses a Union-Find data structure to detect cycles and avoid adding edges that would create them.

2. **Interactive Steps**
   - Click on edges in order of their weight, starting with the smallest.
   - The simulation will highlight the next expected edge to guide you.
   - If you click an edge that would create a cycle, the system will provide feedback and not add it to the spanning tree.
   - Continue until you have selected exactly n-1 edges (where n is the number of vertices).

3. **Visual Feedback**
   - Correct edge selections will be highlighted in green and added to the spanning tree.
   - Incorrect selections (those creating cycles) will be indicated with appropriate feedback.
   - The Learning Trace panel shows your progress and explains each decision.

#### Prim's Algorithm Procedure

1. **Algorithm Overview**
   - Prim's algorithm grows the minimum spanning tree from a single starting vertex.
   - It always selects the minimum weight edge that connects the current tree to an unvisited vertex.

2. **Interactive Steps**
   - The algorithm starts from vertex A (highlighted initially).
   - Click on the minimum weight edge that connects any vertex in the current tree to an unvisited vertex.
   - The simulation will guide you by highlighting valid options.
   - Continue until all vertices are included in the spanning tree.

3. **Visual Feedback**
   - Visited vertices and selected edges are visually distinguished.
   - The system provides immediate feedback on your edge selections.
   - Progress is tracked in the Learning Trace panel with detailed explanations.

#### Automated Features

1. **Auto Solve Mode**
   - Click the "Auto Solve" button to watch the algorithm execute automatically.
   - This mode demonstrates the complete solution with step-by-step animations.
   - Use this feature to verify your understanding or see the complete solution.

2. **Step-by-Step Navigation**
   - When available, use "Next Step" and "Previous Step" buttons to move through the algorithm at your own pace.
   - This allows detailed examination of each algorithmic decision.

#### Monitoring Progress

1. **Learning Trace Panel**
   - Review your decisions and their explanations in the right panel.
   - Each action is logged with educational context about why it was correct or incorrect.
   - Use the "Clear" button to reset the trace when starting fresh.

2. **Graph Information**
   - The Graph Parameters panel displays current statistics including total vertices, edges, selected edges, current weight, and optimal MST weight.
   - Monitor these values to track your progress toward the optimal solution.

#### Resetting and Restarting

1. **Reset Current Tree**
   - Click "Reset Tree" to clear your current progress while keeping the same graph.
   - This allows you to retry the same problem or switch between algorithms.

2. **Complete Reset**
   - Use "New Graph" to generate an entirely new problem.
   - Change algorithm selection to practice different approaches on the same graph.