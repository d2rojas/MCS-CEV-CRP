include("simplified_mcs_optimization.jl")

"""
Function to run different scenarios with the simplified model
"""
function run_scenarios()
    println("Running different scenarios with the simplified model...")
    
    # Scenario 1: Base case (1 MCS, 4 CEVs)
    println("\n=== Scenario 1: Base Case (1 MCS, 4 CEVs) ===")
    model1, obj1, energy1, missed1, carbon1, cost1, _, _ = solve_and_analyze_simplified_model()
    
    # Scenario 2: Increased MCS battery capacity
    function run_increased_battery_scenario()
        # Load standard data
        M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug, 
        D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max, 
        SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T = load_simplified_data()
        
        # Modify MCS battery capacity
        SOE_MCS_max = 250.0  # Increased from 150.0
        SOE_MCS_ini = 0.8 * SOE_MCS_max
        
        println("\n=== Scenario 2: Increased MCS Battery Capacity (250 kWh) ===")
        
        # Create and solve the model
        model = create_simplified_mcs_model(
            M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug, 
            D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max, 
            SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
        )
        
        # Solve the model
        set_optimizer_attribute(model, "time_limit", 600.0)
        optimize!(model)
        
        # Extract results
        status = termination_status(model)
        println("Solution status: ", status)
        
        if status == MOI.OPTIMAL || status == MOI.TIME_LIMIT || status == MOI.SOLUTION_LIMIT
            obj_value = objective_value(model)
            P_ch_tot_val = value.(model[:P_ch_tot])
            P_miss_work_val = value.(model[:P_miss_work])
            
            total_energy_from_grid = sum(P_ch_tot_val[m, t] * delta_T for m in M, t in T)
            total_missed_work = sum(P_miss_work_val[i, e, t] * delta_T for i in N_c, e in E, t in T)
            total_carbon_emissions = sum(P_ch_tot_val[m, t] * lambda_CO2[t] * delta_T for m in M, t in T)
            total_electricity_cost = sum(P_ch_tot_val[m, t] * lambda_whl_elec[t] * delta_T for m in M, t in T)
            
            println("Objective value: ", obj_value)
            println("Total energy drawn from grid: ", total_energy_from_grid, " kWh")
            println("Total missed work: ", total_missed_work, " kWh")
            println("Total carbon emissions cost: ", total_carbon_emissions, " \$")
            println("Total electricity cost: ", total_electricity_cost, " \$")
            
            return model, obj_value, total_energy_from_grid, total_missed_work, total_carbon_emissions, total_electricity_cost
        else
            println("Failed to find feasible solution")
            return nothing, nothing, nothing, nothing, nothing, nothing
        end
    end
    
    # Scenario 3: Two MCSs
    function run_two_mcs_scenario()
        # Load standard data
        M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug, 
        D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max, 
        SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T = load_simplified_data()
        
        # Modify to have 2 MCSs
        M = 1:2  # 2 MCSs
        
        println("\n=== Scenario 3: Two MCSs ===")
        
        # Create and solve the model
        model = create_simplified_mcs_model(
            M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug, 
            D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max, 
            SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
        )
        
        # Solve the model
        set_optimizer_attribute(model, "time_limit", 600.0)
        optimize!(model)
        
        # Extract results
        status = termination_status(model)
        println("Solution status: ", status)
        
        if status == MOI.OPTIMAL || status == MOI.TIME_LIMIT || status == MOI.SOLUTION_LIMIT
            obj_value = objective_value(model)
            P_ch_tot_val = value.(model[:P_ch_tot])
            P_miss_work_val = value.(model[:P_miss_work])
            
            total_energy_from_grid = sum(P_ch_tot_val[m, t] * delta_T for m in M, t in T)
            total_missed_work = sum(P_miss_work_val[i, e, t] * delta_T for i in N_c, e in E, t in T)
            total_carbon_emissions = sum(P_ch_tot_val[m, t] * lambda_CO2[t] * delta_T for m in M, t in T)
            total_electricity_cost = sum(P_ch_tot_val[m, t] * lambda_whl_elec[t] * delta_T for m in M, t in T)
            
            println("Objective value: ", obj_value)
            println("Total energy drawn from grid: ", total_energy_from_grid, " kWh")
            println("Total missed work: ", total_missed_work, " kWh")
            println("Total carbon emissions cost: ", total_carbon_emissions, " \$")
            println("Total electricity cost: ", total_electricity_cost, " \$")
            
            return model, obj_value, total_energy_from_grid, total_missed_work, total_carbon_emissions, total_electricity_cost
        else
            println("Failed to find feasible solution")
            return nothing, nothing, nothing, nothing, nothing, nothing
        end
    end
    
    # Run the scenarios
    model2, obj2, energy2, missed2, carbon2, cost2 = run_increased_battery_scenario()
    model3, obj3, energy3, missed3, carbon3, cost3 = run_two_mcs_scenario()
    
    # Compare scenarios
    println("\n=== Scenario Comparison ===")
    println("Metric                | Scenario 1 (Base) | Scenario 2 (Larger Battery) | Scenario 3 (Two MCSs)")
    println("----------------------|-------------------|----------------------------|------------------")
    println("Objective Value       | $(round(obj1, digits=2))          | $(round(obj2, digits=2))                    | $(round(obj3, digits=2))")
    println("Grid Energy (kWh)     | $(round(energy1, digits=2))          | $(round(energy2, digits=2))                    | $(round(energy3, digits=2))")
    println("Missed Work (kWh)     | $(round(missed1, digits=2))          | $(round(missed2, digits=2))                    | $(round(missed3, digits=2))")
    println("Carbon Cost (\$)       | $(round(carbon1, digits=2))          | $(round(carbon2, digits=2))                    | $(round(carbon3, digits=2))")
    println("Electricity Cost (\$)  | $(round(cost1, digits=2))          | $(round(cost2, digits=2))                    | $(round(cost3, digits=2))")
    
    # Calculate percentage improvements
    missed_improvement_s2 = (missed1 - missed2) / missed1 * 100
    missed_improvement_s3 = (missed1 - missed3) / missed1 * 100
    
    println("\nKey Findings:")
    println("  - Scenario 2 (Larger Battery): $(round(missed_improvement_s2, digits=1))% reduction in missed work compared to base case")
    println("  - Scenario 3 (Two MCSs): $(round(missed_improvement_s3, digits=1))% reduction in missed work compared to base case")
    
    # Return the results for further analysis if needed
    return (model1, obj1, energy1, missed1, carbon1, cost1), 
           (model2, obj2, energy2, missed2, carbon2, cost2),
           (model3, obj3, energy3, missed3, carbon3, cost3)
end

# Run the scenarios
scenario_results = run_scenarios()
