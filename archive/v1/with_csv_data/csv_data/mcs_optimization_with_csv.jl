using JuMP
using HiGHS
using Plots
using DataFrames
using CSV
using Printf
include("data_loader.jl")

"""
Grid-Supportive Mobile Charging Stations for Decarbonization of Construction Electric Vehicles
Implementation of the optimization model with data loaded from CSV files
"""

function create_mcs_optimization_model(
    # Sets
    M,              # Set of MCSs
    T,              # Set of time intervals
    N,              # Set of nodes
    N_g,            # Set of grid connection nodes
    N_c,            # Set of construction facility nodes
    E,              # Set of CEVs
    S,              # Set of paths (i,j)
    
    # Parameters
    A,              # Binary parameter; 1 if CEV e located at construction node i, else 0
    C_MCS_plug,     # Number of plugs on MCSs
    CH_MCS,         # Charging power rate of MCSs
    CH_CEV,         # Charging power rate of CEV e
    DCH_MCS,        # Discharging power rate of MCSs
    DCH_MCS_plug,   # Discharging power rate of each plug mounted on MCSs
    D,              # Distance matrix of nodes (i,j) (mile)
    k_trv,          # Energy consumed per mile during the travel of MCS (kWh/mile)
    R_work,         # Power consumption of CEV e in time t to accomplish work at construction node i
    SOE_CEV_ini,    # Initial state-of-energy (SOE) of CEV e (kWh)
    SOE_CEV_max,    # Maximum SOE of CEV e (kWh)
    SOE_CEV_min,    # Minimum SOE of CEV e (kWh)
    SOE_MCS_ini,    # Initial SOE of MCS's battery (kWh)
    SOE_MCS_max,    # Maximum SOE of MCS's battery (kWh)
    SOE_MCS_min,    # Minimum SOE of MCS's battery (kWh)
    t_g,            # Initial time interval
    t_end,          # Last time interval
    tau_trv,        # Time spent traveling from node i to j
    lambda_whl_elec,# Wholesale energy purchase price ($/kWh)
    lambda_CO2,     # CO2 emission price ($/kWh)
    rho_miss,       # Penalty cost for missed work ($/kW)
    eta_ch_dch,     # Charging/discharging efficiency of the MCS
    delta_T         # Time interval
)
    # Create the model
    model = Model(HiGHS.Optimizer)
    
    # Variables
    @variable(model, L_trv[m in M, i in N, j in N, t in T] >= 0)  # Energy consumed by MCS m for travel between i to j in time interval t (kWh)
    @variable(model, L_trv_tot[m in M, t in T] >= 0)              # Energy consumed by MCS m for travel in time interval t (kWh)
    @variable(model, P_ch_MCS[m in M, i in N, t in T] >= 0)       # Charging power of MCS m at node i in time interval t (kW)
    @variable(model, P_dch_MCS[m in M, i in N, t in T] >= 0)      # Discharging power of MCS m at node i in time interval t (kW)
    @variable(model, P_ch_tot[m in M, t in T] >= 0)               # Total charging power of MCS m in time interval t (kW)
    @variable(model, P_dch_tot[m in M, t in T] >= 0)              # Total discharging power of MCS m in time interval t (kW)
    @variable(model, P_MCS_CEV[m in M, i in N, e in E, t in T] >= 0) # Power transferred from MCS m to CEV e in time interval t (kW)
    @variable(model, P_miss_work[i in N, e in E, t in T] >= 0)    # Power corresponding to the missed work for CEV e at construction node i in time interval t (kW)
    @variable(model, P_work[i in N, e in E, t in T] >= 0)         # Power consumed by CEV e in time interval t to complete task at construction node i (kW)
    @variable(model, SOE_CEV[e in E, t in T] >= 0)                # SOE of CEV e in time interval t (kWh)
    @variable(model, SOE_MCS[m in M, t in T] >= 0)                # SOE of MCS m in time interval t (kWh)
    
    # Binary variables
    @variable(model, rho[m in M, i in N, e in E, t in T], Bin)    # 1 if CEV e connects to MCS m in node i, in time interval t, else 0
    @variable(model, gamma_arr[m in M, i in N, t in T], Bin)      # 1 if MCS m arrives to the node i, in time interval t, else 0
    @variable(model, sigma_dep[m in M, i in N, t in T], Bin)      # 1 if MCS m departs from the node i, in time interval t, else 0
    @variable(model, x[m in M, i in N, j in N, t in T], Bin)      # 1 if MCS m travels using (i,j) route in time interval t, else 0
    @variable(model, mu[i in N, e in E, t in T], Bin)             # 1 if any MCS charges the CEV e at node i in time interval t, else 0
    @variable(model, z[m in M, i in N, t in T], Bin)              # 1 if MCS m connects to the node i in time interval t, else 0
    
    # Objective function (1)
    @objective(model, Min, 
        sum(P_ch_tot[m, t] * (lambda_CO2[t] + lambda_whl_elec[t]) * delta_T for m in M, t in T) +
        sum(P_miss_work[i, e, t] * rho_miss for i in N_c, e in E, t in T)
    )
    
    # Constraints
    
    # Charging and discharging power constraints
    
    # Equation (2): Total charging power
    for m in M, t in T
        @constraint(model, P_ch_tot[m, t] == sum(P_ch_MCS[m, i, t] for i in N_g))
    end
    
    # Equation (3): Total discharging power
    for m in M, t in T
        @constraint(model, P_dch_tot[m, t] == sum(P_dch_MCS[m, i, t] for i in N_c))
    end
    
    # Equation (4): Discharging power to CEVs
    for m in M, i in N_c, t in T
        @constraint(model, P_dch_MCS[m, i, t] == sum(P_MCS_CEV[m, i, e, t] for e in E))
    end
    
    # Equation (5): No charging at construction nodes
    for m in M, i in N_c, t in T
        @constraint(model, P_ch_MCS[m, i, t] == 0)
    end
    
    # Equation (6): No discharging at grid nodes
    for m in M, i in N_g, t in T
        @constraint(model, P_dch_MCS[m, i, t] == 0)
    end
    
    # Equation (7): Charging power limit at grid nodes
    for m in M, i in N_g, t in T
        @constraint(model, P_ch_MCS[m, i, t] <= CH_MCS * z[m, i, t])
    end
    
    # Equation (8): Discharging power limit at construction nodes
    for m in M, i in N_c, t in T
        @constraint(model, P_dch_MCS[m, i, t] <= DCH_MCS * z[m, i, t])
    end
    
    # Equation (9): Discharging power limit per plug
    for m in M, i in N_c, e in E, t in T
        @constraint(model, P_MCS_CEV[m, i, e, t] <= DCH_MCS_plug * rho[m, i, e, t])
    end
    
    # Equation (10): CEV charging power limit
    for i in N_c, e in E, t in T
        @constraint(model, sum(P_MCS_CEV[m, i, e, t] for m in M) <= CH_CEV[e] * mu[i, e, t])
    end
    
    # Equation (11): Prevent simultaneous charging and working
    M_big = 1000  # A large positive number
    for i in N_c, e in E, t in T
        @constraint(model, P_work[i, e, t] <= M_big * (1 - mu[i, e, t]))
    end
    
    # Equation (12): Work power limit
    for i in N_c, e in E, t in T
        @constraint(model, P_work[i, e, t] <= R_work[i, e, t])
    end
    
    # Equation (13): Missed work calculation
    for i in N_c, e in E, t in T
        @constraint(model, P_miss_work[i, e, t] == R_work[i, e, t] - P_work[i, e, t])
    end
    
    # Energy consumption constraints
    
    # Equation (14): Energy consumption during travel
    for m in M, i in N, j in N, t in T
        if i != j  # Avoid self-loops
            @constraint(model, L_trv[m, i, j, t] == k_trv * D[i, j] * x[m, i, j, t])
        else
            @constraint(model, L_trv[m, i, j, t] == 0)  # No energy consumption for staying at the same node
        end
    end
    
    # Equation (15): Total travel energy consumption
    for m in M, t in T
        @constraint(model, L_trv_tot[m, t] == sum(L_trv[m, i, j, t] for i in N, j in N if i != j))
    end
    
    # Equation (16): MCS SOE update
    for m in M, t in T
        if t > first(T)  # Skip the first time interval
            @constraint(model, SOE_MCS[m, t] == SOE_MCS[m, t-1] + 
                                              (P_ch_tot[m, t-1] * delta_T * eta_ch_dch) - 
                                              (P_dch_tot[m, t-1] * delta_T / eta_ch_dch) - 
                                              L_trv_tot[m, t-1])
        end
    end
    
    # Equation (17): MCS SOE limits
    for m in M, t in T
        @constraint(model, SOE_MCS[m, t] >= SOE_MCS_min)
        @constraint(model, SOE_MCS[m, t] <= SOE_MCS_max)
    end
    
    # Equation (18): MCS initial SOE (relaxed final SOE)
    for m in M
        @constraint(model, SOE_MCS[m, first(T)] == SOE_MCS_ini)
        # No constraint on final SOE to make the model more flexible
    end
    
    # Equation (19): CEV SOE update
    for e in E, t in T
        if t > first(T)  # Skip the first time interval
            @constraint(model, SOE_CEV[e, t] == SOE_CEV[e, t-1] + 
                                             sum(P_MCS_CEV[m, i, e, t-1] for m in M, i in N_c) * delta_T - 
                                             sum(P_work[i, e, t-1] for i in N_c) * delta_T)
        end
    end
    
    # Equation (20): CEV SOE limits
    for e in E, t in T
        @constraint(model, SOE_CEV[e, t] >= SOE_CEV_min[e])
        @constraint(model, SOE_CEV[e, t] <= SOE_CEV_max[e])
    end
    
    # Equation (21): CEV initial SOE (relaxed final SOE)
    for e in E
        @constraint(model, SOE_CEV[e, first(T)] == SOE_CEV_ini[e])
        # No constraint on final SOE to make the model more flexible
    end
    
    # Spatial movement and connection status constraints
    
    # Equation (22): Limit on number of CEVs connected to an MCS
    for m in M, i in N_c, t in T
        @constraint(model, sum(rho[m, i, e, t] for e in E) <= C_MCS_plug)
    end
    
    # Equation (23): CEV location constraint
    for m in M, i in N, e in E, t in T
        @constraint(model, rho[m, i, e, t] <= A[i, e])
    end
    
    # Simplified flow conservation
    # Each MCS must visit at least one construction site
    for m in M
        @constraint(model, sum(gamma_arr[m, i, t] for i in N_c, t in T) >= 1)
    end
    
    # Equation (25): Connection status update
    for m in M, i in N, t in T
        if t > first(T)  # Skip the first time interval
            @constraint(model, gamma_arr[m, i, t] - sigma_dep[m, i, t] == z[m, i, t] - z[m, i, t-1])
        end
    end
    
    # Equation (26): Initial connection to depot
    for m in M
        # Each MCS starts at one of the grid nodes
        @constraint(model, sum(z[m, i, first(T)] for i in N_g) == 1)
    end
    
    # Equation (27-28): No arrivals or departures at initial time
    for m in M, i in N
        @constraint(model, gamma_arr[m, i, first(T)] == 0)
        @constraint(model, sigma_dep[m, i, first(T)] == 0)
    end
    
    # Equation (29): MCS can be at most at one node at a time
    for m in M, t in T
        @constraint(model, sum(z[m, i, t] for i in N) <= 1)
    end
    
    # Equation (30): Travel time constraint
    for m in M, i in N, j in N, t in T
        if i != j && t + tau_trv[i, j] <= last(T)
            @constraint(model, x[m, i, j, t] <= sigma_dep[m, i, t])
        end
    end
    
    # Equation (31): Arrival status
    for m in M, j in N, t in T
        if t > first(T)  # Skip the first time interval
            @constraint(model, gamma_arr[m, j, t] == sum(x[m, i, j, t-tau_trv[i, j]] for i in N if i != j && t-tau_trv[i, j] >= first(T)))
        end
    end
    
    # Equation (32): No simultaneous arrival and departure
    for m in M, i in N, t in T
        @constraint(model, gamma_arr[m, i, t] + sigma_dep[m, i, t] <= 1)
    end
    
    # Simplified visit constraints
    # Each construction site should be visited by at least one MCS
    for i in N_c
        @constraint(model, sum(gamma_arr[m, i, t] for m in M, t in T) >= 1)
    end
    
    return model
end

"""
Function to solve the optimization model and analyze results
"""
function solve_and_analyze(
    # Sets
    M,              # Set of MCSs
    T,              # Set of time intervals
    N,              # Set of nodes
    N_g,            # Set of grid connection nodes
    N_c,            # Set of construction facility nodes
    E,              # Set of CEVs
    A,              # Binary parameter; 1 if CEV e located at construction node i, else 0
    C_MCS_plug,     # Number of plugs on MCSs
    CH_MCS,         # Charging power rate of MCSs
    CH_CEV,         # Charging power rate of CEV e
    DCH_MCS,        # Discharging power rate of MCSs
    DCH_MCS_plug,   # Discharging power rate of each plug mounted on MCSs
    D,              # Distance matrix of nodes (i,j) (mile)
    k_trv,          # Energy consumed per mile during the travel of MCS (kWh/mile)
    R_work,         # Power consumption of CEV e in time t to accomplish work at construction node i
    SOE_CEV_ini,    # Initial state-of-energy (SOE) of CEV e (kWh)
    SOE_CEV_max,    # Maximum SOE of CEV e (kWh)
    SOE_CEV_min,    # Minimum SOE of CEV e (kWh)
    SOE_MCS_ini,    # Initial SOE of MCS's battery (kWh)
    SOE_MCS_max,    # Maximum SOE of MCS's battery (kWh)
    SOE_MCS_min,    # Minimum SOE of MCS's battery (kWh)
    tau_trv,        # Time spent traveling from node i to j
    lambda_whl_elec,# Wholesale energy purchase price ($/kWh)
    lambda_CO2,     # CO2 emission price ($/kWh)
    rho_miss,       # Penalty cost for missed work ($/kW)
    eta_ch_dch,     # Charging/discharging efficiency of the MCS
    delta_T         # Time interval
)
    # Create paths set
    S = [(i, j) for i in N for j in N if i != j]
    
    # Initial and final time intervals
    t_g = first(T)
    t_end = last(T)
    
    # Create and solve the model
    model = create_mcs_optimization_model(
        M, T, N, N_g, N_c, E, S, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
        D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
        SOE_MCS_min, t_g, t_end, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
    )
    
    # Set solver parameters
    set_optimizer_attribute(model, "time_limit", 600.0)  # 10 minute time limit
    
    # Solve the model
    @time optimize!(model)
    
    # Check solution status
    status = termination_status(model)
    println("Solution status: ", status)
    
    # Always analyze results, even if not optimal
    if status == MOI.OPTIMAL || status == MOI.TIME_LIMIT || status == MOI.SOLUTION_LIMIT
        # Extract and analyze results
        
        # Objective value
        obj_value = objective_value(model)
        println("Objective value: ", obj_value)
        
        # Extract variable values
        P_ch_tot_val = value.(model[:P_ch_tot])
        P_dch_tot_val = value.(model[:P_dch_tot])
        SOE_MCS_val = value.(model[:SOE_MCS])
        SOE_CEV_val = value.(model[:SOE_CEV])
        P_work_val = value.(model[:P_work])
        P_miss_work_val = value.(model[:P_miss_work])
        z_val = value.(model[:z])
        x_val = value.(model[:x])
        rho_val = value.(model[:rho])
        
        # Create time labels for better readability
        time_labels = []
        for t in T
            hour = 7 + div(t-1, 2)
            minute = (t-1) % 2 * 30
            push!(time_labels, @sprintf("%02d:%02d", hour, minute))
        end
        
        # Print MCS locations over time
        println("\nMCS Locations Over Time:")
        for m in M
            println("MCS $m:")
            for t in T
                for i in N
                    if z_val[m, i, t] > 0.5
                        node_type = i in N_g ? "Grid Node" : "Construction Site"
                        println("  Time $t ($(time_labels[t])): $node_type $i")
                    end
                end
            end
        end
        
        # Print MCS travel routes
        println("\nMCS Travel Routes:")
        for m in M
            println("MCS $m:")
            for t in T
                for i in N, j in N
                    if i != j && x_val[m, i, j, t] > 0.5
                        from_type = i in N_g ? "Grid Node" : "Construction Site"
                        to_type = j in N_g ? "Grid Node" : "Construction Site"
                        println("  Time $t ($(time_labels[t])): $from_type $i -> $to_type $j")
                    end
                end
            end
        end
        
        # Print CEV charging information
        println("\nCEV Charging Information:")
        for e in E
            println("CEV $e:")
            for t in T
                for m in M, i in N_c
                    if rho_val[m, i, e, t] > 0.5
                        println("  Time $t ($(time_labels[t])): Charged by MCS $m at Construction Site $i")
                    end
                end
            end
        end
        
        # Calculate total energy drawn from grid
        total_energy_from_grid = sum(P_ch_tot_val[m, t] * delta_T for m in M, t in T)
        println("\nTotal energy drawn from grid: ", total_energy_from_grid, " kWh")
        
        # Calculate total missed work
        total_missed_work = sum(P_miss_work_val[i, e, t] * delta_T for i in N_c, e in E, t in T)
        println("Total missed work: ", total_missed_work, " kWh")
        
        # Calculate carbon emissions
        total_carbon_emissions = sum(P_ch_tot_val[m, t] * lambda_CO2[t] * delta_T for m in M, t in T)
        println("Total carbon emissions cost: ", total_carbon_emissions, " \$")
        
        # Calculate electricity costs
        total_electricity_cost = sum(P_ch_tot_val[m, t] * lambda_whl_elec[t] * delta_T for m in M, t in T)
        println("Total electricity cost: ", total_electricity_cost, " \$")
        
        # Calculate work completion percentage
        total_required_work = sum(R_work[i, e, t] * delta_T for i in N_c, e in E, t in T)
        total_completed_work = sum(P_work_val[i, e, t] for i in N_c, e in E, t in T)
        work_completion_percentage = (total_completed_work / total_required_work) * 100
        println("Work completion percentage: ", work_completion_percentage, "%")
        
        # Plot results
        
        # Plot MCS charging/discharging power
        p1 = plot(title="MCS Charging/Discharging Power", xlabel="Time", ylabel="Power (kW)")
        for m in M
            plot!(p1, 1:length(T), [P_ch_tot_val[m, t] for t in T], label="MCS $m Charging", linestyle=:solid)
            plot!(p1, 1:length(T), [P_dch_tot_val[m, t] for t in T], label="MCS $m Discharging", linestyle=:dash)
        end
        xticks!(p1, 1:length(T), [string(label) for label in time_labels])
        
        # Plot MCS SOE
        p2 = plot(title="MCS State of Energy", xlabel="Time", ylabel="Energy (kWh)")
        for m in M
            plot!(p2, 1:length(T), [SOE_MCS_val[m, t] for t in T], label="MCS $m")
        end
        xticks!(p2, 1:length(T), [string(label) for label in time_labels])
        
        # Plot CEV SOE
        p3 = plot(title="CEV State of Energy", xlabel="Time", ylabel="Energy (kWh)")
        for e in E
            plot!(p3, 1:length(T), [SOE_CEV_val[e, t] for t in T], label="CEV $e")
        end
        xticks!(p3, 1:length(T), [string(label) for label in time_labels])
        
        # Plot work power and missed work
        p4 = plot(title="Work Power and Missed Work", xlabel="Time", ylabel="Power (kW)")
        total_work = zeros(length(T))
        total_missed = zeros(length(T))
        
        for t in T
            total_work[t] = sum(P_work_val[i, e, t] for i in N_c, e in E)
            total_missed[t] = sum(P_miss_work_val[i, e, t] for i in N_c, e in E)
        end
        
        plot!(p4, 1:length(T), total_work, label="Total Work Power", linestyle=:solid)
        plot!(p4, 1:length(T), total_missed, label="Total Missed Work", linestyle=:dash)
        xticks!(p4, 1:length(T), [string(label) for label in time_labels])
        
        # Combine plots
        p_combined = plot(p1, p2, p3, p4, layout=(2, 2), size=(1000, 800))
        savefig(p_combined, "mcs_optimization_results.png")
        
        # Create the plot
        p5 = plot(xlabel="Time", ylabel="Node", title="MCS Routes")
        yticks!(p5, 1:length(N), ["Node$i" for i in N])
        
        # Plot MCS routes
        for m in M
            times = []
            nodes = []
            for t in T
                for i in N
                    if value(model[:z][m, i, t]) > 0.5
                        push!(times, t)
                        push!(nodes, i)
                    end
                end
            end
            plot!(p5, times, nodes, marker=:circle, label="MCS $m")
        end
        
        # Save the plot
        savefig(p5, "mcs_routes.png")
        println("\nOptimization completed. Results have been saved to:")
        println("- mcs_routes.png")
        
        return model, obj_value, total_energy_from_grid, total_missed_work, total_carbon_emissions, total_electricity_cost, p_combined, p5
    else
        println("Failed to find feasible solution")
        return nothing, nothing, nothing, nothing, nothing, nothing, nothing, nothing
    end
end

"""
Run the optimization model using data from CSV files
"""
function run_optimization_from_csv(data_dir::String=".")
    println("Loading data from CSV files in directory: ", data_dir)
    
    # Load all data from CSV files
    M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
    D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
    SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T = DataLoader.load_all_data(data_dir)
    
    println("Data loaded successfully. Running optimization model...")
    
    # Solve the model and analyze results
    model, obj_value, total_energy_from_grid, total_missed_work, total_carbon_emissions, total_electricity_cost, p_combined, p5 = solve_and_analyze(
        M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
        D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
        SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
    )
    
    return model, obj_value, total_energy_from_grid, total_missed_work, total_carbon_emissions, total_electricity_cost, p_combined, p5
end

# If this script is run directly, run the optimization with data from the specified directory
if abspath(PROGRAM_FILE) == @__FILE__
    # Check if data directory is provided as command line argument
    if length(ARGS) > 0
        data_dir = ARGS[1]
    else
        # Default data directory
        data_dir = "."
    end
    
    run_optimization_from_csv(data_dir)
end

