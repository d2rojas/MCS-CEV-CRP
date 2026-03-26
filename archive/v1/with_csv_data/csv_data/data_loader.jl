module DataLoader

using CSV
using DataFrames
using Dates
using Printf

"""
Base validation functions for data loading
"""
function validate_file_exists(file_path::String)
    if !isfile(file_path)
        error("File not found: $file_path")
    end
end

function validate_required_columns(df::DataFrame, required_columns::Vector{String})
    missing_columns = setdiff(required_columns, names(df))
    if !isempty(missing_columns)
        error("Missing required columns: $missing_columns")
    end
end

function validate_non_negative(df::DataFrame, columns::Vector{String})
    for col in columns
        if col in names(df)
            if any(x -> x < 0, df[!, col])
                error("Column $col contains negative values")
            end
        end
    end
end

function validate_binary_values(df::DataFrame, columns::Vector{String})
    for col in columns
        if col in names(df)
            if !all(x -> x == 0 || x == 1, df[!, col])
                error("Column $col contains non-binary values")
            end
        end
    end
end

"""
Load parameters from a CSV file
"""
function load_parameters(data_dir::String)
    file_path = joinpath(data_dir, "parameters.csv")
    validate_file_exists(file_path)
    
    df = CSV.read(file_path, DataFrame)
    required_columns = ["Parameter", "Value", "Unit", "Description"]
    validate_required_columns(df, required_columns)
    
    # Convert values to appropriate types
    params = Dict{String, Any}()
    for row in eachrow(df)
        param_name = row.Parameter
        value_str = row.Value
        
        # Try to convert to numeric
        try
            numeric_value = parse(Float64, value_str)
            params[param_name] = numeric_value
        catch
            # Keep as string if not numeric
            params[param_name] = value_str
        end
    end
    
    # Validate required parameters
    required_params = ["eta_ch_dch", "MCS_max", "MCS_min", "MCS_ini", 
                      "CH_MCS", "DCH_MCS", "DCH_MCS_plug", "C_MCS_plug", 
                      "k_trv", "delta_T", "rho_miss"]
    
    missing_params = setdiff(required_params, keys(params))
    if !isempty(missing_params)
        error("Missing required parameters: $missing_params")
    end
    
    # Validate parameter values
    if haskey(params, "eta_ch_dch") && !(0 < params["eta_ch_dch"] <= 1)
        error("eta_ch_dch must be between 0 and 1")
    end
    
    if haskey(params, "MCS_max") && params["MCS_max"] <= 0
        error("MCS_max must be positive")
    end
    
    if haskey(params, "MCS_min") && params["MCS_min"] < 0
        error("MCS_min must be non-negative")
    end
    
    if haskey(params, "MCS_ini") && (params["MCS_ini"] < params["MCS_min"] || params["MCS_ini"] > params["MCS_max"])
        error("MCS_ini must be between MCS_min and MCS_max")
    end
    
    return params
end

"""
Load EV data from a CSV file
"""
function load_ev_data(file_path::String)
    validate_file_exists(file_path)
    
    df = CSV.read(file_path, DataFrame)
    
    # Check if the first column is unnamed and use it as index
    if startswith(names(df)[1], "Unnamed")
        ev_ids = df[!, 1]
        df = select(df, Not(1))
        
        # Set EV IDs as row names
        df.EV_ID = ev_ids
    end
    
    required_columns = ["SOE_min", "SOE_max", "SOE_ini", "ch_rate"]
    validate_required_columns(df, required_columns)
    
    # Convert to numeric
    for col in required_columns
        df[!, col] = convert.(Float64, df[!, col])
    end
    
    # Validate non-negative values
    validate_non_negative(df, required_columns)
    
    # Additional validation
    if any(df.SOE_min .> df.SOE_max)
        error("Minimum SOE must be less than or equal to maximum SOE")
    end
    
    if any(df.SOE_ini .< df.SOE_min)
        error("Initial SOE must be greater than or equal to minimum SOE")
    end
    
    if any(df.SOE_ini .> df.SOE_max)
        error("Initial SOE must be less than or equal to maximum SOE")
    end
    
    # Create dictionaries for the model
    E = 1:nrow(df)
    SOE_CEV_min = Dict(e => df[e, :SOE_min] for e in E)
    SOE_CEV_max = Dict(e => df[e, :SOE_max] for e in E)
    SOE_CEV_ini = Dict(e => df[e, :SOE_ini] for e in E)
    CH_CEV = Dict(e => df[e, :ch_rate] for e in E)
    
    return E, SOE_CEV_min, SOE_CEV_max, SOE_CEV_ini, CH_CEV
end

"""
Load distance matrix from a CSV file
"""
function load_distance_matrix(file_path::String)
    validate_file_exists(file_path)
    
    df = CSV.read(file_path, DataFrame)
    
    # Remove the Node column if it exists
    if "Node" in names(df)
        df = select(df, Not("Node"))
    end
    
    # Convert all values to numeric
    n = nrow(df)
    D = zeros(n, n)
    for i in 1:n
        for j in 1:n
            D[i,j] = parse(Float64, string(df[i,j]))
        end
    end
    
    # Validate diagonal is zero
    for i in 1:n
        if D[i,i] != 0
            error("Diagonal elements of distance matrix must be zero")
        end
    end
    
    return D
end

"""
Load travel time matrix from a CSV file
"""
function load_travel_time_matrix(file_path::String)
    validate_file_exists(file_path)
    
    df = CSV.read(file_path, DataFrame)
    
    # Remove the Node column if it exists
    if "Node" in names(df)
        df = select(df, Not("Node"))
    end
    
    # Convert all values to numeric
    n = nrow(df)
    tau_trv = zeros(Int, n, n)
    for i in 1:n
        for j in 1:n
            tau_trv[i,j] = parse(Int, string(df[i,j]))
        end
    end
    
    # Validate diagonal is zero
    for i in 1:n
        if tau_trv[i,i] != 0
            error("Diagonal elements of travel time matrix must be zero")
        end
    end
    
    return tau_trv
end

"""
Load place data from a CSV file
"""
function load_place_data(file_path::String)
    validate_file_exists(file_path)
    
    df = CSV.read(file_path, DataFrame)
    
    # Get dimensions
    num_nodes = nrow(df)
    num_evs = ncol(df) - 1  # Subtract 1 for the site column
    
    # Create binary matrix A
    A = zeros(Int, num_nodes, num_evs)
    for i in 1:num_nodes
        for j in 1:num_evs
            A[i,j] = df[i, j+1]  # j+1 because first column is site names
        end
    end
    
    # Create sets
    N = 1:num_nodes
    N_g = [1]  # First node is grid node
    N_c = collect(2:num_nodes)  # Rest are construction sites
    
    return N, N_g, N_c, A
end

"""
Load time data from a CSV file
"""
function load_time_data(file_path::String)
    validate_file_exists(file_path)
    
    df = CSV.read(file_path, DataFrame)
    required_columns = ["time", "lambda_CO2", "lambda_buy"]
    validate_required_columns(df, required_columns)
    
    # Convert values to numeric
    df.lambda_buy = convert.(Float64, df.lambda_buy)
    df.lambda_CO2 = convert.(Float64, df.lambda_CO2)
    
    # Create dictionaries for the model
    T = 1:nrow(df)
    lambda_whl_elec = Dict(t => df[t, :lambda_buy] for t in T)
    lambda_CO2 = Dict(t => df[t, :lambda_CO2] for t in T)
    
    return T, lambda_whl_elec, lambda_CO2
end

"""
Load work data from a CSV file
"""
function load_work_data(file_path::String)
    validate_file_exists(file_path)
    
    df = CSV.read(file_path, DataFrame)
    
    # Get dimensions
    num_nodes = Int(maximum(df.Location))
    num_evs = Int(maximum(df.EV))
    num_times = ncol(df) - 2  # Subtract Location and EV columns
    
    # Create work requirements array
    R_work = zeros(Float64, num_nodes, num_evs, num_times)
    
    # Fill the array
    for row in eachrow(df)
        i = Int(row.Location)
        e = Int(row.EV)
        for t in 1:num_times
            R_work[i, e, t] = row[t+2]  # +2 because first two columns are Location and EV
        end
    end
    
    return R_work
end

"""
Load all data from CSV files
"""
function load_all_data(data_dir::String)
    # Load parameters
    params = load_parameters(data_dir)
    
    # Load time data
    T, lambda_whl_elec, lambda_CO2 = load_time_data(joinpath(data_dir, "time_data.csv"))
    
    # Load place data
    N, N_g, N_c, A = load_place_data(joinpath(data_dir, "place.csv"))
    
    # Load distance matrix
    D = load_distance_matrix(joinpath(data_dir, "distance.csv"))
    
    # Load travel time matrix
    tau_trv = load_travel_time_matrix(joinpath(data_dir, "travel_time.csv"))
    
    # Load EV data
    E, SOE_CEV_min, SOE_CEV_max, SOE_CEV_ini, CH_CEV = load_ev_data(joinpath(data_dir, "ev_data.csv"))
    
    # Load work data
    R_work = load_work_data(joinpath(data_dir, "work.csv"))
    
    # Extract parameters
    eta_ch_dch = Float64(params["eta_ch_dch"])
    MCS_max = Float64(params["MCS_max"])
    MCS_min = Float64(params["MCS_min"])
    MCS_ini = Float64(params["MCS_ini"])
    CH_MCS = Float64(params["CH_MCS"])
    DCH_MCS = Float64(params["DCH_MCS"])
    DCH_MCS_plug = Float64(params["DCH_MCS_plug"])
    C_MCS_plug = Int(params["C_MCS_plug"])
    k_trv = Float64(params["k_trv"])
    delta_T = Float64(params["delta_T"])
    rho_miss = Float64(params["rho_miss"])
    
    # Create MCS set (assuming one MCS for now)
    M = 1:1
    
    # Create dictionaries for MCS parameters
    SOE_MCS_max = MCS_max
    SOE_MCS_min = MCS_min
    SOE_MCS_ini = MCS_ini
    
    return M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
           D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
           SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
end

end # module
