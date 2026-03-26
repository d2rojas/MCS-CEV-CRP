using JuMP
using HiGHS
using Plots
using DataFrames
using CSV
using Dates

"""
Grid-Supportive Mobile Charging Stations for Decarbonization of Construction Electric Vehicles
Implementation of the optimization model described in the paper
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
Function to load input data for the optimization model
"""
function load_input_data()
    # Define sets - REDUCED PROBLEM SIZE
    M = 1:2  # 2 MCSs (reduced from 4)
    T = 1:24  # 24 time intervals (reduced from 48)
    N = 1:4  # 4 nodes (2 grid connection nodes + 2 construction sites)
    N_g = 1:2  # 2 grid connection nodes
    N_c = 3:4  # 2 construction facility nodes (reduced from 5)
    E = 1:8  # 8 CEVs (reduced from 20)
    
    # Create distance matrix (example values)
    D = zeros(length(N), length(N))
    # Grid nodes to construction sites
    D[1, 3] = 2.5; D[3, 1] = 2.5  # Grid node 1 to/from construction site 1
    D[1, 4] = 3.2; D[4, 1] = 3.2  # Grid node 1 to/from construction site 2
    D[2, 3] = 3.0; D[3, 2] = 3.0  # Grid node 2 to/from construction site 1
    D[2, 4] = 2.8; D[4, 2] = 2.8  # Grid node 2 to/from construction site 2
    
    # Between construction sites
    D[3, 4] = 1.5; D[4, 3] = 1.5  # Between construction sites
    
    # Define paths
    S = [(i, j) for i in N for j in N if i != j]
    
    # Parameters
    A = zeros(Int, length(N), length(E))
    # Assign CEVs to construction nodes
    for e in 1:4
        A[3, e] = 1  # CEVs 1-4 at construction site 1
    end
    for e in 5:8
        A[4, e] = 1  # CEVs 5-8 at construction site 2
    end
    
    # MCS parameters
    C_MCS_plug = 3  # Number of plugs on MCSs
    CH_MCS = 125.0  # Charging power rate of MCSs (kW)
    DCH_MCS = 3 * 50.0  # Discharging power rate of MCSs (kW) - 3 plugs at 50 kW each
    DCH_MCS_plug = 50.0  # Discharging power rate of each plug (kW)
    k_trv = 0.5  # Energy consumed per mile during travel (kWh/mile)
    
    # CEV parameters
    CH_CEV = zeros(length(E))
    SOE_CEV_max = zeros(length(E))
    SOE_CEV_min = zeros(length(E))
    SOE_CEV_ini = zeros(length(E))
    
    # Assign values based on CEV types
    # Excavators (2 units)
    for e in 1:2
        CH_CEV[e] = 230.0  # Charging power rate (kW)
        SOE_CEV_max[e] = 264.0  # Maximum SOE (kWh)
        SOE_CEV_min[e] = 0.2 * 264.0  # Minimum SOE (kWh)
        SOE_CEV_ini[e] = 264.0  # Initial SOE (kWh)
    end
    
    # Mini excavators (6 units)
    for e in 3:8
        CH_CEV[e] = 25.0
        SOE_CEV_max[e] = 20.0
        SOE_CEV_min[e] = 0.2 * 20.0
        SOE_CEV_ini[e] = 20.0
    end
    
    # MCS battery parameters
    SOE_MCS_max = 250.0  # Maximum SOE of MCS's battery (kWh)
    SOE_MCS_min = 0.2 * 250.0  # Minimum SOE of MCS's battery (kWh)
    SOE_MCS_ini = 0.5 * 250.0  # Initial SOE of MCS's battery (kWh)
    
    # Time parameters
    t_g = first(T)  # Initial time interval
    t_end = last(T)  # Last time interval
    
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
    rho_miss = 1000.0  # Penalty cost for missed work ($/kW)
    eta_ch_dch = 0.95  # Charging/discharging efficiency of the MCS
    delta_T = 0.5  # Time interval (hours)
    
    # Work requirements for CEVs
    R_work = zeros(length(N), length(E), length(T))
    
    # Define work requirements based on construction schedules
    # For example, CEVs work from 7:00-12:00 and 13:00-16:00
    work_hours_morning = 7:10  # 7:00 AM to 10:00 AM (reduced)
    work_hours_afternoon = 13:14  # 1:00 PM to 2:00 PM (reduced)
    
    # Convert to time intervals (assuming 30-minute intervals starting at 7:00 AM)
    work_intervals_morning = [(h - 7) * 2 + 1:(h - 7) * 2 + 2 for h in work_hours_morning]
    work_intervals_morning = vcat(work_intervals_morning...)
    
    work_intervals_afternoon = [(h - 7) * 2 + 1:(h - 7) * 2 + 2 for h in work_hours_afternoon]
    work_intervals_afternoon = vcat(work_intervals_afternoon...)
    
    # Assign work requirements
    for i in N_c
        for e in E
            if A[i, e] == 1  # If CEV e is at construction node i
                for t in work_intervals_morning
                    if t <= length(T)
                        R_work[i, e, t] = CH_CEV[e] * 0.5  # Reduced to 50% of max power during work
                    end
                end
                
                for t in work_intervals_afternoon
                    if t <= length(T)
                        R_work[i, e, t] = CH_CEV[e] * 0.5  # Reduced to 50% of max power during work
                    end
                end
            end
        end
    end
    
    return M, T, N, N_g, N_c, E, S, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug, 
           D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max, 
           SOE_MCS_min, t_g, t_end, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
end

"""
Function to solve the optimization model and analyze results
"""
function solve_and_analyze()
    # Load input data
    M, T, N, N_g, N_c, E, S, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug, 
    D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max, 
    SOE_MCS_min, t_g, t_end, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T = load_input_data()
    
    # Create and solve the model
    model = create_mcs_optimization_model(
        M, T, N, N_g, N_c, E, S, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug, 
        D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max, 
        SOE_MCS_min, t_g, t_end, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
    )
    
    # Set solver parameters
    set_optimizer_attribute(model, "time_limit", 3600.0)  # 1 hour time limit
    
    # Solve the model
    @time optimize!(model)
    
    # Check solution status
    status = termination_status(model)
    println("Solution status: ", status)
    
    if status == MOI.OPTIMAL || status == MOI.TIME_LIMIT
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
        
        # Print MCS locations over time
        println("\nMCS Locations Over Time:")
        for m in M
            println("MCS $m:")
            for t in T
                for i in N
                    if z_val[m, i, t] > 0.5
                        node_type = i in N_g ? "Grid Node" : "Construction Site"
                        println("  Time $t: $node_type $i")
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
                        println("  Time $t: $from_type $i -> $to_type $j")
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
        println("Total carbon emissions cost: ", total_carbon_emissions, " $")
        
        # Calculate electricity costs
        total_electricity_cost = sum(P_ch_tot_val[m, t] * lambda_whl_elec[t] * delta_T for m in M, t in T)
        println("Total electricity cost: ", total_electricity_cost, " $")
        
        # Plot results
        
        # Plot MCS charging/discharging power
        p1 = plot(title="MCS Charging/Discharging Power", xlabel="Time Interval", ylabel="Power (kW)")
        for m in M
            plot!(p1, 1:length(T), [P_ch_tot_val[m, t] for t in T], label="MCS $m Charging", linestyle=:solid)
            plot!(p1, 1:length(T), [P_dch_tot_val[m, t] for t in T], label="MCS $m Discharging", linestyle=:dash)
        end
        
        # Plot MCS SOE
        p2 = plot(title="MCS State of Energy", xlabel="Time Interval", ylabel="Energy (kWh)")
        for m in M
            plot!(p2, 1:length(T), [SOE_MCS_val[m, t] for t in T], label="MCS $m")
        end
        
        # Plot CEV SOE
        p3 = plot(title="CEV State of Energy", xlabel="Time Interval", ylabel="Energy (kWh)")
        for e in 1:min(5, length(E))  # Plot first 5 CEVs for clarity
            plot!(p3, 1:length(T), [SOE_CEV_val[e, t] for t in T], label="CEV $e")
        end
        
        # Plot work power and missed work
        p4 = plot(title="Work Power and Missed Work", xlabel="Time Interval", ylabel="Power (kW)")
        total_work = zeros(length(T))
        total_missed = zeros(length(T))
        
        for t in T
            total_work[t] = sum(P_work_val[i, e, t] for i in N_c, e in E)
            total_missed[t] = sum(P_miss_work_val[i, e, t] for i in N_c, e in E)
        end
        
        plot!(p4, 1:length(T), total_work, label="Total Work Power", linestyle=:solid)
        plot!(p4, 1:length(T), total_missed, label="Total Missed Work", linestyle=:dash)
        
        # Combine plots
        plot(p1, p2, p3, p4, layout=(2, 2), size=(1000, 800))
        savefig("mcs_optimization_results.png")
        
        return model, obj_value, total_energy_from_grid, total_missed_work, total_carbon_emissions, total_electricity_cost
    else
        println("Failed to find optimal solution")
        return nothing, nothing, nothing, nothing, nothing, nothing
    end
end

"""
Function to identify infeasible constraints - fixed version
"""
function debug_infeasibility(model)
    println("Checking for infeasible constraints...")
    
    # Create a copy of the model
    debug_model = copy(model)
    
    # Add slack variables to all constraints
    slack_vars = Dict()
    
    # Get all constraints
    for (i, con) in enumerate(all_constraints(debug_model))
        if con.set isa MOI.EqualTo
            # For equality constraints: con.func == con.set.value
            slack_var = @variable(debug_model, base_name="slack_eq_$i")
            set_objective_coefficient(debug_model, slack_var, 1.0)
            new_func = con.func + slack_var
            delete(debug_model, con)
            @constraint(debug_model, new_func == con.set.value)
            slack_vars[i] = slack_var
        elseif con.set isa MOI.LessThan
            # For <= constraints: con.func <= con.set.upper
            slack_var = @variable(debug_model, lower_bound=0.0, base_name="slack_lt_$i")
            set_objective_coefficient(debug_model, slack_var, 1.0)
            new_func = con.func - slack_var
            delete(debug_model, con)
            @constraint(debug_model, new_func <= con.set.upper)
            slack_vars[i] = slack_var
        elseif con.set isa MOI.GreaterThan
            # For >= constraints: con.func >= con.set.lower
            slack_var = @variable(debug_model, lower_bound=0.0, base_name="slack_gt_$i")
            set_objective_coefficient(debug_model, slack_var, 1.0)
            new_func = con.func + slack_var
            delete(debug_model, con)
            @constraint(debug_model, new_func >= con.set.lower)
            slack_vars[i] = slack_var
        end
    end
    
    # Set objective to minimize sum of slack variables
    @objective(debug_model, Min, sum(slack_vars[i] for i in keys(slack_vars)))
    
    # Solve the model
    optimize!(debug_model)
    
    # Check which slack variables are non-zero
    for (i, var) in slack_vars
        if value(var) > 1e-6
            println("Constraint $i has non-zero slack: $(value(var))")
        end
    end
    
    return debug_model
end

# Run the optimization
model, obj_value, total_energy_from_grid, total_missed_work, total_carbon_emissions, total_electricity_cost = solve_and_analyze()
