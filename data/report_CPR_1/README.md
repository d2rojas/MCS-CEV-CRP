# Report CPR 1 Dataset - Scenario 1 (Task 2)

This dataset implements **Scenario 1** from the Task 2 deliverable document, consistent with the document's specifications.

## Scenario Configuration

- **Sites:** 1 construction site (i2) + 1 grid node (i1)
- **CEVs:** 2 (CEV 1: mini excavator, CEV 2: telescopic handler) - both at site i2
- **MCS:** 1 × Saniset J250
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

- SOE_min = 20% of capacity (3.96, 5.0)
- SOE_ini = full (19.8, 25.0)

### Schedule (from document)
- **CEV 1 (excavator):** 8:00–11:00 and 12:00–17:00 → **3 kW** during work
- **CEV 2 (telescopic):** 12:00–17:00 → **4 kW** during work
- Lunch break: 11:00–12:00 (no work)

### Network
- **Distance:** Grid node (i1) to construction site (i2) = **0.1 miles** (FCS to site distance from document)
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
- `parameters.csv` - MCS and optimization parameters
- `ev_data.csv` - CEV specifications (2 CEVs)
- `place.csv` - CEV locations (both at i2)
- `distance.csv` - Distances between nodes (i1↔i2)
- `travel_time.csv` - Travel times between nodes
- `time_data.csv` - 96 time periods with electricity prices and carbon factors
- `work.csv` - Work power profiles for each CEV at each site

---

## Strategy D: Differences Between Scenario 1 and Scenario 2

Under Strategy D, both scenarios use the same spatio-temporal optimization framework, objective function, and constraint set. The differences arise solely from the system configuration and scale, which change the nature and difficulty of the optimization problem.

### Scenario 1 (Strategy D) - This Dataset

- **Single construction site**
- **Two medium-duty CEVs**
- **One mobile charging station (MCS)**
- **No inter-site travel decisions** for the MCS
- **Lower aggregate power and energy demand**
- **Limited resource contention**

**Optimization focuses mainly on temporal scheduling of:**
- MCS charging from the grid
- CEV charging from the MCS
- Peak demand and missed work penalties are rarely binding

**One-Sentence Intuition:** *When should the MCS charge and serve CEVs at a single site?*

### Comparison with Scenario 2

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

**See also:** `../report_CPR_2/README.md` for Scenario 2 details.

---

## Verification

✅ **Work totals match document:** CEV 1 = 24 kWh/day, CEV 2 = 20 kWh/day  
✅ **Sites:** 1 grid node + 1 construction site  
✅ **CEVs:** 2 (both at same site)  
✅ **MCS:** 1  

---

**Created:** February 2025  
**Based on:** MCS-CEV Optimization Framework (Task 2 Deliverables).docx, **Scenario 1** (1 site, 2 CEVs, 1 MCS)  
**Assumptions documented in:** `docs/ASSUMPTIONS-AND-CHOICES-FOR-TASK2-RUNS.md`
