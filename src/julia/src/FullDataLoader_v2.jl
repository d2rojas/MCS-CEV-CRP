module FullDataLoader_v2

using CSV
using DataFrames
using Printf
using LinearAlgebra

export load_full_dataset

"""
Load all data from CSV files in the specified directory
"""
function load_full_dataset(data_dir::String)
    println("Loading data from directory: ", data_dir)
    
    # Load parameters
    params_df = CSV.read(joinpath(data_dir, "parameters.csv"), DataFrame)
    params = Dict(row.Parameter => row.Value for row in eachrow(params_df))
    
    # Extract parameters with defaults
    eta_ch_dch = get(params, "eta_ch_dch", 0.95)
    MCS_max = get(params, "MCS_max", 1000.0)
    MCS_min = get(params, "MCS_min", 100.0)
    MCS_ini = get(params, "MCS_ini", 500.0)
    CH_MCS = get(params, "CH_MCS", 50.0)
    DCH_MCS = get(params, "DCH_MCS", 50.0)
    C_MCS_plug = get(params, "C_MCS_plug", 4)
    DCH_MCS_plug = get(params, "DCH_MCS_plug", 50.0)
    rho_miss = get(params, "rho_miss", 0.6)
    delta_T = get(params, "delta_T", 0.5)
    lambda_demand = get(params, "lambda_demand", 0.0)  # Demand charge $/kW (doc Eq. 1, 3rd term)
    carbon_price_per_ton = get(params, "carbon_price_per_ton", 50.0)  # Social cost of carbon $/metric ton (doc: $50)
    num_mcs = get(params, "num_mcs", 3)
    tau_trv = get(params, "k_way", 0.5)  # MCS road energy consumption (kWh/mile) - doc Table 2, Eq 14
    
    # Load EV data
    ev_df = CSV.read(joinpath(data_dir, "ev_data.csv"), DataFrame)
    
    # Handle different column name formats
    if "EV_ID" in names(ev_df)
        E = string.(ev_df[!, "EV_ID"])  # keep as strings for compatibility
    elseif "Unnamed: 0" in names(ev_df)
        E = string.(ev_df[!, "Unnamed: 0"])  # handle 1MCS-1CEV-2nodes format
    else
        error("Neither 'EV_ID' nor 'Unnamed: 0' column found in ev_data.csv")
    end
    
    SOE_CEV_min = Dict(e => row.SOE_min for (e, row) in zip(E, eachrow(ev_df)))
    SOE_CEV_max = Dict(e => row.SOE_max for (e, row) in zip(E, eachrow(ev_df)))
    SOE_CEV_ini = Dict(e => row.SOE_ini for (e, row) in zip(E, eachrow(ev_df)))
    
    # Convert E to integers for optimization
    E_indices = collect(1:length(E))
    SOE_CEV_min = Dict(i => SOE_CEV_min[E[i]] for i in E_indices)
    SOE_CEV_max = Dict(i => SOE_CEV_max[E[i]] for i in E_indices)
    SOE_CEV_ini = Dict(i => SOE_CEV_ini[E[i]] for i in E_indices)
    
    # Per-CEV charging power limit (doc Table 3 / constraint 9); fallback to scalar from params
    if "ch_rate" in names(ev_df)
        CH_CEV = [ev_df[i, "ch_rate"] for i in 1:length(E_indices)]
    else
        ch_default = get(params, "CH_CEV", 50.0)
        CH_CEV = fill(ch_default, length(E_indices))
    end
    
    # Load place data
    place_df = CSV.read(joinpath(data_dir, "place.csv"), DataFrame)
    N = string.(place_df[!, "site"])  # keep as strings for compatibility
    
    # Load distance data
    dist_df = CSV.read(joinpath(data_dir, "distance.csv"), DataFrame)
    dist_sites = names(dist_df)[2:end]  # skip first column (row labels)
    N = dist_sites  # keep as strings for compatibility with work.csv
    
    # Create mapping from numeric IDs to string names (for sample dataset)
    # Based on the work.csv file, location 2.0 corresponds to Node2, location 3.0 corresponds to Node3
    location_mapping = Dict(2.0 => "Node2", 3.0 => "Node3")
    
    # Create mapping from Node names to x1, x2, x3 (for sample dataset)
    node_mapping = Dict("Node1" => "x1", "Node2" => "x2", "Node3" => "x3")
    
    # For 1MCS-1CEV-2nodes dataset, create direct mapping
    if "i1" in N
        # This is the 1MCS-1CEV-2nodes format - extend dynamically for any number of nodes
        node_mapping = Dict{String, String}()
        location_mapping = Dict{String, String}()
        
        # Add all nodes that start with "i"
        for node in N
            if startswith(node, "i")
                node_mapping[node] = node
                location_mapping[node] = node
            end
        end
    end
    
    D = zeros(length(N), length(N))
    for (i, row) in enumerate(eachrow(dist_df))
        for (j, col) in enumerate(dist_sites)
            D[i, j] = row[col]
        end
    end
    
    # Load travel time data
    time_df = CSV.read(joinpath(data_dir, "travel_time.csv"), DataFrame)
    travel_sites = names(time_df)[2:end]  # skip first column (row labels)
    k_trv = zeros(length(N), length(N))
    for (i, row) in enumerate(eachrow(time_df))
        for (j, col) in enumerate(travel_sites)
            k_trv[i, j] = row[col]
        end
    end
    
    # Load time data
    time_df = CSV.read(joinpath(data_dir, "time_data.csv"), DataFrame)
    
    # Handle different column name formats
    if "time" in names(time_df)
        T = Symbol.(time_df[!, "time"])
        time_labels = string.(time_df[!, "time"])
    elseif "Unnamed: 0" in names(time_df)
        T = Symbol.(time_df[!, "Unnamed: 0"])
        time_labels = string.(time_df[!, "Unnamed: 0"])
    else
        error("Neither 'time' nor 'Unnamed: 0' column found in time_data.csv")
    end
    
    T_work = T
    T_rest = T
    
    # Load time-varying prices and emission factors
    lambda_whl_elec = Dict(t => row.lambda_buy for (t, row) in zip(T, eachrow(time_df)))
    
    # Use the new intensity_tons_emissions column if available, otherwise fall back to lambda_CO2
    if "intensity_tons_emissions" in names(time_df)
        println("Using real CAISO CO2 intensity data from 'intensity_tons_emissions' column")
        lambda_CO2 = Dict(t => row.intensity_tons_emissions for (t, row) in zip(T, eachrow(time_df)))
    else
        println("Using synthetic CO2 data from 'lambda_CO2' column")
        lambda_CO2 = Dict(t => row.lambda_CO2 for (t, row) in zip(T, eachrow(time_df)))
    end
    
    # Convert T to integers for optimization
    T_indices = collect(1:length(T))
    
    # Convert price dictionaries to use integer indices
    lambda_whl_elec = Dict(i => lambda_whl_elec[T[i]] for i in T_indices)
    lambda_CO2 = Dict(i => lambda_CO2[T[i]] for i in T_indices)
    
    # Load work data
    work_df = CSV.read(joinpath(data_dir, "work.csv"), DataFrame)
    R_work = zeros(length(N), length(E), length(T))
    for (i, row) in enumerate(eachrow(work_df))
        site_id = row[1]  # This could be numeric (2.0, 3.0) or string (i2, i3)
        ev_id = row[2]    # This could be numeric (1.0, 2.0, 3.0, 4.0) or string (e1, e2, etc.)
        
        # Handle different site ID formats
        if typeof(site_id) <: Number
            # Sample dataset format: numeric site IDs
            site_num = site_id
            site = location_mapping[site_num]
            ev = "EV$(Int(ev_id))"
        else
            # 1MCS-1CEV-2nodes format: string site IDs
            site = string(site_id)  # e.g., "i2" -> "i2"
            ev = string(ev_id)      # e.g., "e1" -> "e1"
        end
        
        # Map Node name to x1, x2, x3 format (or direct mapping for 1MCS-1CEV-2nodes)
        site_mapped = node_mapping[site]
        iN = findfirst(isequal(site_mapped), N)
        iE = findfirst(isequal(ev), E)
        if isnothing(iN) || isnothing(iE)
            @warn "Work data row: site_id=$site_id, ev_id=$ev_id, site=$site, ev=$ev, iN=$iN, iE=$iE, N=$(N), E=$(E)"
            continue
        end
        for (t, time_col) in enumerate(names(work_df)[3:end])
            value = row[time_col]
            if ismissing(value)
                R_work[iN, iE, t] = 0.0
            else
                R_work[iN, iE, t] = value
            end
        end
    end
    
    # Determine grid nodes and construction sites based on the dataset
    N_g = String[]
    N_c = String[]
    for (i, site) in enumerate(N)
        if all(collect(place_df[i, 2:end]) .== 0)
            push!(N_g, site)
        else
            push!(N_c, site)
        end
    end
    
    # Convert N, N_g, and N_c to integers for optimization
    N_indices = collect(1:length(N))
    N_g_indices = [findfirst(isequal(site), N) for site in N_g]
    N_c_indices = [findfirst(isequal(site), N) for site in N_c]
    
    # Set number of MCSs
    M = Symbol.(["mcs$i" for i in 1:num_mcs])
    
    # Convert M to integers for optimization
    M_indices = collect(1:length(M))
    SOE_MCS_ini = Dict(i => MCS_ini for i in M_indices)
    SOE_MCS_max = Dict(i => MCS_max for i in M_indices)
    SOE_MCS_min = Dict(i => MCS_min for i in M_indices)
    
    # Create location matrix A
    A = zeros(Bool, length(N), length(E))
    for (i, site) in enumerate(N)
        for (j, ev) in enumerate(E)
            # For 1MCS-1CEV-2nodes format, use site names directly
            if startswith(site, "i")
                row_idx = findfirst(x -> string(x) == site, place_df[!, "site"])
            else
                # Map x1, x2, x3 back to Node1, Node2, Node3
                node_name = Dict("x1" => "Node1", "x2" => "Node2", "x3" => "Node3")[site]
                row_idx = findfirst(x -> string(x) == node_name, place_df[!, "site"])
            end
            if isnothing(row_idx)
                A[i, j] = false
            else
                A[i, j] = place_df[row_idx, string(ev)] == 1
            end
        end
    end
    
    # Validate data
    validate_data(N_indices, N_g_indices, N_c_indices, E_indices, M_indices, T_indices, A, D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, 
                 SOE_MCS_ini, SOE_MCS_max, SOE_MCS_min, tau_trv)
    
    return M_indices, T_indices, N_indices, N_g_indices, N_c_indices, E_indices, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
           D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
           SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T, lambda_demand, carbon_price_per_ton, time_labels
end

"""
Validate the loaded data
"""
function validate_data(N, N_g, N_c, E, M, T, A, D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min,
                      SOE_MCS_ini, SOE_MCS_max, SOE_MCS_min, tau_trv)
    # Check dimensions
    @assert size(A) == (length(N), length(E)) "Location matrix A has incorrect dimensions"
    @assert size(D) == (length(N), length(N)) "Distance matrix D has incorrect dimensions"
    @assert size(k_trv) == (length(N), length(N)) "Travel time matrix k_trv has incorrect dimensions"
    @assert size(R_work) == (length(N), length(E), length(T)) "Work matrix R_work has incorrect dimensions"
    
    # Check non-negative values
    @assert all(x >= 0 for x in D) "Distance matrix contains negative values"
    @assert all(x >= 0 for x in k_trv) "Travel time matrix contains negative values"
    @assert all(x >= 0 for x in R_work) "Work matrix contains negative values"
    
    # Check symmetry of distance and travel time matrices
    @assert D == D' "Distance matrix is not symmetric"
    @assert k_trv == k_trv' "Travel time matrix is not symmetric"
    
    # Check that each CEV is assigned to exactly one location
    for e in E
        @assert sum(A[:, findfirst(isequal(e), E)]) == 1 "CEV $e is not assigned to exactly one location"
    end
    
    # Check that no CEVs are assigned to grid nodes
    for i in findall(x -> x in N_g, N)
        @assert all(A[i,:] .== 0) "CEVs are assigned to grid node $(N[i])"
    end
    
    # Check SOE bounds
    for e in E
        @assert SOE_CEV_min[e] <= SOE_CEV_ini[e] <= SOE_CEV_max[e] "Invalid initial SOE for CEV $e"
    end
    
    for m in M
        @assert SOE_MCS_min[m] <= SOE_MCS_ini[m] <= SOE_MCS_max[m] "Invalid initial SOE for MCS $m"
    end
    
    println("Data validation completed successfully")
end

end # module 