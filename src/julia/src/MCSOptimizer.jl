# MCS-CEV Optimization (Strategy D)
# Formulation aligned with "MCS-CEV Optimization Framework (Task 2 Deliverables)":
# - Objective Eq. 1: electricity cost, carbon, peak demand charge (λ_demand × P_peak), missed work
# - Power/work: doc (1)–(13) including CEV charging limit CH_CEV per CEV (9)
# - Travel energy: doc Eq (14)–(15): L_trv = k_way * D[i,j] * x[m,i,j,t]
# - SOE dynamics: doc Eq (16): includes charging, discharging AND travel energy consumption
# See docs/FORMULATION-COMPARISON-DOC-VS-JULIA.md for full mapping.
module MCSOptimizer

using JuMP
using HiGHS
using Plots
using DataFrames
using Printf
using LinearAlgebra
using Dates

export solve_and_analyze

"""
Check constraint feasibility and log violations
"""
function check_constraint_feasibility(model, constraint_name, constraint)
    if !is_valid(model)
        println("Model is invalid")
        return
    end
    
    if has_values(model)
        violation = 0.0
        if is_binary(constraint)
            # For binary constraints, check if values are close to 0 or 1
            val = value(constraint)
            violation = min(abs(val - 0), abs(val - 1))
        else
            # For other constraints, check the actual violation
            val = value(constraint)
            if is_less_than(constraint)
                violation = max(0, val - upper_bound(constraint))
            elseif is_greater_than(constraint)
                violation = max(0, lower_bound(constraint) - val)
            end
        end
        
        if violation > 1e-6
            println("Constraint violation in $constraint_name: $violation")
            println("Value: $val")
            if is_less_than(constraint)
                println("Upper bound: $(upper_bound(constraint))")
            elseif is_greater_than(constraint)
                println("Lower bound: $(lower_bound(constraint))")
            end
        end
    end
end

"""
Solve the MCS-CEV optimization model and analyze results
"""
function solve_and_analyze(
    M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
    D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
    SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T, time_labels;
    peak_demand_limit::Union{Float64, Nothing} = nothing,
    lambda_demand::Float64 = 0.0,  # Demand charge $/kW (doc Eq. 1, 3rd term); 0 = omit from objective
    carbon_price_per_ton::Float64 = 50.0  # Social cost of carbon $/metric ton (doc: $50); carbon cost = (kg) * (this/1000)
)
    # Create the model
    model = Model(HiGHS.Optimizer)
    set_silent(model)
    set_time_limit_sec(model, 600.0)  # 10 min for convergence

    println("\nStarting optimization with parameters:")
    println("Number of MCSs: ", length(M))
    println("Number of time periods: ", length(T))
    println("Number of nodes: ", length(N))
    println("Number of grid nodes: ", length(N_g))
    println("Number of construction sites: ", length(N_c))
    println("Number of EVs: ", length(E))
    println("MCS battery capacity: ", SOE_MCS_max, " kWh")
    println("MCS charging rate: ", CH_MCS, " kW")
    println("MCS discharging rate: ", DCH_MCS, " kW")
    println("MCS plug power: ", DCH_MCS_plug, " kW")
    println("Number of plugs per MCS: ", C_MCS_plug)
    println("Time interval: ", delta_T, " hours")
    if peak_demand_limit !== nothing
        println("Peak demand limit: ", peak_demand_limit, " kW")
    end
    println("\nEV Parameters:")
    for e in E
        println("EV $e - Max SOE: ", SOE_CEV_max[e], " kWh, Min SOE: ", SOE_CEV_min[e], " kWh, Initial SOE: ", SOE_CEV_ini[e], " kWh")
    end

    # Variables
    @variable(model, P_ch_MCS[M, N, T] >= 0)  # Charging power of MCS
    @variable(model, P_dch_MCS[M, N, T] >= 0)  # Discharging power of MCS
    @variable(model, P_MCS_CEV[M, N, E, T] >= 0)  # Power from MCS to CEV
    @variable(model, P_work[N, E, T] >= 0)  # Work power
    @variable(model, P_miss_work[N, E, T] >= 0)  # Missed work power
    @variable(model, L_trv[M, N, N, T] >= 0)  # Travel energy consumption
    @variable(model, L_trv_tot[M, T] >= 0)  # Total travel energy consumption
    @variable(model, P_ch_tot[M, T] >= 0)  # Total charging power
    @variable(model, P_dch_tot[M, T] >= 0)  # Total discharging power
    @variable(model, SOE_MCS[M, T] >= 0)  # State of energy of MCS
    @variable(model, SOE_CEV[E, T] >= 0)  # State of energy of CEV
    @variable(model, rho[M, N, E, T], Bin)  # CEV-MCS connection status
    @variable(model, beta_arr[M, N, T], Bin)  # MCS arrival status
    @variable(model, delta_dep[M, N, T], Bin)  # MCS departure status
    @variable(model, x[M, N, N, T], Bin)  # MCS travel status
    @variable(model, mu[N, E, T], Bin)  # CEV charging status
    @variable(model, z[M, N, T], Bin)  # MCS location status
    @variable(model, y_ch[M, T], Bin)  # 1 if charging, 0 if discharging
    @variable(model, P_peak >= 0)  # Peak grid power (doc Eq. 1, 3rd term: demand charge)

    println("\nAdding constraints...")

    # Objective function (doc Eq. 1: four terms)
    # (2) Carbon cost: lambda_CO2 in kg/kWh; cost $ = (kg) * (carbon_price_per_ton/1000)
    obj_terms = [
        sum(lambda_whl_elec[t] * P_ch_tot[m,t] * delta_T for m in M, t in T),   # (1) Electricity cost
        sum((carbon_price_per_ton / 1000.0) * lambda_CO2[t] * P_ch_tot[m,t] * delta_T for m in M, t in T),  # (2) Carbon cost at $50/ton
        sum(rho_miss * P_miss_work[i,e,t] * delta_T for i in N, e in E, t in T) # (4) Missed work penalty
    ]
    if lambda_demand > 0
        push!(obj_terms, lambda_demand * P_peak)  # (3) Peak demand charge $/kW × peak
        println("Adding peak demand charge to objective (λ_demand = $lambda_demand \$/kW)")
    end
    @objective(model, Min, sum(obj_terms))

    # Constraints
    println("Adding power balance constraints...")
    
    # Total charging and discharging power constraints
    @constraint(model, [m in M, t in T],
        P_ch_tot[m,t] == sum(P_ch_MCS[m,i,t] for i in N_g))
    
    @constraint(model, [m in M, t in T],
        P_dch_tot[m,t] == sum(P_dch_MCS[m,i,t] for i in N_c))
    
    # Power balance constraints
    @constraint(model, [m in M, i in N_g, t in T],
        P_dch_MCS[m,i,t] == 0)  # No discharging at grid nodes
    
    @constraint(model, [m in M, i in N_c, t in T],
        P_ch_MCS[m,i,t] == 0)  # No charging at construction sites
    
    @constraint(model, [m in M, i in N_c, t in T],
        P_dch_MCS[m,i,t] == sum(P_MCS_CEV[m,i,e,t] for e in E))  # Discharging power to CEVs

    # Charging/discharging mode constraints
    @constraint(model, [m in M, t in T], y_ch[m, t] == sum(z[m, i, t] for i in N_g))
    @constraint(model, [m in M, t in T], P_ch_tot[m, t] <= CH_MCS * y_ch[m, t])
    @constraint(model, [m in M, t in T], P_dch_tot[m, t] <= DCH_MCS * (1 - y_ch[m, t]))

    println("Adding power limits...")
    # Power limits
    @constraint(model, [m in M, i in N, t in T],
        P_ch_MCS[m,i,t] <= CH_MCS * z[m,i,t])  # MCS charging power limit
    
    @constraint(model, [m in M, i in N, t in T],
        P_dch_MCS[m,i,t] <= DCH_MCS * z[m,i,t])  # MCS discharging power limit
    
    @constraint(model, [m in M, i in N, e in E, t in T],
        P_MCS_CEV[m,i,e,t] <= DCH_MCS_plug * rho[m,i,e,t])  # Per-plug power limit (doc 8)

    # Doc constraint (9): CEV charging power limited by CH_CEV (per CEV) × μ
    # μ_{i,e,t} = 1 means CEV e is in charging mode at node i, time t
    CH_CEV_limit = isa(CH_CEV, AbstractArray) ? CH_CEV : fill(CH_CEV, length(E))
    @constraint(model, [i in N_c, e in E, t in T],
        sum(P_MCS_CEV[m,i,e,t] for m in M) <= CH_CEV_limit[e] * mu[i,e,t])

    # Peak: P_peak >= total grid power at each time (for demand charge term)
    @constraint(model, [t in T], P_peak >= sum(P_ch_tot[m, t] for m in M))

    # Peak demand constraint: total grid power at any time must not exceed limit (optional cap)
    if peak_demand_limit !== nothing
        println("Adding peak demand constraint (limit: $peak_demand_limit kW)...")
        @constraint(model, [t in T],
            sum(P_ch_tot[m, t] for m in M) <= peak_demand_limit)
    end

    # Doc Eq (14): Travel energy consumption L_trv[m,i,j,t] = k_way * D[i,j] * x[m,i,j,t]
    # k_way (kWh/mile) is the MCS road energy consumption rate (tau_trv parameter)
    k_way = tau_trv  # loaded from parameters.csv as k_way (default 0.5 kWh/mile)
    println("Adding travel energy constraints (k_way = $k_way kWh/mile)...")

    @constraint(model, [m in M, i in N, j in N, t in T],
        L_trv[m,i,j,t] == k_way * D[i,j] * x[m,i,j,t])

    # Doc Eq (15): Total travel energy at each time step
    @constraint(model, [m in M, t in T],
        L_trv_tot[m,t] == sum(L_trv[m,i,j,t] for i in N, j in N))

    # Link travel variable x to location variable z:
    # If MCS m is at node i at t-1 and at node j at t (i≠j), then x[m,i,j,t] = 1
    for m in M, i in N, j in N
        if i != j
            for t in T[2:end]
                @constraint(model, x[m,i,j,t] >= z[m,i,t-1] + z[m,j,t] - 1)
            end
        end
    end

    # No self-travel (diagonal of distance matrix is zero anyway)
    @constraint(model, [m in M, i in N, t in T], x[m,i,i,t] == 0)
    # No travel at initial time step (MCS starts at its initial position)
    @constraint(model, [m in M, i in N, j in N], x[m,i,j,first(T)] == 0)

    println("Adding work constraints...")
    # Work constraints
    @constraint(model, [i in N_c, e in E, t in T],
        P_work[i,e,t] + P_miss_work[i,e,t] == R_work[i,e,t] * A[i,e])  # Work requirement only where CEV is assigned
    
    @constraint(model, [i in N, e in E, t in T],
        P_work[i,e,t] <= R_work[i,e,t] * A[i,e])  # Work limit based on location assignment

    @constraint(model, [i in N, e in E, t in T; A[i,e] == 0],
        P_work[i,e,t] == 0)

    # Doc constraint (10): work/charge exclusivity via μ
    # P_work ≤ R_work * A * (1 - μ): CEV can only work when NOT charging (μ=0)
    @constraint(model, [i in N_c, e in E, t in T],
        P_work[i,e,t] <= R_work[i,e,t] * A[i,e] * (1 - mu[i,e,t]))

    println("Adding energy balance constraints...")
    # Doc Eq (16): MCS SOE dynamics with travel energy consumption
    # PDF: "charging, discharging, and energy consumption during travel at the CURRENT time-step"
    # Uses t indexing (not t-1) to match PDF exactly
    @constraint(model, [m in M, t in T[2:end]],
        SOE_MCS[m,t] == SOE_MCS[m,t-1] +
        P_ch_tot[m,t] * eta_ch_dch * delta_T -
        P_dch_tot[m,t] * delta_T / eta_ch_dch -
        L_trv_tot[m,t])

    # Doc Eq (19): CEV SOE dynamics — NO efficiency on CEV side
    # Uses t indexing to match PDF convention
    @constraint(model, [e in E, t in T[2:end]],
        SOE_CEV[e,t] == SOE_CEV[e,t-1] +
        sum(P_MCS_CEV[m,i,e,t] for m in M, i in N_c) * delta_T -
        sum(P_work[i,e,t] for i in N_c) * delta_T)

    println("Adding initial and final conditions...")
    # Initial and final conditions
    @constraint(model, [m in M], SOE_MCS[m,first(T)] == SOE_MCS_ini[m])
    @constraint(model, [m in M], SOE_MCS[m,last(T)] == SOE_MCS_ini[m])
    @constraint(model, [e in E], SOE_CEV[e,first(T)] == SOE_CEV_ini[e])
    @constraint(model, [e in E], SOE_CEV[e,last(T)] == SOE_CEV_ini[e])

    # Use original bounds for constraints (not wide bounds)
    @constraint(model, [m in M, t in T], SOE_MCS[m, t] >= SOE_MCS_min[m])
    @constraint(model, [m in M, t in T], SOE_MCS[m, t] <= SOE_MCS_max[m])
    @constraint(model, [e in E, t in T], SOE_CEV[e, t] >= SOE_CEV_min[e])
    @constraint(model, [e in E, t in T], SOE_CEV[e, t] <= SOE_CEV_max[e])

    # Create wide bounds only for plotting reference (not for constraints)
    SOE_MCS_min_wide = Dict(m => SOE_MCS_min[m] - 0.1 * abs(SOE_MCS_min[m]) for m in M)
    SOE_MCS_max_wide = Dict(m => SOE_MCS_max[m] + 0.1 * abs(SOE_MCS_max[m]) for m in M)
    SOE_CEV_min_wide = Dict(e => SOE_CEV_min[e] - 0.1 * abs(SOE_CEV_min[e]) for e in E)
    SOE_CEV_max_wide = Dict(e => SOE_CEV_max[e] + 0.1 * abs(SOE_CEV_max[e]) for e in E)

    println("Adding movement and connection constraints...")
    # Movement and connection constraints
    @constraint(model, [m in M, i in N_c, t in T],
        sum(rho[m,i,e,t] for e in E) <= C_MCS_plug)  # Limit on number of CEVs connected to an MCS

    @constraint(model, [m in M, i in N, e in E, t in T],
        rho[m,i,e,t] <= A[i,e])  # CEV location constraint

    @constraint(model, [m in M],
        sum(beta_arr[m,i,t] for i in N_c, t in T) >= 1)  # Each MCS must visit at least one construction site

    @constraint(model, [m in M, i in N, e in E, t in T],
        rho[m,i,e,t] <= z[m,i,t])

    # MCS must be at exactly one node at each time (doc constraint 29)
    @constraint(model, [m in M, t in T], sum(z[m,i,t] for i in N) == 1)

    # Doc constraint (26): all MCSs start at grid connection nodes at t=t0
    @constraint(model, [m in M], sum(z[m,i,first(T)] for i in N_g) == 1)
    # Cyclic: MCSs must also end at grid nodes (return to base for next day)
    @constraint(model, [m in M], sum(z[m,i,last(T)] for i in N_g) == 1)

    # Movement penalty: instead of an artificial minimum stay constraint,
    # travel energy consumption (Eq 14-16) naturally discourages excessive bouncing.
    # Each trip costs k_way * D[i,j] kWh from the MCS battery.

    println("\nSolving the model...")
    optimize!(model)

    # Check solution status and log details
    status = termination_status(model)
    println("\nSolution Status: ", status)
    if status == MOI.TIME_LIMIT
        println("(Using best solution found within time limit.)")
    end
    # Run violation checks only when not optimal and not time limit (avoid is_valid errors)
    if status != MOI.OPTIMAL && status != MOI.TIME_LIMIT && has_values(model)
        println("(Non-optimal; reporting best solution.)")
    elseif status != MOI.OPTIMAL && status != MOI.TIME_LIMIT
        println("\nNo solution available.")
    end

    # Calculate metrics
    total_energy_from_grid = sum(value.(P_ch_tot[m,t]) * delta_T for m in M, t in T)
    total_missed_work = sum(value.(P_miss_work[i,e,t]) * delta_T for i in N, e in E, t in T)
    total_carbon_emissions = sum(value.(P_ch_tot[m,t]) * lambda_CO2[t] * delta_T for m in M, t in T)
    total_electricity_cost = sum(value.(P_ch_tot[m,t]) * lambda_whl_elec[t] * delta_T for m in M, t in T)

    # Energy flow tracking and balance verification
    total_energy_charged = sum(value.(P_ch_tot[m,t]) * eta_ch_dch * delta_T for m in M, t in T)
    total_energy_discharged = sum(value.(P_dch_tot[m,t]) * delta_T / eta_ch_dch for m in M, t in T)
    total_travel_energy = sum(value.(L_trv_tot[m,t]) for m in M, t in T)
    net_energy_change = total_energy_charged - total_energy_discharged - total_travel_energy
    
    # Energy balance verification
    final_energy = sum(value.(SOE_MCS[m,last(T)]) for m in M)
    initial_energy = sum(SOE_MCS_ini[m] for m in M)
    energy_change = final_energy - initial_energy
    energy_balance_error = abs(energy_change)
    energy_efficiency = total_energy_charged / total_energy_from_grid * 100

    obj_val = objective_value(model)
    println("\nFinal Metrics:")
    println("Objective (cost function) value: ", obj_val)
    println("Total Energy from Grid: ", total_energy_from_grid, " kWh")
    println("Total Missed Work: ", total_missed_work, " kWh")
    println("Total Carbon Emissions Cost: ", total_carbon_emissions)
    println("Total Electricity Cost: ", total_electricity_cost)
    
    println("\n=== ENERGY ANALYSIS ===")
    println("Total Energy from Grid: ", total_energy_from_grid, " kWh")
    println("Total Energy Charged (with efficiency): ", total_energy_charged, " kWh")
    println("Total Energy Discharged (with efficiency): ", total_energy_discharged, " kWh")
    println("Total Travel Energy: ", total_travel_energy, " kWh")
    println("Net Energy Change: ", net_energy_change, " kWh")
    println("Initial MCS Energy: ", initial_energy, " kWh")
    println("Final MCS Energy: ", final_energy, " kWh")
    println("Energy Efficiency: ", energy_efficiency, "%")
    
    if energy_balance_error > 1e-6
        println("⚠️ WARNING: Energy balance error: ", energy_balance_error, " kWh")
    else
        println("✅ Energy balance verified")
    end
    
    # Power statistics
    max_power = maximum([value.(P_ch_tot[m,t]) for m in M, t in T])
    avg_power = total_energy_from_grid / 24  # kWh / 24h = kW
    duty_cycle = count([value.(P_ch_tot[m,t]) > 0 for m in M, t in T]) / (length(M) * length(T)) * 100
    
    println("\n=== POWER ANALYSIS ===")
    println("Peak Power: ", max_power, " kW")
    println("Average Power: ", avg_power, " kW")
    println("Duty Cycle: ", duty_cycle, "%")
    println("Total Energy: ", total_energy_from_grid, " kWh")
    
    println("\n=== POWER vs ENERGY EXPLANATION ===")
    println("• Power Profile: Instantaneous power (kW) at each time step")
    println("• Total Energy: Sum of power × time over all periods (kWh)")
    println("• Peak Power: Maximum power during charging periods")
    println("• Average Power: Total energy ÷ total time")
    println("• Duty Cycle: Percentage of time spent charging")

    # Create visualizations
    now_str = Dates.format(now(), "yyyy-mm-dd HH:MM:SS")
    # Use time_labels as a vector of strings for all plots
    mcs_power_plots, mcs_csv_data = plot_power_profiles(model, M, N, T, delta_T, time_labels)
    p_total_grid, total_grid_csv = plot_total_grid_power_profile(model, M, N, T, delta_T, time_labels)
    p2, mcs_soe_csv = plot_soe_profiles(model, M, T, delta_T, time_labels, SOE_MCS_max, SOE_MCS_min, now_str)
    # Pass both actual bounds (for CSV) and wide bounds (for plot visualization)
    p3, cev_soe_csv = plot_cev_soe_profiles(model, E, T, delta_T, time_labels, SOE_CEV_max, SOE_CEV_min, SOE_CEV_min_wide, SOE_CEV_max_wide, now_str)
    p4, work_csv = plot_work_profiles(model, N, N_c, E, T, delta_T, time_labels)
    p_price_emission, price_emission_csv = plot_price_emission_factors(lambda_whl_elec, lambda_CO2, T, time_labels)
    p5, mcs_trajectory_csv = plot_mcs_time_trajectory(model, M, N, N_g, N_c, T, time_labels)
    
    # Create a combined plot without individual MCS power profiles (they will be saved separately)
    p_combined = plot(p2, p3, p_price_emission, p4, p5, layout=(3,2), size=(1400,1200))

    p6 = plot_mcs_routes(model, M, N, T, D)

    return model, obj_val, total_energy_from_grid, total_missed_work,
           total_carbon_emissions, total_electricity_cost, p_combined, p5, p6, SOE_MCS_min_wide, SOE_MCS_max_wide, SOE_CEV_min_wide, SOE_CEV_max_wide, now_str, p_price_emission, mcs_power_plots, p_total_grid,
           mcs_csv_data, total_grid_csv, mcs_soe_csv, cev_soe_csv, work_csv, price_emission_csv, mcs_trajectory_csv
end

# Helper function to create readable time labels
function create_readable_time_labels(T, time_labels)
    # Adjust step size based on number of periods for better readability
    if length(T) <= 24
        # For small datasets, show more labels
        step = max(1, div(length(T), 8))
    elseif length(T) <= 48
        # For medium datasets, show moderate number of labels
        step = max(1, div(length(T), 12))
    else
        # For large datasets (like 96 periods), show fewer labels to avoid overlap
        step = max(1, div(length(T), 8))  # Show ~8 labels for 96 periods
    end
    
    readable_indices = 1:step:length(T)
    readable_times = time_labels[readable_indices]
    readable_T = T[readable_indices]
    return readable_T, readable_times
end

# Plotting functions
function plot_power_profiles(model, M, N, T, delta_T, time_labels)
    readable_T, readable_times = create_readable_time_labels(T, time_labels)
    
    # Create individual plots for each MCS
    mcs_plots = []
    mcs_csv_data = []
    
    for (m_idx, m) in enumerate(M)
        p = plot(title="MCS $m Power Profile", xlabel="Time", ylabel="Power (kW)", 
                 xticks=(readable_T, readable_times), xlims=(first(T), last(T)),
                 size=(900, 500), xrotation=45, bottom_margin=5Plots.mm)
        
        # Get charging and discharging data for this MCS
        charging = [value(model[:P_ch_tot][m,t]) for t in T]
        discharging = [value(model[:P_dch_tot][m,t]) for t in T]
        
        # Plot charging bars (positive)
        bar!(p, T, charging, label="Charging", color=:blue, alpha=0.8)
        
        # Plot discharging bars (negative)
        bar!(p, T, -discharging, label="Discharging", color=:red, alpha=0.6)
        
        # Add horizontal line at zero to separate charging and discharging
        hline!(p, [0], color=:black, linestyle=:dash, alpha=0.5, label=nothing)
        
        # Create CSV data for this MCS
        csv_data = DataFrame(
            Time_Period = T,
            Time_Label = time_labels,
            Charging_Power_kW = charging,
            Discharging_Power_kW = discharging,
            Net_Power_kW = charging .- discharging
        )
        
        push!(mcs_plots, p)
        push!(mcs_csv_data, csv_data)
    end
    
    return mcs_plots, mcs_csv_data
end

# New function for total grid power profile showing the SUM of all MCSs
function plot_total_grid_power_profile(model, M, N, T, delta_T, time_labels)
    readable_T, readable_times = create_readable_time_labels(T, time_labels)
    p = plot(title="Total Grid Power Profile (Sum of All MCSs)", xlabel="Time", ylabel="Power (kW)", 
             xticks=(readable_T, readable_times), xlims=(first(T), last(T)),
             size=(900, 500), xrotation=45, bottom_margin=5Plots.mm)
    
    # Calculate TOTAL charging and discharging (sum of all MCSs)
    total_charging = zeros(length(T))
    total_discharging = zeros(length(T))
    
    for m in M
        charging = [value(model[:P_ch_tot][m,t]) for t in T]
        discharging = [value(model[:P_dch_tot][m,t]) for t in T]
        total_charging .+= charging
        total_discharging .+= discharging
    end
    
    # Plot TOTAL charging bars (positive)
    bar!(p, T, total_charging, label="Total Charging (Grid)", color=:blue, alpha=0.8)
    
    # Plot TOTAL discharging bars (negative)
    bar!(p, T, -total_discharging, label="Total Discharging (CEVs)", color=:red, alpha=0.6)
    
    # Add horizontal line at zero to separate charging and discharging
    hline!(p, [0], color=:black, linestyle=:dash, alpha=0.5, label=nothing)
    
    # Create CSV data
    csv_data = DataFrame(
        Time_Period = T,
        Time_Label = time_labels,
        Total_Charging_Power_kW = total_charging,
        Total_Discharging_Power_kW = total_discharging,
        Net_Power_kW = total_charging .- total_discharging
    )
    
    return p, csv_data
end

function plot_soe_profiles(model, M, T, delta_T, time_labels, SOE_MCS_max, SOE_MCS_min, now_str)
    readable_T, readable_times = create_readable_time_labels(T, time_labels)
    p = plot(title="MCS State of Energy", xlabel="Time", ylabel="Energy (kWh)", 
             xticks=(readable_T, readable_times), size=(900, 500), xrotation=45, bottom_margin=5Plots.mm)
    
    # Create CSV data
    csv_data = DataFrame(Time_Period = T, Time_Label = time_labels)
    
    # Define colors for different MCSs
    mcs_colors = [:blue, :red, :green, :purple, :orange]
    
    for (m_idx, m) in enumerate(M)
        color = mcs_colors[mod1(m_idx, length(mcs_colors))]
        soe_values = [value(model[:SOE_MCS][m,t]) for t in T]
        plot!(p, T, soe_values, label="MCS $m", color=color, linewidth=2)
        
        # Add to CSV data
        csv_data[!, "MCS_$(m)_SOE_kWh"] = soe_values
        csv_data[!, "MCS_$(m)_Max_SOE_kWh"] = fill(SOE_MCS_max[m], length(T))
        csv_data[!, "MCS_$(m)_Min_SOE_kWh"] = fill(SOE_MCS_min[m], length(T))
    end
    
    # Use original bounds from dataset for plotting (not wide bounds)
    max_values = [SOE_MCS_max[m] for m in M]
    min_values = [SOE_MCS_min[m] for m in M]
    hline!(p, max_values, color=:black, linestyle=:dash, label="Max Energy")
    hline!(p, min_values, color=:gray, linestyle=:dash, label="Min Energy")
    annotate!(p, 0.5, 0.95, text("Generated: $now_str", :gray, 10, :left))
    
    return p, csv_data
end

function plot_cev_soe_profiles(model, E, T, delta_T, time_labels, SOE_CEV_max, SOE_CEV_min, SOE_CEV_min_dict, SOE_CEV_max_dict, now_str)
    readable_T, readable_times = create_readable_time_labels(T, time_labels)
    p = plot(title="CEV State of Energy", xlabel="Time", ylabel="Energy (kWh)", 
             xticks=(readable_T, readable_times), size=(900, 500), xrotation=45, bottom_margin=5Plots.mm)
    
    # Create CSV data
    csv_data = DataFrame(Time_Period = T, Time_Label = time_labels)
    
    # Plot ACTUAL bounds from dataset (these are the real constraints)
    max_values_actual = [SOE_CEV_max[e] for e in E]
    min_values_actual = [SOE_CEV_min[e] for e in E]
    hline!(p, max_values_actual, color=:black, linestyle=:dash, label="CEV Max (actual)")
    hline!(p, min_values_actual, color=:gray, linestyle=:dash, label="CEV Min (actual)")

    for (e_idx, e) in enumerate(E)
        soe_values = [value(model[:SOE_CEV][e,t]) for t in T]
        plot!(p, T, soe_values, label="CEV $e")
        
        # Add to CSV data - use ACTUAL bounds from data (not wide bounds for visualization)
        csv_data[!, "CEV_$(e)_SOE_kWh"] = soe_values
        csv_data[!, "CEV_$(e)_Max_SOE_kWh"] = fill(SOE_CEV_max[e], length(T))
        csv_data[!, "CEV_$(e)_Min_SOE_kWh"] = fill(SOE_CEV_min[e], length(T))
    end
    annotate!(p, 0.5, 0.95, text("Generated: $now_str", :gray, 10, :left))
    
    return p, csv_data
end

function plot_work_profiles(model, N, N_c, E, T, delta_T, time_labels)
    readable_T, readable_times = create_readable_time_labels(T, time_labels)
    p = plot(title="Work Power Profiles by Site", xlabel="Time", ylabel="Power (kW)", 
             xticks=(readable_T, readable_times), size=(900, 500), xrotation=45, bottom_margin=5Plots.mm)
    
    # Create CSV data
    csv_data = DataFrame(Time_Period = T, Time_Label = time_labels)
    
    # Define colors for different construction sites
    site_colors = [:blue, :red, :green, :purple, :orange, :brown, :pink, :gray, :olive, :cyan]
    
    for (i_idx, i) in enumerate(N_c)
        # Get work power for this construction site across all EVs
        site_work = [sum(value.(model[:P_work][i,e,t]) for e in E) for t in T]
        
        # Only plot if this site has work (non-zero values)
        if maximum(site_work) > 0
            color = site_colors[mod1(i_idx, length(site_colors))]
            plot!(p, T, site_work, label="Site $i", color=color, linewidth=2)
        end
        
        # Add to CSV data
        csv_data[!, "Site_$(i)_Work_Power_kW"] = site_work
    end
    
    # Add total work power
    total_work = [sum(value.(model[:P_work][i,e,t]) for i in N_c, e in E) for t in T]
    csv_data[!, "Total_Work_Power_kW"] = total_work
    
    return p, csv_data
end

function plot_mcs_routes(model, M, N, T, D)
    p = plot(title="MCS Routes", xlabel="X", ylabel="Y", aspect_ratio=:equal)
    
    # Create simple 2D coordinates for nodes
    coords = Dict()
    n_nodes = length(N)
    for (i, node) in enumerate(N)
        angle = 2π * (i-1) / n_nodes
        coords[node] = (5 * cos(angle), 5 * sin(angle))
    end
    
    # Plot nodes
    for node in N
        scatter!(p, [coords[node][1]], [coords[node][2]], 
                label="Node $node", markersize=10)
        annotate!(p, coords[node][1], coords[node][2], text("Node $node", :black, 10))
    end
    
    # Plot routes
    colors = [:red, :blue, :green, :purple]
    for (m_idx, m) in enumerate(M)
        for t in T
            for i in N, j in N
                if value(model[:x][m,i,j,t]) > 0.5
                    plot!(p, [coords[i][1], coords[j][1]], 
                          [coords[i][2], coords[j][2]],
                          arrow=true, color=colors[mod1(m_idx,4)],
                          label=nothing, linewidth=2)
                end
            end
        end
    end
    
    return p
end

function plot_mcs_time_trajectory(model, M, N, N_g, N_c, T, time_labels)
    # Create descriptive labels for y-axis
    node_labels = []
    for node in N
        if node in N_g
            push!(node_labels, "Grid $node")
        else
            push!(node_labels, "Site $node")
        end
    end
    
    readable_T, readable_times = create_readable_time_labels(T, time_labels)
    p = plot(title="MCS Location Over Time", xlabel="Time", ylabel="Node Type", 
             yticks=(N, node_labels), xticks=(readable_T, readable_times),
             size=(900, 500), xrotation=45, bottom_margin=5Plots.mm)
    
    # Create CSV data
    csv_data = DataFrame(Time_Period = T, Time_Label = time_labels)
    
    colors = [:red, :blue, :green, :purple]
    for (m_idx, m) in enumerate(M)
        locations = []
        times = []
        last_loc = nothing
        for t in T
            found = false
            for node in N
                zval = value(model[:z][m,node,t])
                if zval > 0.5
                    push!(locations, node)
                    push!(times, t)
                    last_loc = node
                    found = true
                    break
                end
            end
            if !found
                if last_loc !== nothing
                    push!(locations, last_loc)
                else
                    push!(locations, N[1])
                end
                push!(times, t)
            end
        end
        
        # Add to CSV data
        csv_data[!, "MCS_$(m)_Location"] = locations
        csv_data[!, "MCS_$(m)_Location_Type"] = [node in N_g ? "Grid" : "Construction" for node in locations]
        
        # Now build stepwise arrays
        step_times = [times[1]]
        step_locations = [locations[1]]
        for i in 2:length(times)
            if locations[i] != locations[i-1]
                push!(step_times, times[i])
                push!(step_locations, locations[i-1])
            end
            push!(step_times, times[i])
            push!(step_locations, locations[i])
        end
        if !isempty(step_locations)
            plot!(p, step_times, step_locations, color=colors[mod1(m_idx,4)], label="MCS $m", linewidth=2, marker=:circle, markersize=6)
        end
    end
    plot!(p, grid=true)
    
    return p, csv_data
end

function plot_node_map_with_cev(N, N_g, N_c, E, A, model, M, T, D)
    p = plot(title="Node Map with CEV Assignments", xlabel="X", ylabel="Y", aspect_ratio=:equal, legend=:right)
    coords = Dict()
    n_nodes = length(N)
    for (i, node) in enumerate(N)
        angle = 2π * (i-1) / n_nodes
        coords[node] = (5 * cos(angle), 5 * sin(angle))
    end
    # Plot grid nodes (charging)
    scatter!(p, [coords[node][1] for node in N_g], [coords[node][2] for node in N_g], color=:blue, marker=:rect, markersize=12, label="FCS (grid node)")
    # Plot construction nodes (discharging)
    scatter!(p, [coords[node][1] for node in N_c], [coords[node][2] for node in N_c], color=:orange, marker=:circle, markersize=12, label="Construction Node")
    # Plot distances between nodes
    for i in N, j in N
        if i < j
            x1, y1 = coords[i]
            x2, y2 = coords[j]
            plot!(p, [x1, x2], [y1, y2], color=:gray, alpha=0.3, label="" )
            midx, midy = (x1 + x2)/2, (y1 + y2)/2
            annotate!(p, midx, midy, text("$(D[i,j])", :black, 8))
        end
    end
    # Plot CEV assignments (offset around node)
    cev_colors = [:red, :green, :purple, :magenta, :cyan, :black]
    offset_radius = 0.7
    for (e_idx, e) in enumerate(E)
        for (i_idx, node) in enumerate(N)
            if A[i_idx, e] == 1
                angle = 2π * (e_idx-1) / length(E)
                xoff = coords[node][1] + offset_radius * cos(angle)
                yoff = coords[node][2] + offset_radius * sin(angle)
                scatter!(p, [xoff], [yoff], color=cev_colors[mod1(e_idx, length(cev_colors))], marker=:star5, markersize=16, label=(e_idx==1 ? "CEV" : nothing))
                plot!(p, [coords[node][1], xoff], [coords[node][2], yoff], color=cev_colors[mod1(e_idx, length(cev_colors))], alpha=0.7, label="")
            end
        end
    end
    # Show MCS location at first and last time step (one label each)
    mcs_labeled = false
    for (m_idx, m) in enumerate(M)
        for (t_idx, t) in enumerate([first(T), last(T)])
            for node in N
                if value(model[:z][m,node,t]) > 0.5
                    # Shift MCS icon slightly away from the node
                    offset = 0.3
                    x_shift = coords[node][1] + offset
                    y_shift = coords[node][2] + offset
                    scatter!(p, [x_shift], [y_shift], color=:black, marker=:diamond, markersize=14, label=(mcs_labeled ? nothing : (t_idx==1 ? "MCS at start" : "MCS at end")))
                    mcs_labeled = true
                end
            end
        end
    end
    return p
end

function plot_price_emission_factors(lambda_whl_elec, lambda_CO2, T, time_labels)
    # Create separate plots for better visualization
    readable_T, readable_times = create_readable_time_labels(T, time_labels)
    
    # Create CSV data
    csv_data = DataFrame(
        Time_Period = T,
        Time_Label = time_labels,
        Electricity_Price_USD_per_kWh = [lambda_whl_elec[t] for t in T],
        CO2_Emission_Factor_kg_CO2_per_kWh = [lambda_CO2[t] for t in T]
    )
    
    # Electricity Price Plot
    p_electricity = plot(
        title="Electricity Prices Over Time",
        xlabel="Time",
        ylabel="Electricity Price (\$/kWh)",
        legend=:topright,
        grid=true,
        xticks=(readable_T, readable_times),
        size=(900, 500), xrotation=45, bottom_margin=5Plots.mm
    )
    
    # CO2 Emission Factor Plot
    p_emissions = plot(
        title="CO2 Emission Factors Over Time",
        xlabel="Time",
        ylabel="Emission Factor (kg CO2/kWh)",
        legend=:topright,
        grid=true,
        xticks=(readable_T, readable_times)
    )
    
    # Plot data
    price_values = [lambda_whl_elec[t] for t in T]
    emission_values = [lambda_CO2[t] for t in T]
    
    plot!(p_electricity, T, price_values, label="Electricity Price", color=:blue, linewidth=2)
    plot!(p_emissions, T, emission_values, label="CO2 Emission Factor", color=:red, linewidth=2)
    
    # Return the electricity price plot as the main one (for backward compatibility)
    return p_electricity, csv_data
end

end # module 