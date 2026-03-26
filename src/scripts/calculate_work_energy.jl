using CSV, DataFrames

# Load work data
work_df = CSV.read("1MCS-1CEV-2nodes-24hours/csv_files/work.csv", DataFrame)

# Get time columns (skip Location and EV columns)
time_columns = names(work_df)[3:end]

# Calculate total work energy
global total_work_energy = 0.0
delta_T = 0.25  # hours (from parameters.csv)

println("=== Work Energy Calculation ===")
println("Time step duration (delta_T): $delta_T hours")
println()

# Calculate work for each row
for row in eachrow(work_df)
    location = row[1]
    ev = row[2]
    
    row_energy = 0.0
    work_periods = 0
    
    for (t, col) in enumerate(time_columns)
        power = parse(Float64, string(row[col]))
        if power > 0
            energy = power * delta_T
            row_energy += energy
            work_periods += 1
            println("Time $t ($col): Power = $(power) kW, Energy = $(energy) kWh")
        end
    end
    
    total_work_energy += row_energy
    println("$location, $ev: Total energy = $(row_energy) kWh over $work_periods time periods")
    println()
end

println("=== SUMMARY ===")
println("Total work energy required: $total_work_energy kWh")
println()

# Verify the calculation
println("=== VERIFICATION ===")
println("From work.csv:")
println("- CEV e1 at location i2")
println("- Work periods: 08:00-11:45 (16 periods) and 15:00-18:45 (16 periods)")
println("- Power during work: 2.5 kW")
println("- Time step: 0.25 hours")
println("- Total periods with work: 32")
println("- Calculation: 32 periods × 2.5 kW × 0.25 hours = 20 kWh")
println()
println("Wait, this doesn't match the 12.5 kWh reported...")
println("Let me check if there are any constraints or if only some work is being completed...") 