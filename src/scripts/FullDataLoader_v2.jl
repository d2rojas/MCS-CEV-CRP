using CSV
using DataFrames

function load_full_dataset(base_path::String)
    # Load site data
    place_df = CSV.read(joinpath(base_path, "place.csv"), DataFrame)
    site_labels = place_df[!, "site"]
    site_indices = place_df[!, "site"]
    
    # Create mapping from site labels to indices
    site_to_index = Dict(label => idx for (label, idx) in zip(site_labels, site_indices))
    
    # Load distance and travel time matrices
    distance_df = CSV.read(joinpath(base_path, "distance.csv"), DataFrame)
    travel_time_df = CSV.read(joinpath(base_path, "travel_time.csv"), DataFrame)
    
    # Get the site indices from the distance matrix
    distance_sites = names(distance_df)[2:end]  # Skip the first column (Location)
    
    # Create matrices using the site indices
    n_sites = length(distance_sites)
    distance_matrix = zeros(n_sites, n_sites)
    travel_time_matrix = zeros(n_sites, n_sites)
    
    # Fill matrices using the site indices
    for (i, site_i) in enumerate(distance_sites)
        for (j, site_j) in enumerate(distance_sites)
            distance_matrix[i, j] = distance_df[!, site_j][i]
            travel_time_matrix[i, j] = travel_time_df[!, site_j][i]
        end
    end
    
    # Load work data
    work_df = CSV.read(joinpath(base_path, "work.csv"), DataFrame)
    
    # Load EV data
    ev_df = CSV.read(joinpath(base_path, "ev_data.csv"), DataFrame)
    
    # Create EV data dictionary
    ev_data = Dict{String, Dict{String, Float64}}()
    for row in eachrow(ev_df)
        ev_id = row[1]
        ev_data[ev_id] = Dict(
            "SOE_min" => row.SOE_min,
            "SOE_max" => row.SOE_max,
            "SOE_ini" => row.SOE_ini,
            "ch_rate" => row.ch_rate
        )
    end
    
    # Create work data dictionary
    work_data = Dict{String, Dict{String, Vector{Float64}}}()
    for row in eachrow(work_df)
        location = row.Location
        ev = row.EV
        work_data[location] = Dict(ev => collect(row[3:end]))
    end
    
    return (
        site_labels=site_labels,
        site_indices=site_indices,
        site_to_index=site_to_index,
        distance_matrix=distance_matrix,
        travel_time_matrix=travel_time_matrix,
        ev_data=ev_data,
        work_data=work_data
    )
end

# Main execution
base_path = "dataset_full/csv_files"
data = load_full_dataset(base_path)

# Display loaded data
println("\nLoaded Data Summary:")
println("-------------------")
println("Number of sites: ", length(data.site_labels))
println("\nSite Labels: ", data.site_labels)
println("\nSite Indices: ", data.site_indices)
println("\nDistance Matrix Size: ", size(data.distance_matrix))
println("\nTravel Time Matrix Size: ", size(data.travel_time_matrix))
println("\nNumber of EVs: ", length(data.ev_data))
println("\nNumber of Work Locations: ", length(data.work_data))

# Display first few entries of each data structure
println("\nFirst few EV data entries:")
for (ev_id, ev_info) in first(data.ev_data, 3)
    println("EV $ev_id: ", ev_info)
end

println("\nFirst few work data entries:")
for (loc, work_info) in first(data.work_data, 3)
    println("Location $loc: ", keys(work_info))
end 