module FullDataLoader

using CSV
using DataFrames
using Printf
using LinearAlgebra

export load_full_dataset

"""
Load data from the full dataset format
"""
function load_full_dataset(data_dir::String)
    # Load parameters
    params_df = CSV.read(joinpath(data_dir, "parameters.csv"), DataFrame)
    
    # Create parameters dictionary
    params = Dict{Symbol, Any}()
    for row in eachrow(params_df)
        key = Symbol(row.Parameter)
        value = parse(Float64, string(row.Value))
        params[key] = value
    end
    
    # Extract parameters
    eta_ch_dch = get(params, :eta_ch_dch, 0.95)
    MCS_max = get(params, :MCS_max, 100.0)
    MCS_min = get(params, :MCS_min, 10.0)
    MCS_ini = get(params, :MCS_ini, 50.0)
    CH_MCS = get(params, :CH_MCS, 50.0)
    DCH_MCS = get(params, :DCH_MCS, 50.0)
    DCH_MCS_plug = get(params, :DCH_MCS_plug, 10.0)
    C_MCS_plug = Int(round(get(params, :C_MCS_plug, 10)))
    k_trv = get(params, :k_trv, 50.0)
    delta_T = get(params, :delta_T, 0.25)
    rho_miss = get(params, :rho_miss, 1000.0)
    num_mcs = Int(round(get(params, :num_mcs, 1)))

    # Extract MCS parameters
    SOE_MCS_max = MCS_max
    SOE_MCS_min = MCS_min
    SOE_MCS_ini = MCS_ini

    # Load EV data
    ev_df = CSV.read(joinpath(data_dir, "ev_data.csv"), DataFrame)
    E = 1:nrow(ev_df)
    SOE_CEV_min = ev_df.SOE_min
    SOE_CEV_max = ev_df.SOE_max
    SOE_CEV_ini = ev_df.SOE_ini
    CH_CEV = ev_df.ch_rate

    # Load place data
    place_df = CSV.read(joinpath(data_dir, "place.csv"), DataFrame)
    N = 1:nrow(place_df)
    
    # Determine grid nodes and construction sites based on site numbers
    N_g = Int[]
    N_c = Int[]
    for (i, row) in enumerate(eachrow(place_df))
        site_num = parse(Int, string(row[1]))
        if site_num < 10
            push!(N_g, i)
        else
            push!(N_c, i)
        end
    end
    
    # If no grid nodes found, use default
    if isempty(N_g)
        N_g = [1]
        N_c = collect(2:length(N))
    end
    
    # Set number of MCSs
    M = 1:num_mcs

    # Create location matrix
    A = zeros(Int, length(N), length(E))
    for (i, row) in enumerate(eachrow(place_df))
        for (e, val) in enumerate(row[2:end])
            A[i,e] = val
        end
    end

    # Load distance matrix
    D = Matrix(CSV.read(joinpath(data_dir, "distance.csv"), DataFrame)[:, 2:end])

    # Load travel time matrix
    tau_trv = Matrix(CSV.read(joinpath(data_dir, "travel_time.csv"), DataFrame)[:, 2:end])

    # Load time data
    time_df = CSV.read(joinpath(data_dir, "time_data.csv"), DataFrame)
    T = 1:nrow(time_df)
    lambda_CO2 = time_df.lambda_CO2
    lambda_whl_elec = time_df.lambda_buy

    # Load work data
    work_df = CSV.read(joinpath(data_dir, "work.csv"), DataFrame)
    time_columns = names(work_df)[3:end]  # Skip Location and EV columns
    
    # Initialize R_work with the correct dimensions
    R_work = zeros(length(N), length(E), length(time_columns))
    
    for row in eachrow(work_df)
        # Get location and EV indices
        i = parse(Int, string(row.Location))
        e = parse(Int, string(row.EV))
        
        for (t, col) in enumerate(time_columns)
            R_work[i,e,t] = parse(Float64, string(row[col]))
        end
    end

    # Validate data
    validate_data(
        M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
        D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
        SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
    )

    return M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
           D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
           SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
end

"""
Validate loaded data
"""
function validate_data(
    M, T, N, N_g, N_c, E, A, C_MCS_plug, CH_MCS, CH_CEV, DCH_MCS, DCH_MCS_plug,
    D, k_trv, R_work, SOE_CEV_ini, SOE_CEV_max, SOE_CEV_min, SOE_MCS_ini, SOE_MCS_max,
    SOE_MCS_min, tau_trv, lambda_whl_elec, lambda_CO2, rho_miss, eta_ch_dch, delta_T
)
    # Check dimensions
    @assert size(D) == (length(N), length(N)) "Distance matrix dimensions mismatch"
    @assert size(tau_trv) == (length(N), length(N)) "Travel time matrix dimensions mismatch"
    @assert size(R_work) == (length(N), length(E), length(T)) "Work requirements dimensions mismatch"
    @assert size(A) == (length(N), length(E)) "Location matrix dimensions mismatch"

    # Check values
    @assert 0 < eta_ch_dch <= 1 "Efficiency must be between 0 and 1"
    @assert SOE_MCS_min <= SOE_MCS_ini <= SOE_MCS_max "Invalid MCS energy limits"
    @assert all(SOE_CEV_min .<= SOE_CEV_ini .<= SOE_CEV_max) "Invalid CEV energy limits"
    @assert all(D .>= 0) "Negative distances not allowed"
    @assert all(tau_trv .>= 0) "Negative travel times not allowed"
    @assert all(R_work .>= 0) "Negative work requirements not allowed"
    @assert all(A .>= 0) "Negative location values not allowed"
    @assert all(lambda_CO2 .>= 0) "Negative CO2 prices not allowed"
    @assert all(lambda_whl_elec .>= 0) "Negative electricity prices not allowed"
    @assert rho_miss >= 0 "Negative missed work penalty not allowed"
    @assert delta_T > 0 "Non-positive time interval not allowed"

    # Check diagonal elements
    @assert all(diag(D) .== 0) "Distance matrix diagonal must be zero"
    @assert all(diag(tau_trv) .== 0) "Travel time matrix diagonal must be zero"

    # Check symmetry
    @assert all(D .== D') "Distance matrix must be symmetric"
    @assert all(tau_trv .== tau_trv') "Travel time matrix must be symmetric"

    # Check CEV assignments
    @assert all(sum(A, dims=1) .== 1) "Each CEV must be assigned to exactly one location"
    @assert all(A[1,:] .== 0) "No CEVs should be assigned to grid node"
end

end # module 