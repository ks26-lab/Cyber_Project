import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.power.ieee30_network import get_ieee30_benchmark_network
    net_data = get_ieee30_benchmark_network()
    print("IEEE 30 Network built successfully!")
    print(f"Buses: {len(net_data['buses'])}, Gens: {len(net_data['generators'])}, Loads: {len(net_data['loads'])}, Lines: {len(net_data['lines'])}, Xfmrs: {len(net_data['transformers'])}")
    
    from app.power.solver import PowerFlowSolver
    res = PowerFlowSolver.solve(net_data, scenario_id="IEEE30_BASE")
    print(f"Solver Status: {res.status}")
    if res.power_balance:
        print(f"Converged: {res.power_balance.converged}, Iterations: {res.power_balance.iterations}")
        print(f"Total Gen: {res.power_balance.total_generation_mw:.2f} MW, Total Load: {res.power_balance.total_load_mw:.2f} MW, Losses: {res.power_balance.total_losses_mw:.2f} MW")
except Exception as e:
    import traceback
    traceback.print_exc()
