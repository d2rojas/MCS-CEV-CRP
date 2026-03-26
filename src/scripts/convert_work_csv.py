import pandas as pd
import numpy as np

# Read the input file
df = pd.read_csv('dataset_full/csv_files/work.csv')

# Convert location and EV from strings to numbers
df['Location'] = df['Location'].apply(lambda x: float(x.replace('n', '')))
df['EV'] = df['EV'].apply(lambda x: float(x.replace('e', '')))

# Convert all time columns to numeric, replacing any non-numeric values with 0
for col in df.columns[2:]:
    df[col] = pd.to_numeric(df[col].replace(['t1', 't2', 't3', 't4'], '0'), errors='coerce').fillna(0)

# Create time columns for 30-minute intervals
time_columns = []
for hour in range(7, 24):  # 7:00 to 23:00
    time_columns.extend([f"{hour:02d}:00", f"{hour:02d}:30"])
for hour in range(0, 7):  # 00:00 to 06:00
    time_columns.extend([f"{hour:02d}:00", f"{hour:02d}:30"])

# Initialize new DataFrame with Location and EV columns
new_df = pd.DataFrame()
new_df['Location'] = df['Location']
new_df['EV'] = df['EV']

# Process each 30-minute interval
old_cols = df.columns[2:]  # Skip Location and EV columns
for i, new_time in enumerate(time_columns):
    # Get the four 15-minute intervals that make up this 30-minute period
    idx_start = i * 4
    if idx_start >= len(old_cols):
        # Add zeros for any remaining time slots
        new_df[new_time] = 0
        continue
    
    # Take up to 4 columns (some might not exist if we're at the end)
    cols_to_sum = old_cols[idx_start:min(idx_start + 4, len(old_cols))]
    # Sum the values and divide by 2 to maintain the same total over the period
    new_df[new_time] = df[cols_to_sum].sum(axis=1) / 2

# Save the converted file
new_df.to_csv('dataset_full/csv_files/work_converted.csv', index=False)
print("Conversion complete. New file saved as 'dataset_full/csv_files/work_converted.csv'") 