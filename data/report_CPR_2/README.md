# Report CPR 2 Dataset - Scenario 2 (Task 2)

This dataset implements **Scenario 2** from the Task 2 deliverable document, consistent with the document's specifications.

## Scenario Configuration

- **Sites:** 2 construction sites (i2: site 1, i3: site 2) + 1 grid node (i1)
- **CEVs:** 4 total:
  - **CEV 1** (mini excavator) at site i2
  - **CEV 2** (telescopic handler) at site i2
  - **CEV 3** (heavy excavator) at site i3
  - **CEV 4** (heavy telescopic) at site i3
- **MCS:** 2 × Saniset J250
- **Time resolution:** 15 minutes (delta_T = 0.25 h, 96 periods/day)

---

## Parameters

### MCS (Table 2 - Saniset J250)

| Parameter | Value | Unit |
|-----------|-------|------|
| Battery capacity | 250 | kWh |
| Charging power (grid) | 105 | kW |
| Discharging power (total) | 80 | kW |
| Discharging power (per plug) | 40 | kW |
| Number of plugs | 2 | - |
| Efficiency | 95% | - |

### CEVs (Table 3)

| CEV | Type | Battery (kWh) | Charge (kW) | Work (kW) | Site | Work (kWh/day) |
|-----|------|---------------|-------------|-----------|------|----------------|
| e1 | Mini excavator | 19.8 | 8.88 | 7 | i2 | 24 |
| e2 | Telescopic handler | 25.0 | 8.88 | 6 | i2 | 20 |
| e3 | Heavy excavator | 40.0 | 18.0 | 15 | i3 | 55 |
| e4 | Heavy telescopic | 45.0 | 15.0 | 13.7 | i3 | 35 |

- SOE_min = 20% of capacity (3.96, 5.0, 8.0, 9.0)
- SOE_ini = full (19.8, 25.0, 40.0, 45.0)

### Schedule (from document)
- **CEV 1 (excavator, site i2):** 8:00–11:00 and 12:00–17:00 → **3 kW** during work
- **CEV 2 (telescopic, site i2):** 12:00–17:00 → **4 kW** during work
- **CEV 3 (excavator, site i3):** 8:00–11:00 → **10 kW**, 12:00–17:00 → **5 kW**
- **CEV 4 (telescopic, site i3):** 12:00–17:00 → **7 kW** during work
- Lunch break: 11:00–12:00 (no work)

### Network
- **Distances:** 
  - Grid node (i1) to site 1 (i2) = **0.1 miles**
  - Grid node (i1) to site 2 (i3) = **0.6 miles** (0.1 + 0.5)
  - Site 1 (i2) to site 2 (i3) = **0.5 miles** (sites separated by 0.5 miles per document)
- **Travel time:** Based on 50 km/h average speed

### Economic Parameters
- **rho_miss:** 1000 $/kWh (penalty for missed work)
- **Time blocks:** 6 blocks with varying electricity prices and carbon factors
  - 0-6h: $0.10/kWh, 0.05 kgCO2/kWh
  - 6-10h: $0.15/kWh, 0.08 kgCO2/kWh
  - 10-14h: $0.12/kWh, 0.06 kgCO2/kWh
  - 14-17h: $0.18/kWh, 0.09 kgCO2/kWh
  - 17-20h: $0.25/kWh, 0.12 kgCO2/kWh
  - 20-24h: $0.15/kWh, 0.07 kgCO2/kWh

---

## CSV Files

All files are in `csv_files/`:
- `parameters.csv` - MCS and optimization parameters (num_mcs = 2)
- `ev_data.csv` - CEV specifications (4 CEVs)
- `place.csv` - CEV locations (e1,e2 at i2; e3,e4 at i3)
- `distance.csv` - Distances between nodes (3×3 matrix)
- `travel_time.csv` - Travel times between nodes (3×3 matrix)
- `time_data.csv` - 96 time periods with electricity prices and carbon factors
- `work.csv` - Work power profiles for each CEV at each site

---

## Strategy D: Differences Between Scenario 1 and Scenario 2

Under Strategy D, both scenarios use the same spatio-temporal optimization framework, objective function, and constraint set. The differences arise solely from the system configuration and scale, which change the nature and difficulty of the optimization problem.

### Scenario 2 (Strategy D) - This Dataset

- **Two spatially separated construction sites**
- **Mixed fleet of four CEVs** (medium- and heavy-duty)
- **Two mobile charging stations (MCSs)**
- **Active spatial decisions** for MCS travel and site assignment
- **Higher instantaneous charging power and total energy demand**
- **Increased contention** for MCS plugs and discharge capacity

**Optimization must coordinate:**
- Multiple MCSs across sites
- Temporal scheduling of charging/discharging
- Spatial routing and assignment decisions
- Peak demand and missed work penalties become **binding constraints**, creating stronger trade-offs between cost, emissions, mobility, and work completion

**One-Sentence Intuition:** *When and where should multiple MCSs move and serve competing CEVs across sites?*

### Comparison with Scenario 1

| Aspect | Scenario 1 (D) | Scenario 2 (D) |
|--------|------------------|----------------|
| Construction sites | 1 | 2 |
| CEVs | 2 (medium-duty) | 4 (mixed duty) |
| MCSs | 1 | 2 |
| Spatial decisions | No | Yes |
| Resource contention | Low | High |
| Dominant challenge | Temporal scheduling | Spatio-temporal coordination |
| Stress level | Feasibility | Scalability & realism |

**Key Difference:** Scenario 2 introduces active spatial decisions for MCS travel and site assignment, higher instantaneous charging power and total energy demand, increased contention for MCS plugs and discharge capacity, and requires coordination of multiple MCSs across sites. Peak demand and missed work penalties become binding constraints, creating stronger trade-offs between cost, emissions, mobility, and work completion.

**See also:** `../report_CPR_1/README.md` for Scenario 1 details.

---

## Verification

✅ **Work totals match document:** CEV 1 = 24 kWh/day, CEV 2 = 20 kWh/day, CEV 3 = 55 kWh/day, CEV 4 = 35 kWh/day  
✅ **Sites:** 1 grid node + 2 construction sites  
✅ **CEVs:** 4 (2 at site 1, 2 at site 2)  
✅ **MCS:** 2  

---

**Created:** February 2025  
**Based on:** MCS-CEV Optimization Framework (Task 2 Deliverables).docx, **Scenario 2** (2 sites, 4 CEVs, 2 MCS)  
**Assumptions documented in:** `docs/ASSUMPTIONS-AND-CHOICES-FOR-TASK2-RUNS.md`
