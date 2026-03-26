#!/bin/bash
# Run Julia optimization with a dataset from data/ (or any path).
# Usage:
#   ./run-julia-data.sh                          # runs data/1MCS-1CEV-2nodes-24hours
#   ./run-julia-data.sh data/1MCS-1CEV-2nodes-24hours
#   ./run-julia-data.sh /path/to/other_dataset

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

DATASET="${1:-data/1MCS-1CEV-2nodes-24hours}"

if [ ! -d "$DATASET" ]; then
  echo "Error: Dataset path not found: $DATASET"
  exit 1
fi

if [ ! -d "$DATASET/csv_files" ]; then
  echo "Error: No csv_files/ folder inside: $DATASET"
  echo "Expected structure: $DATASET/csv_files/*.csv"
  exit 1
fi

echo "Running Julia optimization with dataset: $DATASET"
julia src/julia/mcs_optimization_main.jl "$DATASET"
echo "Done. Check $DATASET/results/ for outputs."
