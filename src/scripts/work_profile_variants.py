#!/usr/bin/env python3
"""
Generate alternative work.csv profiles for Scenario 2 (same daily totals, different shape).
Use to test if a different R_work shape can reduce missed work toward 1.25 kWh.

Usage:
  python3 work_profile_variants.py data/report_CPR_2/csv_files/work.csv [variant] [--out FILE]

Variants:
  constant   - (default) no change, copy as-is
  afternoon_ramp - lower power at start of 12-17, higher at end (same total); may allow more lunch charging
  morning_heavy - for CEV3: shift some energy from afternoon to morning (same total)
"""

import csv
import sys
from pathlib import Path

DELTA_T = 0.25  # hours per period

# Time column names (96 x 15 min)
def time_columns():
    return [f"{h:02d}:{m:02d}" for h in range(24) for m in (0, 15, 30, 45)]

def col_index(hour, minute=0):
    return 2 + (hour * 4 + minute // 15)  # 0-based after Location, EV

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    out_arg = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--out=")), None)

    work_path = Path(args[0]) if args else Path("data/report_CPR_2/csv_files/work.csv")
    variant = (args[1] if len(args) > 1 else "constant").lower()
    out_path = Path(out_arg) if out_arg else work_path.parent / "work_variant.csv"

    if not work_path.exists():
        print(f"File not found: {work_path}", file=sys.stderr)
        sys.exit(1)

    times = time_columns()
    # 08:00 = index 32, 11:00 = 45 (11*4+0), 12:00 = 48, 17:00 = 68 (so 12:00-16:45 = indices 48..67)
    morning_start = col_index(8, 0) - 2   # 0-based in time list
    morning_end   = col_index(11, 0) - 2  # 11:00 inclusive in "8-11" -> last morning slot 10:45
    afternoon_start = col_index(12, 0) - 2
    afternoon_end   = col_index(17, 0) - 2  # 12:00-16:45

    rows = []
    with open(work_path, newline="") as f:
        r = csv.reader(f)
        header = next(r)
        rows.append(header)
        for row in r:
            loc, ev = row[0], row[1]
            vals = [float(row[i]) for i in range(2, 2 + len(times))]
            if variant == "afternoon_ramp":
                # Redistribute afternoon power: same total, linear ramp (low at start, high at end)
                n_aft = afternoon_end - afternoon_start
                aft_vals = vals[afternoon_start:afternoon_end]
                total = sum(aft_vals)
                if total > 0 and n_aft > 0:
                    # linear ramp: weight 1,2,...,n_aft so sum = total. weight sum = n_aft*(n_aft+1)/2
                    w_sum = n_aft * (n_aft + 1) / 2
                    ramp = [total * (k + 1) / w_sum for k in range(n_aft)]
                    vals[afternoon_start:afternoon_end] = ramp
            elif variant == "morning_heavy":
                # Only change CEV3 (e3): shift energy from afternoon to morning (same total 55 kWh)
                if ev == "e3":
                    m_vals = vals[morning_start:morning_end]
                    a_vals = vals[afternoon_start:afternoon_end]
                    m_total = sum(m_vals)
                    a_total = sum(a_vals)
                    if m_total > 0 and a_total > 0:
                        n_m, n_a = len(m_vals), len(a_vals)
                        total_kwh = (m_total + a_total) * DELTA_T
                        new_morning_kwh = 33.0   # was 30 (10*3h), try 33
                        new_afternoon_kwh = total_kwh - new_morning_kwh
                        vals[morning_start:morning_end] = [new_morning_kwh / (n_m * DELTA_T)] * n_m
                        vals[afternoon_start:afternoon_end] = [new_afternoon_kwh / (n_a * DELTA_T)] * n_a
            new_row = [loc, ev] + [f"{v:.2f}" for v in vals]
            rows.append(new_row)

    with open(out_path, "w", newline="") as f:
        csv.writer(f).writerows(rows)

    print(f"Wrote {variant} variant to {out_path}")
    print("To use: copy over work.csv and re-run the optimizer.")
    if variant != "constant":
        print("  cp", out_path, work_path)

if __name__ == "__main__":
    main()
