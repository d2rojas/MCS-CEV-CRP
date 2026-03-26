module DataLoader

using CSV
using DataFrames
using Printf
using LinearAlgebra

export load_all_data

"""
Load all required data from CSV files in the specified directory
"""
function load_all_data(data_dir::String)
    # Load parameters
    params_df = CSV.read(joinpath(data_dir, "parameters.csv"), DataFrame)
    
    # Create a function to safely convert string values to numbers
    function safe_convert(value::Any)
        str_val = string(value)
        # Remove any trailing commas
        str_val = replace(str_val, r",+$" => "")
        try
            # Try to convert to float first
            float_val = parse(Float64, str_val)
            return float_val
        catch e
            # If conversion fails, return the original value
            return value
        end
    end
    
    # Convert values and create parameters dictionary
    params = Dict{Symbol, Any}()
    for row in eachrow(params_df)
        key = Symbol(row.Parameter)
        value = safe_convert(row.Value)
        params[key] = value
    end
    
    # Extract parameters
    eta_ch_dch = Float64(params[:eta_ch_dch])
    MCS_max = Float64(params[:MCS_max])
    MCS_min = Float64(params[:MCS_min])
    MCS_ini = Float64(params[:MCS_ini])
    CH_MCS = Float64(params[:CH_MCS])
    DCH_MCS = Float64(params[:DCH_MCS])
    DCH_MCS_plug = Float64(params[:DCH_MCS_plug])
    C_MCS_plug = Int(round(Float64(params[:C_MCS_plug])))
    k_trv = Float64(params[:k_trv])
    delta_T = Float64(params[:delta_T])
    rho_miss = Float64(params[:rho_miss])

    # Extract parameters
    eta_ch_dch = params[:eta_ch_dch]
    MCS_max = params[:MCS_max]
    MCS_min = params[:MCS_min]
    MCS_ini = params[:MCS_ini]
    CH_MCS = params[:CH_MCS]
    DCH_MCS = params[:DCH_MCS]
    DCH_MCS_plug = params[:DCH_MCS_plug]
    C_MCS_plug = floor(Int, params[:C_MCS_plug])
    k_trv = params[:k_trv]
    delta_T = params[:delta_T]
    rho_miss = params[:rho_miss]

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
    N_g = [1]  # First location is grid node
    N_c = collect(2:length(N))  # Rest are construction sites
    M = [1]  # Single MCS for now

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
    
    # Use the new intensity_tons_emissions column if available, otherwise fall back to lambda_CO2
    if "intensity_tons_emissions" in names(time_df)
        println("Using real CAISO CO2 intensity data from 'intensity_tons_emissions' column")
        lambda_CO2 = time_df.intensity_tons_emissions
    else
        println("Using synthetic CO2 data from 'lambda_CO2' column")
        lambda_CO2 = time_df.lambda_CO2
    end
    
    lambda_whl_elec = time_df.lambda_buy

    # Load work data
    work_df = CSV.read(joinpath(data_dir, "work.csv"), DataFrame)
    time_columns = names(work_df)[3:end]  # Skip Location and EV columns
    
    # Get the maximum location and EV indices from the data
    function get_numeric_value(val)
        if isa(val, Number)
            return Int(val)
        else
            # Try to extract number from string (e.g., "n1" -> 1)
            m = match(r"\d+", string(val))
            return m === nothing ? 1 : parse(Int, m.match)
        end
    end
    
    max_location = maximum(get_numeric_value(row.Location) for row in eachrow(work_df))
    max_ev = maximum(get_numeric_value(row.EV) for row in eachrow(work_df))
    
    # Initialize R_work with the correct dimensions
    R_work = zeros(max_location, max_ev, length(time_columns))
    
    for row in eachrow(work_df)
        # Skip the first row with t1, t2, etc.
        if startswith(string(row[time_columns[1]]), "t")
            continue
        end
        
        # Get location and EV indices
        i = get_numeric_value(row.Location)
        e = get_numeric_value(row.EV)
        
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