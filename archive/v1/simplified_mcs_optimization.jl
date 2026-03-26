using JuMP
using HiGHS
using Plots
using DataFrames
using CSV
using Printf

"""
Simplified Grid-Supportive Mobile Charging Stations for Construction Electric Vehicles
"""

function create_simplified_mcs_model(
    # Sets
    M,              # Set of MCSs (reduced)
    T,              # Set of time intervals (reduced)
    N,              # Set of nodes (reduced)
    N_g,            # Set of grid connection nodes
    N_c,            # Set of construction facility nodes
    E,              # Set of CEVs (reduced)
    
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
    
    # Objective function
    @objective(model, Min, 
        sum(P_ch_tot[m, t] * (lambda_CO2[t] + lambda_whl_elec[t]) * delta_T for m in M, t in T) +
        sum(P_miss_work[i, e, t] * rho_miss for i in N_c, e in E, t in T)
    )
    
    # Constraints
    
    # Total charging power
    for m in M, t in T
        @constraint(model, P_ch_tot[m, t] == sum(P_ch_MCS[m, i, t] for i in N_g))
    end
    
    # Total discharging power
    for m in M, t in T
        @constraint(model, P_dch_tot[m, t] == sum(P_dch_MCS[m, i, t] for i in N_c))
    end
    
    # Discharging power to CEVs
    for m in M, i in N_c, t in T
        @constraint(model, P_dch_MCS[m, i, t] == sum(P_MCS_CEV[m, i, e, t] for e in E))
    end
    
    # No charging at construction nodes
    for m in M, i in N_c, t in T
        @constraint(model, P_ch_MCS[m, i, t] == 0)
    end
    
    # No discharging at grid nodes
    for m in M, i in N_g, t in T
        @constraint(model, P_dch_MCS[m, i, t] == 0)
    end
    
    # Charging power limit at grid nodes
    for m in M, i in N_g, t in T
        @constraint(model, P_ch_MCS[m, i, t] <= CH_MCS * z[m, i, t])
    end
    
    # Discharging power limit at construction nodes
    for m in M, i in N_c, t in T
        @constraint(model, P_dch_MCS[m, i, t] <= DCH_MCS * z[m, i, t])
    end
    
    # Discharging power limit per plug
    for m in M, i in N_c, e in E, t in T
        @constraint(model, P_MCS_CEV[m, i, e, t] <= DCH_MCS_plug * rho[m, i, e, t])
    end
    
    # CEV charging power limit
    for i in N_c, e in E, t in T
        @constraint(model, sum(P_MCS_CEV[m, i, e, t] for m in M) <= CH_CEV[e] * mu[i, e, t])
    end
    
    # Prevent simultaneous charging and working
    M_big = 1000  # A large positive number
    for i in N_c, e in E, t in T
        @constraint(model, P_work[i, e, t] <= M_big * (1 - mu[i, e, t]))
    end
    
    # Work power limit
    for i in N_c, e in E, t in T
        @constraint(model, P_work[i, e, t] <= R_work[i, e, t])
    end
    
    # Missed work calculation
    for i in N_c, e in E, t in T
        @constraint(model, P_miss_work[i, e, t] == R_work[i, e, t] - P_work[i, e, t])
    end
    
    # Energy consumption during travel
    for m in M, i in N, j in N, t in T
        if i != j  # Avoid self-loops
            @constraint(model, L_trv[m, i, j, t] == k_trv * D[i, j] * x[m, i, j, t])
        else
            @constraint(model, L_trv[m, i, j, t] == 0)  # No energy consumption for staying at the same node
        end
    end
    
    # Total travel energy consumption
    for m in M, t in T
        @constraint(model, L_trv_tot[m, t] == sum(L_trv[m, i, j, t] for i in N, j in N if i != j))
    end
    
    # MCS SOE update
    for m in M, t in T
        if t > first(T)  # Skip the first time interval
            @constraint(model, SOE_MCS[m, t] == SOE_MCS[m, t-1] + 
                                              (P_ch_tot[m, t-1] * delta_T * eta_ch_dch) - 
                                              (P_dch_tot[m, t-1] * delta_T / eta_ch_dch) - 
                                              L_trv_tot[m, t-1])
        end
    end
    
    # MCS SOE limits
    for m in M, t in T
        @constraint(model, SOE_MCS[m, t] >= SOE_MCS_min)
        @constraint(model, SOE_MCS[m, t] <= SOE_MCS_max)
    end
    
    # MCS initial SOE (relaxed final SOE)
    for m in M
        @constraint(model, SOE_MCS[m, first(T)] == SOE_MCS_ini)
        # No constraint on final SOE to make the model more flexible
    end
    
    # CEV SOE update
    for e in E, t in T
        if t > first(T)  # Skip the first time interval
            @constraint(model, SOE_CEV[e, t] == SOE_CEV[e, t-1] + 
                                             sum(P_MCS_CEV[m, i, e, t-1] for m in M, i in N_c) * delta_T - 
                                             sum(P_work[i, e, t-1] for i in N_c) * delta_T)
        end
    end
    
    # CEV SOE limits
    for e in E, t in T
        @constraint(model, SOE_CEV[e, t] >= SOE_CEV_min[e])
        @constraint(model, SOE_CEV[e, t] <= SOE_CEV_max[e])
    end
    
    # CEV initial SOE (relaxed final SOE)
    for e in E
        @constraint(model, SOE_CEV[e, first(T)] == SOE_CEV_ini[e])
        # No constraint on final SOE to make the model more flexible
    end
    
    # Limit on number of CEVs connected to an MCS
    for m in M, i in N_c, t in T
        @constraint(model, sum(rho[m, i, e, t] for e in E) <= C_MCS_plug)
    end
    
    # CEV location constraint
    for m in M, i in N, e in E, t in T
        @constraint(model, rho[m, i, e, t] <= A[i, e])
    end
    
    # Simplified flow conservation
    # Each MCS must visit at least one construction site
    for m in M
        @constraint(model, sum(gamma_arr[m, i, t] for i in N_c, t in T) >= 1)
    end
    
    # Connection status update
    for m in M, i in N, t in T
        if t > first(T)  # Skip the first time interval
            @constraint(model, gamma_arr[m, i, t] - sigma_dep[m, i, t] == z[m, i, t] - z[m, i, t-1])
        end
    end
    
    # Initial connection to depot
    for m in M
        # Each MCS starts at one of the grid nodes
        @constraint(model, sum(z[m, i, first(T)] for i in N_g) == 1)
    end
    
    # No arrivals or departures at initial time
    for m in M, i in N
        @constraint(model, gamma_arr[m, i, first(T)] == 0)
        @constraint(model, sigma_dep[m, i, first(T)] == 0)
    end
    
    # MCS can be at most at one node at a time
    for m in M, t in T
        @constraint(model, sum(z[m, i, t] for i in N) <= 1)
    end
    
    # Travel time constraint
    for m in M, i in N, j in N, t in T
        if i != j && t + tau_trv[i, j] <= last(T)
            @constraint(model, x[m, i, j, t] <= sigma_dep[m, i, t])
        end
    end
    
    # Arrival status
    for m in M, j in N, t in T
        if t > first(T)  # Skip the first time interval
            @constraint(model, gamma_arr[m, j, t] == sum(x[m, i, j, t-tau_trv[i, j]] for i in N if i != j && t-tau_trv[i, j] >= first(T)))
        end
    end
    
    # No simultaneous arrival and departure
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
Function to load input data for the simplified optimization model
"""
function load_simplified_data()
    # Define sets - VERY SMALL PROBLEM SIZE
    M = 1:1  # Just 1 MCS
    T = 1:12  # 12 time intervals (6 hours with 30-min intervals)
    N = 1:3  # 3 nodes (1 grid connection node + 2 construction sites)
    N_g = 1:1  # 1 grid connection node
    N_c = 2:3  # 2 construction facility nodes
    E = 1:4  # 4 CEVs
    
    # Create distance matrix
    D = zeros(length(N), length(N))
    # Grid node to construction sites
    D[1, 2] = 2.0; D[2, 1] = 2.0  # Grid node to/from construction site 1
    D[1, 3] = 3.0; D[3, 1] = 3.0  # Grid node to/from construction site 2
    
    # Between construction sites
    D[2, 3] = 1.5; D[3, 2] = 1.5  # Between construction sites
    
    # Parameters
    A = zeros(Int, length(N), length(E))
    # Assign CEVs to construction nodes
    for e in 1:2
        A[2, e] = 1  # CEVs 1-2 at construction site 1
    end
    for e in 3:4
        A[3, e] = 1  # CEVs 3-4 at construction site 2
    end
    
    # MCS parameters
    C_MCS_plug = 2  # Number of plugs on MCSs
    CH_MCS = 100.0  # Charging power rate of MCSs (kW)
    DCH_MCS = 2 * 50.0  # Discharging power rate of MCSs (kW) - 2 plugs at 50 kW each
    DCH_MCS_plug = 50.0  # Discharging power rate of each plug (kW)
    k_trv = 0.5  # Energy consumed per mile during travel (kWh/mile)
    
    # CEV parameters
    CH_CEV = zeros(length(E))
    SOE_CEV_max = zeros(length(E))
    SOE_CEV_min = zeros(length(E))
    SOE_CEV_ini = zeros(length(E))
    
    # Assign values based on CEV types
    # Mini excavators (4 units)
    for e in 1:4
        CH_CEV[e] = 25.0
        SOE_CEV_max[e] = 20.0
        SOE_CEV_min[e] = 0.2 * 20.0
        SOE_CEV_ini[e] = 20.0
    end
    
    # MCS battery parameters
    SOE_MCS_max = 150.0  # Maximum SOE of MCS's battery (kWh)
    SOE_MCS_min = 0.2 * 150.0  # Minimum SOE of MCS's battery (kWh)
    SOE_MCS_ini = 0.8 * 150.0  # Initial SOE of MCS's battery (kWh)
    
    # Travel time matrix
    tau_trv = zeros(Int, length(N), length(N))
    # Convert distances to travel times (assuming 30 min intervals and average speed of 30 mph)
    for i in 1:length(N)
        for j in 1:length(N)
            if i != j
                # Convert miles to time intervals (at 30 mph, 15 miles per interval)
                tau_trv[i, j] = max(1, ceil(Int, D[i, j] / 15))
            end
        end
    end
    
    # Electricity price and carbon emission data
    lambda_whl_elec = fill(0.1, length(T))  # Wholesale energy purchase price ($/kWh)
    lambda_CO2 = fill(0.05, length(T))  # CO2 emission price ($/kWh)
    
    # Other parameters
    rho_miss = 100.0  # Penalty cost for missed work ($/kW) - reduced to make trade-offs more visible
    eta_ch_dch = 0.95  # Charging/discharging efficiency of the MCS
    delta_T = 0.5  # Time interval (hours)
    
    # Work requirements for CEVs
    R_work = zeros(length(N), length(E), length(T))
    
    # Define work requirements - simplified pattern
    # Morning work: time intervals 3-6
    # Afternoon work: time intervals 9-12
    morning_intervals = 3:6
    afternoon_intervals = 9:12
    
    # Assign work requirements
    for i in N_c
        for e in E
            if A[i, e] == 1  # If CEV e is at construction node i
                for t in morning_intervals
                    R_work[i, e, t] = CH_CEV[e] * 0.6  # 60% of max power during work
                end
                
                for t in afternoon_intervals
                    R_work[i, e, t] = CH_CEV[e] * 0.6  # 60% of max power during work
                end
            end
        end
    end
    
    return M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug, 
           D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max, 
           SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
end

"""
Function to solve the simplified model and analyze results
"""
function solve_and_analyze_simplified_model()
    # Load input data
    M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug, 
    D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max, 
    SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T = load_simplified_data()
    
    # Create and solve the model
    model = create_simplified_mcs_model(
        M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug, 
        D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max, 
        SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
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
        total_completed_work = sum(P_work_val[i, e, t] * delta_T for i in N_c, e in E, t in T)
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
        savefig(p_combined, "simplified_mcs_results.png")
        
        # Create a network graph showing the movement of MCSs
        p5 = plot(title="MCS Routes", xlabel="Time", ylabel="Node", legend=:outertopright)
        
        # For each MCS, plot its location over time
        for m in M
            locations = []
            for t in T
                for i in N
                    if z_val[m, i, t] > 0.5  # If MCS m is at node i in time t
                        push!(locations, (t, i))
                    end
                end
            end
            
            if !isempty(locations)
                times = [loc[1] for loc in locations]
                nodes = [loc[2] for loc in locations]
                plot!(p5, times, nodes, marker=:circle, label="MCS $m")
            end
        end
        
        xticks!(p5, 1:length(T), [string(label) for label in time_labels])
        yticks!(p5, 1:length(N), string.(["Grid Node 1", "Construction Site 1", "Construction Site 2"]))
        savefig(p5, "simplified_mcs_routes.png")
        
        return model, obj_value, total_energy_from_grid, total_missed_work, total_carbon_emissions, total_electricity_cost, p_combined, p5
    else
        println("Failed to find feasible solution")
        return nothing, nothing, nothing, nothing, nothing, nothing, nothing, nothing
    end
end

# Run the simplified model
model, obj_value, total_energy_from_grid, total_missed_work, total_carbon_emissions, total_electricity_cost, p_combined, p5 = solve_and_analyze_simplified_model()

