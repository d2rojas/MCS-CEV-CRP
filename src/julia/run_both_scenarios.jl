#!/usr/bin/env julia
# Run both scenarios and compare with PDF Tables 4 and 5

using JuMP
using HiGHS
using DataFrames
using CSV
using Printf
using Dates

# Include necessary modules
include("src/DataLoader.jl")
include("src/FullDataLoader_v2.jl")
include("src/MCSOptimizer.jl")

using .DataLoader
using .FullDataLoader_v2
using .MCSOptimizer

function run_scenario(data_dir::String, scenario_name::String)
    println("\n" * "="^60)
    println("Running $scenario_name")
    println("="^60)

    M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
    D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
    SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T, lambda_demand, carbon_price_per_ton, time_labels = FullDataLoader_v2.load_full_dataset(data_dir)

    # Convert dictionary format to vector format
    SOE_CEV_ini = [SOE_CEV_ini[e] for e in E]
    SOE_CEV_max = [SOE_CEV_max[e] for e in E]
    SOE_CEV_min = [SOE_CEV_min[e] for e in E]
    SOE_MCS_ini = [SOE_MCS_ini[m] for m in M]
    SOE_MCS_max = [SOE_MCS_max[m] for m in M]
    SOE_MCS_min = [SOE_MCS_min[m] for m in M]
    lambda_whl_elec = [lambda_whl_elec[t] for t in T]
    lambda_CO2 = [lambda_CO2[t] for t in T]

    # Load time labels
    time_df = CSV.read(joinpath(data_dir, "time_data.csv"), DataFrame)
    t_cols = string.(time_df[!, "Unnamed: 1"])
    actual_time_labels = string.(time_df[!, hasproperty(time_df, :time) ? "time" : "Unnamed: 0"])
    t_to_time = Dict(t_cols[i] => actual_time_labels[i] for i in 1:length(t_cols))
    time_labels_vec = [t_to_time[t] for t in t_cols]

    # Solve
    model, obj_val, total_energy_from_grid, total_missed_work, total_carbon_emissions,
    total_electricity_cost, p_combined, p5, p6, SOE_MCS_min_wide, SOE_MCS_max_wide,
    SOE_CEV_min_wide, SOE_CEV_max_wide, now_str, p_price_emission, mcs_power_plots, p_total_grid,
    mcs_csv_data, total_grid_csv, mcs_soe_csv, cev_soe_csv, work_csv, price_emission_csv, mcs_trajectory_csv = MCSOptimizer.solve_and_analyze(
        M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
        D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
        SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T, time_labels_vec;
        peak_demand_limit = nothing,
        lambda_demand = lambda_demand,
        carbon_price_per_ton = carbon_price_per_ton
    )

    # Compute metrics matching report tables
    # CO2 emissions in kg
    co2_kg = sum(value.(model[:P_ch_tot][m,t]) * lambda_CO2[t] * delta_T for m in M, t in T)
    # Energy cost in $
    energy_cost = sum(value.(model[:P_ch_tot][m,t]) * lambda_whl_elec[t] * delta_T for m in M, t in T)
    # Peak demand in kW
    peak_demand = maximum([sum(value.(model[:P_ch_tot][m,t]) for m in M) for t in T])
    # Missed work in kWh
    missed_work = sum(value.(model[:P_miss_work][i,e,t]) * delta_T for i in N, e in E, t in T)

    println("\n" * "-"^60)
    println("RESULTS for $scenario_name (Strategy D - MCS and Optimal)")
    println("-"^60)
    @printf("CO₂ emissions (kg):  %.2f\n", co2_kg)
    @printf("Energy cost (\$):     %.2f\n", energy_cost)
    @printf("Peak demand (kW):    %.2f\n", peak_demand)
    @printf("Missed work (kWh):   %.2f\n", missed_work)
    @printf("Objective value:     %.2f\n", obj_val)
    println("-"^60)

    return co2_kg, energy_cost, peak_demand, missed_work
end

# Base path
base = dirname(@__DIR__)
base = joinpath(base, "..")
data_base = joinpath(base, "data")

println("Data base directory: ", data_base)

# Run Scenario 1
co2_1, cost_1, peak_1, miss_1 = run_scenario(
    joinpath(data_base, "report_CPR_1", "csv_files"),
    "Scenario 1"
)

# Run Scenario 2
co2_2, cost_2, peak_2, miss_2 = run_scenario(
    joinpath(data_base, "report_CPR_2", "csv_files"),
    "Scenario 2"
)

# Comparison table
println("\n" * "="^70)
println("COMPARISON WITH PDF TABLES 4 AND 5")
println("="^70)
println("                    CO₂(kg)  Cost(\$)  Peak(kW)  Missed(kWh)")
println("-"^70)
@printf("Scenario 1 (ours):  %6.2f   %6.2f    %6.2f     %5.2f\n", co2_1, cost_1, peak_1, miss_1)
@printf("Scenario 1 (PDF):   %6.2f   %6.2f    %6.2f     %5.2f\n", 3.55, 7.47, 8.59, 0.0)
println("-"^70)
@printf("Scenario 2 (ours):  %6.2f   %6.2f    %6.2f     %5.2f\n", co2_2, cost_2, peak_2, miss_2)
@printf("Scenario 2 (PDF):   %6.2f   %6.2f    %6.2f     %5.2f\n", 12.53, 26.22, 17.57, 1.25)
println("="^70)
