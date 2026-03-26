using CSV
using DataFrames
using Random
using Dates
using Printf

"""
Script to create sample CSV data files for the MCS optimization model
"""

function create_sample_data(output_dir::String)
    # Create output directory if it doesn't exist
    mkpath(output_dir)
    
    # Set random seed for reproducibility
    Random.seed!(42)
    
    # Create parameters.csv
    create_parameters_file(output_dir)
    
    # Create ev_data.csv
    create_ev_data_file(output_dir)
    
    # Create place.csv
    create_place_data_file(output_dir)
    
    # Create distance.csv
    create_distance_matrix_file(output_dir)
    
    # Create travel_time.csv
    create_travel_time_matrix_file(output_dir)
    
    # Create time_data.csv
    create_time_data_file(output_dir)
    
    # Create work.csv
    create_work_data_file(output_dir)
    
    println("Sample data files created in directory: $output_dir")
end

function create_parameters_file(output_dir::String)
    # Define parameters
    parameters = [
        ("eta_ch_dch", 0.95, "", "Charging/discharging efficiency of the MCS"),
        ("MCS_max", 150.0, "kWh", "Maximum SOE of MCS's battery"),
        ("MCS_min", 30.0, "kWh", "Minimum SOE of MCS's battery"),
        ("MCS_ini", 120.0, "kWh", "Initial SOE of MCS's battery"),
        ("CH_MCS", 100.0, "kW", "Charging power rate of MCSs"),
        ("DCH_MCS", 100.0, "kW", "Discharging power rate of MCSs"),
        ("DCH_MCS_plug", 50.0, "kW", "Discharging power rate of each plug mounted on MCSs"),
        ("C_MCS_plug", 2, "", "Number of plugs on MCSs"),
        ("k_trv", 0.5, "kWh/mile", "Energy consumed per mile during the travel of MCS"),
        ("delta_T", 0.5, "hour", "Time interval"),
        ("rho_miss", 100.0, "\$/kW", "Penalty cost for missed work"),
        ("num_MCS", 1, "", "Number of MCSs")
    ]
    
    # Create DataFrame
    df = DataFrame(Parameter = first.(parameters),
                  Value = string.(getindex.(parameters, 2)),
                  Unit = getindex.(parameters, 3),
                  Description = getindex.(parameters, 4))
    
    # Write to CSV
    CSV.write(joinpath(output_dir, "parameters.csv"), df)
end

function create_ev_data_file(output_dir::String)
    # Define EV data
    ev_count = 4
    ev_ids = ["EV$i" for i in 1:ev_count]
    
    # Create DataFrame
    df = DataFrame(
        EV_ID = ev_ids,
        SOE_min = [4.0, 4.0, 4.0, 4.0],
        SOE_max = [20.0, 20.0, 20.0, 20.0],
        SOE_ini = [20.0, 20.0, 20.0, 20.0],
        ch_rate = [25.0, 25.0, 25.0, 25.0]
    )
    
    # Write to CSV
    CSV.write(joinpath(output_dir, "ev_data.csv"), df)
end

function create_place_data_file(output_dir::String)
    # Define place data
    node_count = 3  # 1 grid node + 2 construction sites
    ev_count = 4
    
    # Create DataFrame
    df = DataFrame(site = ["Node$i" for i in 1:node_count])
    
    # Add EV columns (binary values)
    for i in 1:ev_count
        df[!, "EV$i"] = zeros(Int, node_count)
    end
    
    # Assign EVs to construction sites
    # EVs 1-2 at construction site 1 (Node2)
    df[2, "EV1"] = 1
    df[2, "EV2"] = 1
    
    # EVs 3-4 at construction site 2 (Node3)
    df[3, "EV3"] = 1
    df[3, "EV4"] = 1
    
    # Write to CSV
    CSV.write(joinpath(output_dir, "place.csv"), df)
end

function create_distance_matrix_file(output_dir::String)
    # Define distance matrix
    node_count = 3
    
    # Create distance matrix
    D = zeros(node_count, node_count)
    
    # Grid node to construction sites
    D[1, 2] = 2.0; D[2, 1] = 2.0  # Grid node to/from construction site 1
    D[1, 3] = 3.0; D[3, 1] = 3.0  # Grid node to/from construction site 2
    
    # Between construction sites
    D[2, 3] = 1.5; D[3, 2] = 1.5  # Between construction sites
    
    # Create DataFrame
    df = DataFrame(D, :auto)
    
    # Add node names
    node_names = ["Node$i" for i in 1:node_count]
    df.Node = node_names
    
    # Reorder columns to put Node first
    df = df[!, vcat(["Node"], names(df)[1:end-1])]
    
    # Write to CSV
    CSV.write(joinpath(output_dir, "distance.csv"), df)
end

function create_travel_time_matrix_file(output_dir::String)
    # Define travel time matrix
    node_count = 3
    
    # Create travel time matrix (in time intervals)
    tau_trv = zeros(Int, node_count, node_count)
    
    # Grid node to construction sites
    tau_trv[1, 2] = 1; tau_trv[2, 1] = 1  # Grid node to/from construction site 1
    tau_trv[1, 3] = 1; tau_trv[3, 1] = 1  # Grid node to/from construction site 2
    
    # Between construction sites
    tau_trv[2, 3] = 1; tau_trv[3, 2] = 1  # Between construction sites
    
    # Create DataFrame
    df = DataFrame(tau_trv, :auto)
    
    # Add node names
    node_names = ["Node$i" for i in 1:node_count]
    df.Node = node_names
    
    # Reorder columns to put Node first
    df = df[!, vcat(["Node"], names(df)[1:end-1])]
    
    # Write to CSV
    CSV.write(joinpath(output_dir, "travel_time.csv"), df)
end

function create_time_data_file(output_dir::String)
    # Define time data
    time_count = 12  # 12 time intervals (6 hours with 30-min intervals)
    
    # Create time labels
    time_labels = []
    for t in 1:time_count
        hour = 7 + div(t-1, 2)
        minute = (t-1) % 2 * 30
        push!(time_labels, @sprintf("%02d:%02d", hour, minute))
    end
    
    # Create DataFrame
    df = DataFrame(
        time = time_labels,
        lambda_CO2 = fill(0.05, time_count),
        lambda_buy = fill(0.1, time_count)
    )
    
    # Write to CSV
    CSV.write(joinpath(output_dir, "time_data.csv"), df)
end

function create_work_data_file(output_dir::String)
    # Define work data
    node_count = 3
    ev_count = 4
    time_count = 12
    
    # Create time labels
    time_labels = []
    for t in 1:time_count
        hour = 7 + div(t-1, 2)
        minute = (t-1) % 2 * 30
        push!(time_labels, @sprintf("%02d:%02d", hour, minute))
    end
    
    # Create DataFrame
    df = DataFrame()
    df.Location = []
    df.EV = []
    
    # Add time columns
    for t in time_labels
        df[!, t] = []
    end
    
    # Define work requirements - simplified pattern
    # Morning work: time intervals 3-6
    # Afternoon work: time intervals 9-12
    morning_intervals = 3:6
    afternoon_intervals = 9:12
    
    # Add rows for each EV at each construction site
    for i in 2:node_count  # Construction sites start at index 2
        for e in 1:ev_count
            # Only add rows for EVs assigned to this site
            if (i == 2 && e <= 2) || (i == 3 && e >= 3)
                row = zeros(time_count + 2)
                row[1] = i  # Location
                row[2] = e  # EV
                
                # Assign work requirements
                for t in morning_intervals
                    row[t+2] = 15.0  # 60% of max power (25 kW)
                end
                
                for t in afternoon_intervals
                    row[t+2] = 15.0  # 60% of max power (25 kW)
                end
                
                push!(df, row)
            end
        end
    end
    
    # Write to CSV
    CSV.write(joinpath(output_dir, "work.csv"), df)
end

# If this script is run directly, create sample data
if abspath(PROGRAM_FILE) == @__FILE__
    # Check if output directory is provided as command line argument
    if length(ARGS) > 0
        output_dir = ARGS[1]
    else
        # Default output directory
        output_dir = "data"
    end
    
    create_sample_data(output_dir)
end
