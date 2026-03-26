import os
import pandas as pd
import re
from pathlib import Path

# Paths
SRC_DIR = Path('dataset_full/csv_files')
DST_DIR = Path('dataset_full/converted_csv_files')
DST_DIR.mkdir(parents=True, exist_ok=True)

# Helper: map string IDs to numeric indices
location_map = {}
ev_map = {}
location_counter = 1
ev_counter = 1

def get_location_idx(loc):
    global location_counter
    if loc not in location_map:
        location_map[loc] = location_counter
        location_counter += 1
    return location_map[loc]

def get_ev_idx(ev):
    global ev_counter
    if ev not in ev_map:
        ev_map[ev] = ev_counter
        ev_counter += 1
    return ev_map[ev]

def convert_work_csv():
    df = pd.read_csv(SRC_DIR / 'work.csv')
    # Convert Location and EV columns
    df['Location'] = df['Location'].apply(get_location_idx)
    df['EV'] = df['EV'].apply(get_ev_idx)
    # Convert time columns to HH:MM and aggregate 15-min to 30-min intervals
    time_cols = [col for col in df.columns if re.match(r'\d{2}:\d{2}:\d{2}', col)]
    # Map to HH:MM
    new_time_cols = sorted(set([c[:5] for c in time_cols]))
    agg_data = {col: [] for col in new_time_cols}
    for idx, row in df.iterrows():
        vals = row[time_cols].values.astype(float)
        # Aggregate pairs of 15-min intervals to 30-min (sum or mean as needed)
        agg_vals = []
        for i in range(0, len(vals), 2):
            if i+1 < len(vals):
                agg_vals.append(vals[i] + vals[i+1])
            else:
                agg_vals.append(vals[i])
        for j, col in enumerate(new_time_cols):
            agg_data[col].append(agg_vals[j])
    # Build new DataFrame
    out_df = df[['Location', 'EV']].copy()
    for col in new_time_cols:
        out_df[col] = agg_data[col]
    out_df.to_csv(DST_DIR / 'work.csv', index=False)

def convert_ev_data_csv():
    df = pd.read_csv(SRC_DIR / 'ev_data.csv')
    # If EV column is present, map to index
    if 'EV' in df.columns:
        df['EV'] = df['EV'].apply(get_ev_idx)
    df.to_csv(DST_DIR / 'ev_data.csv', index=False)

def convert_place_csv():
    df = pd.read_csv(SRC_DIR / 'place.csv')
    # Map location names to indices
    df.iloc[:,0] = df.iloc[:,0].apply(get_location_idx)
    df.to_csv(DST_DIR / 'place.csv', index=False)

def convert_distance_csv():
    df = pd.read_csv(SRC_DIR / 'distance.csv')
    # Map location names to indices if needed
    if not df.columns[0].isdigit():
        df.iloc[:,0] = df.iloc[:,0].apply(get_location_idx)
        df.columns = [get_location_idx(c) if not str(c).isdigit() else c for c in df.columns]
    df.to_csv(DST_DIR / 'distance.csv', index=False)

def convert_travel_time_csv():
    df = pd.read_csv(SRC_DIR / 'travel_time.csv')
    # Map location names to indices if needed
    if not df.columns[0].isdigit():
        df.iloc[:,0] = df.iloc[:,0].apply(get_location_idx)
        df.columns = [get_location_idx(c) if not str(c).isdigit() else c for c in df.columns]
    df.to_csv(DST_DIR / 'travel_time.csv', index=False)

def convert_time_data_csv():
    df = pd.read_csv(SRC_DIR / 'time_data.csv')
    # Convert time column to HH:MM
    if 'time' in df.columns:
        df['time'] = df['time'].apply(lambda x: x[:5] if isinstance(x, str) else x)
    df.to_csv(DST_DIR / 'time_data.csv', index=False)

def convert_parameters_csv():
    df = pd.read_csv(SRC_DIR / 'parameters.csv')
    df.to_csv(DST_DIR / 'parameters.csv', index=False)

def main():
    convert_work_csv()
    convert_ev_data_csv()
    convert_place_csv()
    convert_distance_csv()
    convert_travel_time_csv()
    convert_time_data_csv()
    convert_parameters_csv()
    print(f"Conversion complete. Converted files are in {DST_DIR}")

if __name__ == '__main__':
    main() 