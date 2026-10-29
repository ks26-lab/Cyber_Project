# Faculty demonstration

Start the backend and frontend using README.md. The entire demonstration works with WebGL disabled.

1. **Explore:** open `/`, select a state or search for Delhi. Show modeled demand and generation; explain that the geography is real reference geometry while electrical values are simulated. Pan/zoom, inspect a corridor, simulate a trip and open the selected-area dashboard. The local feeder is separate.
2. **Investigate:** open Restore and click **Investigate Outage**. Two actual training-feeder branches are faulted. The hospital/water facilities lose their normal route. Explain the three headline metrics and any unverified electrical state.
3. **Plan:** click **Find Restoration Plan**. Expand **Why did the system choose this?** to inspect computed candidate rejection reasons, criticality ranking and BFS/Dijkstra/knapsack traces. Graphs propose routes; AC analysis checks feasibility.
4. **Apply and measure:** click **Apply & Compare**, then **Evaluate the result**. Read the actual before/after supply, final constraints and measured runtime. Change the baseline and show that an infeasible attempted allocation is not verified recovered service. Fault isolation is distinct from repair.
5. **Play:** choose **Play Grid Command**, start Hospital Blackout, select the faulted hospital feeder and repair it. Observe the changed electrical state, credit/time cost and completion objective. Finish the mission, then continue to the shortage level for a real allocation decision. Undo a turn and run an algorithm hint using **Explain Decision**.
6. **Compare human and algorithm:** on game level 5, use the documented manual curtailment, battery and repair decisions, then compare against CAPER from the same original faults and intake limit. [The game guide](docs/GRID_COMMAND.md) contains exact all-level actions for rehearsal.
7. **Technical depth:** use Technical Lab for actual DSA replay, IEEE benchmarks, CAPER, the detector sandbox and research runs. Generate a measured benchmark and download its CSV rather than quoting a static demonstration score.

A concise review can use steps 1–5 in roughly five minutes; do not wait through every benchmark trial during a short presentation. Optional 3D is an alternate view of the same state, not a prerequisite. Do not promise a fixed algorithm runtime, globally optimal restoration, live national connectivity, or AC validity from graph connectivity alone.
