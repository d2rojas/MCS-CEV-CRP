# Run the optimization with CSV data
println("Loading data from CSV files in current directory")
model, obj_value, total_energy_from_grid, total_missed_work, total_carbon_emissions, total_electricity_cost = run_optimization_from_csv(".")

# The results will be saved in the current directory
println("\nOptimization completed. Results have been saved to:")
println("- mcs_optimization_results.png")
println("- mcs_routes.png") 