# MCS-CEV Optimization System - User Manual

**Version:** 1.0
**Date:** March 26, 2026
**Audience:** End users, researchers, system operators

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [System Overview](#system-overview)
4. [Step-by-Step Guide](#step-by-step-guide)
5. [Running Optimizations](#running-optimizations)
6. [Understanding Results](#understanding-results)
7. [AI Chat Assistant](#ai-chat-assistant)
8. [Troubleshooting](#troubleshooting)
9. [FAQs](#faqs)

---

## Introduction

### What is MCS-CEV Optimization?

The MCS-CEV Optimization System helps you find the most cost-effective way to coordinate **Mobile Charging Stations (MCS)** that serve **Construction Electric Vehicles (CEV)**. The system determines:

- **When** each MCS should charge from the grid
- **Where** each MCS should travel (to which construction sites)
- **How much power** to deliver to each CEV
- **When** each CEV should perform its work

### Key Benefits

- Minimize total operational costs (electricity + carbon emissions + demand charges)
- Optimize energy usage across time and space
- Reduce missed work penalties
- Leverage time-varying electricity prices
- Account for carbon emission factors

### System Capabilities

- Handle 1-10 mobile charging stations
- Support 1-20 construction electric vehicles
- Optimize over 24-hour horizons (15-minute intervals)
- Generate comprehensive visualizations and reports
- AI-powered conversational interface for guidance

---

## Getting Started

### Prerequisites

Before using the system, ensure you have:

1. **Modern web browser** (Chrome, Firefox, Safari, Edge - latest version)
2. **Internet connection** (for AI chat features)
3. **OpenAI API key** (optional - only for AI chat assistant)

### Accessing the System

#### Option 1: Local Installation

```bash
# Navigate to project directory
cd /path/to/MCS-CEV-CRP

# Start the application
./run-app.sh

# Access the web interface
# Open browser to: http://localhost:3003
```

#### Option 2: Docker Deployment

```bash
# Setup environment
cp env.example .env
# Edit .env file and add your OpenAI API key (optional)

# Start Docker container
./docker-start.sh

# Access the web interface
# Open browser to: http://localhost:3003
```

#### Option 3: Remote Server

If deployed on a remote server, simply navigate to the provided URL in your browser.

---

## System Overview

### Main Interface Components

When you open the application, you'll see:

1. **Navigation Wizard** - Step-by-step tabs for dataset creation
2. **Chat Panel** (right side) - AI assistant for help and guidance
3. **Form Area** (center) - Input fields for scenario configuration
4. **Action Buttons** (bottom) - Navigate between steps or run optimization

### Workflow

The typical workflow involves:

1. **Configure Scenario** - Define number of MCS, CEVs, and nodes
2. **Set Parameters** - Specify technical specifications
3. **Define EV Data** - Configure each CEV's battery capacity
4. **Set Locations** - Assign CEVs to construction sites
5. **Configure Time Data** - Enter electricity prices and emissions
6. **Create Matrices** - Define distances and travel times
7. **Schedule Work** - Set work requirements for each CEV
8. **Review Summary** - Check all inputs before optimization
9. **Generate Dataset** - Create CSV files
10. **Run Optimization** - Execute Julia solver
11. **View Results** - Analyze optimization outcomes

---

## Step-by-Step Guide

### Step 1: Scenario Configuration

**Purpose:** Define the basic structure of your optimization problem.

**Inputs:**
- **Number of MCS:** How many mobile charging stations? (1-10)
- **Number of CEVs:** How many construction electric vehicles? (1-20)
- **Number of Nodes:** Total locations (grid nodes + construction sites)
- **Number of Grid Nodes:** How many fixed charging points?
- **Time Periods:** Number of 15-minute intervals (typically 96 for 24 hours)

**Tips:**
- Start small (1 MCS, 1-2 CEVs) to understand the system
- Grid nodes are where MCS charge from the utility grid
- Construction sites are where CEVs work and receive power from MCS
- More nodes = more complexity = longer optimization time

**Example:**
```
Number of MCS: 1
Number of CEVs: 2
Number of Nodes: 3 (1 grid node + 2 construction sites)
Number of Grid Nodes: 1
Time Periods: 96 (24 hours at 15-min resolution)
```

---

### Step 2: Parameters Form

**Purpose:** Configure technical specifications for your MCS and optimization.

**Key Parameters:**

#### MCS Battery Specifications
- **MCS Max Energy (kWh):** Maximum battery capacity (e.g., 250 kWh for Saniset J250)
- **MCS Min Energy (kWh):** Minimum safe battery level (typically 10-20% of max)
- **MCS Initial Energy (kWh):** Starting battery level (typically 80% for full day operation)

#### MCS Power Ratings
- **Charging Rate (kW):** Maximum power when charging from grid (e.g., 125 kW)
- **Discharging Rate (kW):** Maximum power when serving CEVs (e.g., 125 kW)
- **Plug Power (kW):** Power per individual charging plug (e.g., 50 kW)
- **Number of Plugs:** How many CEVs can charge simultaneously (e.g., 10)

#### Efficiency and Penalties
- **Charging/Discharging Efficiency:** Round-trip efficiency (0.0-1.0, typically 0.95 = 95%)
- **Missed Work Penalty ($/kWh):** Cost penalty for not completing required work
- **Time Interval (hours):** Duration of each period (0.25 = 15 minutes)

#### Economic Parameters
- **Demand Charge ($/kW):** Peak demand charge rate (set to 0 if not applicable)
- **Carbon Price ($/ton):** Social cost of carbon (default: $50/ton)
- **Travel Energy Rate (kWh/mile):** Energy consumed while driving (typically 0.5)

**Tips:**
- Use manufacturer specifications for battery and power ratings
- Higher efficiency = lower energy losses = lower costs
- Missed work penalty should reflect the importance of completing tasks
- Demand charges can significantly impact costs in some regions

---

### Step 3: EV Data Form

**Purpose:** Configure battery specifications for each construction electric vehicle.

**For Each CEV, Enter:**
- **SOE Max (kWh):** Maximum battery capacity (e.g., 50 kWh for compact excavator)
- **SOE Min (kWh):** Minimum safe battery level (e.g., 10 kWh = 20%)
- **SOE Initial (kWh):** Starting battery level (e.g., 40 kWh = 80%)
- **Charging Rate (kW):** Maximum charging power (e.g., 50 kW)

**Tips:**
- SOE = State of Energy (total kWh in battery)
- Initial SOE should allow CEV to start working immediately
- Charging rate is limited by both MCS plug power AND CEV onboard charger
- Smaller batteries need more frequent charging
- Consider safety margins (don't set min = 0)

**Example:**
```
CEV 1 (Large Excavator):
  - SOE Max: 100 kWh
  - SOE Min: 20 kWh
  - SOE Initial: 80 kWh
  - Charging Rate: 50 kW

CEV 2 (Compact Loader):
  - SOE Max: 50 kWh
  - SOE Min: 10 kWh
  - SOE Initial: 40 kWh
  - Charging Rate: 30 kW
```

---

### Step 4: Location Data Form

**Purpose:** Assign each CEV to its designated construction site.

**Understanding Node Types:**
- **Grid Nodes:** Fixed charging infrastructure (e.g., site office with grid connection)
- **Construction Sites:** Work locations where CEVs operate

**How to Assign:**
1. Each CEV must be assigned to exactly ONE construction site
2. Grid nodes should have NO CEV assignments (they're just for MCS charging)
3. Use checkboxes to assign CEVs to their work locations

**Tips:**
- CEVs cannot move between sites (they work at their assigned location)
- MCS can travel between all nodes (grid nodes and construction sites)
- Multiple CEVs can be assigned to the same construction site

**Example Configuration:**
```
Node 1 (Grid Node): ☐ CEV1  ☐ CEV2  (no assignments)
Node 2 (Site A):    ☑ CEV1  ☐ CEV2  (CEV1 works here)
Node 3 (Site B):    ☐ CEV1  ☑ CEV2  (CEV2 works here)
```

---

### Step 5: Time Data Form

**Purpose:** Define electricity prices and carbon emission factors for each time period.

**Data Sources:**
- **Electricity Prices:** Utility tariff schedules or real-time pricing data
- **CO2 Emission Factors:** Grid operator reports (e.g., CAISO for California)

**For Each Time Period, Enter:**
- **Time Label:** Human-readable time (e.g., "07:00:00", "07:15:00")
- **Electricity Price ($/kWh):** Cost to purchase electricity from grid
- **CO2 Emission Factor (kg CO2/kWh):** Carbon intensity of grid electricity

**Time Period Numbering:**
- Period 1 = Start of day (e.g., 00:00:00 or 07:00:00)
- Period 2 = First interval later (e.g., 00:15:00 or 07:15:00)
- Continue for all 96 periods (24 hours × 4 periods/hour)

**Tips:**
- Use real utility tariff data for accurate cost optimization
- Prices typically vary: low overnight, high during peak hours (4-9 PM)
- CO2 intensity varies: lower when renewables are abundant (midday solar)
- System optimizes MCS charging during low-price, low-carbon periods

**Example:**
```
Period 1 (07:00): $0.10/kWh, 0.45 kg CO2/kWh
Period 2 (07:15): $0.10/kWh, 0.43 kg CO2/kWh
...
Period 40 (17:00): $0.35/kWh, 0.55 kg CO2/kWh (peak price & emissions)
...
Period 96 (06:45): $0.08/kWh, 0.40 kg CO2/kWh (low price & emissions)
```

**Data Import Option:**
The system can use real CAISO (California ISO) data. See sample datasets for examples.

---

### Step 6: Matrix Data Form

**Purpose:** Define travel distances and times between all nodes.

**Two Matrices to Configure:**

#### 6a. Distance Matrix (miles or km)
- Physical distance between each pair of nodes
- Symmetric: Distance from A to B = Distance from B to A
- Diagonal = 0 (distance from a node to itself)

**Example (3 nodes):**
```
        Node1  Node2  Node3
Node1     0      5      10
Node2     5      0       8
Node3    10      8       0
```

#### 6b. Travel Time Matrix (hours)
- Time required to drive between each pair of nodes
- Symmetric: Time from A to B = Time from B to A
- Diagonal = 0 (no time to stay at same location)
- Should account for road conditions, speed limits, traffic

**Example (3 nodes):**
```
        Node1  Node2  Node3
Node1   0.00   0.15   0.25
Node2   0.15   0.00   0.20
Node3   0.25   0.20   0.00
```

**Tips:**
- Distance and time should be consistent (longer distance ≈ longer time)
- Consider actual road routes, not straight-line distances
- Travel consumes MCS battery energy (distance × travel energy rate)
- Use realistic values - underestimating distance/time causes infeasible solutions
- Matrices must be symmetric and have zero diagonals

---

### Step 7: CEV Work Scheduler

**Purpose:** Define work requirements for each CEV at each time period.

**Understanding Work:**
- **Work** = Power consumed by CEV while performing its construction tasks
- Measured in kW (kilowatts of power required)
- Varies over time based on work intensity

**For Each CEV, Set:**
- **Work Power (kW)** for each time period
- Only at the construction site where the CEV is assigned
- Zero work means CEV is idle (can charge without work conflict)

**Work-Charging Constraint:**
- CEVs cannot work and charge simultaneously
- When working: drains battery, no charging
- When idle (work = 0): can receive power from MCS

**Example Schedule:**
```
CEV1 at Site 2:
  Periods 1-8 (07:00-09:00): 0 kW (charging period)
  Periods 9-40 (09:00-17:00): 30 kW (active work)
  Periods 41-48 (17:00-19:00): 0 kW (charging period)
  Periods 49-96 (19:00-07:00): 0 kW (overnight idle)

CEV2 at Site 3:
  Periods 1-16 (07:00-11:00): 0 kW (morning charging)
  Periods 17-48 (11:00-19:00): 25 kW (afternoon work)
  Periods 49-96 (19:00-07:00): 0 kW (overnight idle)
```

**Tips:**
- Plan charging windows during low electricity prices
- Allow sufficient charging time to meet work energy needs
- High work power = faster battery drain = more charging needed
- Use realistic work profiles based on equipment specifications
- Consider breaks for charging during long work periods

---

### Step 8: Summary & Review

**Purpose:** Review all inputs before generating the dataset.

**What to Check:**
1. **Scenario Configuration:** Correct counts for MCS, CEVs, nodes
2. **Parameters:** Reasonable values for battery, power, efficiency
3. **EV Data:** Battery capacities match equipment specifications
4. **Locations:** Each CEV assigned to exactly one construction site
5. **Time Data:** All 96 periods have prices and emission factors
6. **Distances:** Symmetric matrix with realistic values
7. **Travel Times:** Consistent with distances
8. **Work Schedules:** Sufficient charging time available

**Common Issues to Look For:**
- ❌ CEV initial energy > maximum energy
- ❌ Minimum energy > initial energy
- ❌ Work power > CEV battery drain rate
- ❌ Insufficient charging time for required work
- ❌ Asymmetric distance or time matrices
- ❌ Missing time period data

**Action Buttons:**
- **Edit Section:** Return to any step to make corrections
- **Generate Dataset:** Create CSV files for optimization
- **Download Dataset:** Save CSV files locally (optional)

---

### Step 9: Generate Dataset

**Purpose:** Convert form inputs into CSV files required by the optimization engine.

**Generated Files (9 CSV files):**

1. **parameters.csv** - Optimization parameters (efficiency, penalties, etc.)
2. **ev_data.csv** - CEV battery specifications
3. **place.csv** - CEV location assignments
4. **distance.csv** - Distance matrix between nodes
5. **travel_time.csv** - Travel time matrix
6. **time_data.csv** - Electricity prices and CO2 factors
7. **work.csv** - Work requirements by CEV/site/time
8. **CAISO-co2-*.csv** - Carbon intensity data (if using real data)
9. **CAISO-demand-*.csv** - Demand data (if using real data)

**Dataset Storage:**
- Files are packaged into a ZIP archive
- Stored temporarily on the server
- Associated with a unique job ID
- Automatically cleaned up after 24 hours

**Next Steps:**
- **Preview Files:** View generated CSV contents
- **Download Dataset:** Save locally for manual Julia execution
- **Proceed to Optimization:** Run optimization directly

---

## Running Optimizations

### Starting an Optimization Job

1. **From Generated Dataset:**
   - Click "Run Optimization" button
   - System uploads dataset to optimization engine
   - Job starts immediately

2. **From Existing Dataset:**
   - Use "Upload Dataset" option
   - Select ZIP file containing CSV files
   - System validates and starts optimization

### Monitoring Progress

**Real-time Status Updates:**
- **Uploading:** Dataset transfer to server
- **Initializing:** Setting up optimization model
- **Loading Data:** Reading CSV files and validating
- **Building Model:** Creating mathematical formulation
- **Solving:** Running HiGHS optimizer
- **Generating Results:** Creating plots and CSV exports
- **Complete:** Results ready for download

**Progress Indicators:**
- Percentage complete (0-100%)
- Current operation status
- Time elapsed
- Estimated time remaining (when available)

**WebSocket Connection:**
- Real-time updates via WebSocket
- No page refresh needed
- Automatic reconnection if disconnected

### Optimization Time

**Typical Run Times:**
- **Small (1 MCS, 1-2 CEVs, 2-3 nodes):** 5-15 seconds
- **Medium (2-3 MCS, 3-5 CEVs, 4-6 nodes):** 30-90 seconds
- **Large (4+ MCS, 6+ CEVs, 8+ nodes):** 2-10 minutes

**Timeout Protection:**
- Julia solver timeout: 10 minutes
- Backend timeout: 30 minutes
- If timeout occurs, best solution found is returned

---

## Understanding Results

### Results Overview

After optimization completes, you receive:

1. **12 Visualization Files (PNG images)**
2. **10 Data Export Files (CSV spreadsheets)**
3. **Optimization Summary (text report)**
4. **ZIP Archive (all files packaged)**

### Visualization Files

#### 1. Combined Overview (mcs_optimization_results.png)
**8-panel summary view:**
- Total grid power profile
- Work profiles by site
- MCS state of energy
- CEV state of energy
- Electricity prices over time
- MCS location trajectory
- Node map with assignments
- Optimization summary statistics

#### 2. Individual Plots

**01_total_grid_power_profile.png**
- **What it shows:** Total power drawn from grid by all MCS over time
- **Y-axis:** Power (kW) - positive = charging, negative = discharging
- **X-axis:** Time (15-minute intervals)
- **Key insights:**
  - When MCS charge from grid (blue bars above zero)
  - When MCS discharge to CEVs (red bars below zero)
  - Peak power demand
  - Alignment with electricity prices (charges during low-price periods)

**02_work_profiles_by_site.png**
- **What it shows:** Work power by construction site over time
- **Y-axis:** Power (kW)
- **X-axis:** Time
- **Key insights:**
  - When each site has active work
  - Work intensity over time
  - Total work completion

**03_mcs_state_of_energy.png**
- **What it shows:** MCS battery levels over time
- **Y-axis:** Energy (kWh)
- **X-axis:** Time
- **Key insights:**
  - Battery management throughout day
  - Stays within min/max bounds (dashed lines)
  - Returns to initial level at end of day (cyclic constraint)
  - Travel energy consumption visible as sharp drops

**04_cev_state_of_energy.png**
- **What it shows:** CEV battery levels over time
- **Y-axis:** Energy (kWh)
- **X-axis:** Time
- **Key insights:**
  - CEV battery management
  - Charging periods (upward slopes)
  - Working periods (downward slopes)
  - Stays within safety bounds

**05_electricity_prices.png**
- **What it shows:** Time-varying electricity prices
- **Y-axis:** Price ($/kWh)
- **X-axis:** Time
- **Key insights:**
  - Peak price periods (evening)
  - Off-peak periods (overnight)
  - Optimization charges during low-price periods

**06_mcs_location_trajectory.png**
- **What it shows:** MCS location over time
- **Y-axis:** Node (Grid or Construction Site)
- **X-axis:** Time
- **Key insights:**
  - Travel patterns
  - Time spent at each location
  - Return to grid nodes for charging

**07_node_map_with_cev_assignments.png**
- **What it shows:** Spatial layout of nodes and CEV assignments
- **Visual elements:**
  - Blue squares = Grid nodes
  - Orange circles = Construction sites
  - Stars = CEV locations
  - Gray lines with numbers = Distances (miles)
- **Key insights:**
  - Physical layout
  - CEV-site assignments
  - MCS starting/ending positions

**08_optimization_summary.png**
- **What it shows:** Text summary of key parameters
- **Information:**
  - Number of MCS, CEVs, nodes
  - Battery capacities
  - Charging/discharging rates
  - Time configuration

**09_cost_emissions_summary.png**
- **What it shows:** Cumulative cost and CO2 emissions over time
- **Y-axes:** Cost (USD) and CO2 (kg)
- **X-axis:** Time
- **Key insights:**
  - Total operational cost: $X.XX
  - Total carbon emissions: X.XX kg
  - Cost and emission accumulation patterns

#### 3. Individual MCS Power Profiles
**mcs_N_power_profile.png (one per MCS)**
- Detailed power profile for each individual MCS
- Charging and discharging patterns
- More granular view than total grid power

### CSV Data Files

All visualizations have corresponding CSV files with raw data:
- **01_total_grid_power_profile.csv** - Time, power values
- **02_work_profiles_by_site.csv** - Time, work by site
- **03_mcs_state_of_energy.csv** - Time, SOE by MCS
- **04_cev_state_of_energy.csv** - Time, SOE by CEV
- **05_electricity_prices.csv** - Time, prices, emissions
- **06_mcs_location_trajectory.csv** - Time, MCS locations
- **09_cost_emissions_timeseries.csv** - Detailed cost/emissions
- **09_cost_emissions_totals.csv** - Summary metrics
- **mcs_N_power_profile.csv** - Per-MCS power data

### Key Metrics

**Objective Value**
- Total cost minimized by optimization (in dollars)
- Includes: electricity cost + carbon cost + demand charge + missed work penalty
- Lower is better

**Total Energy from Grid**
- Total kWh purchased from utility grid
- Includes charging losses (efficiency < 100%)

**Energy Efficiency**
- Percentage of grid energy effectively used
- Accounts for round-trip charging/discharging efficiency
- Typically 90-95% for well-designed systems

**Total Missed Work**
- Work requirements not completed (kWh)
- Should be zero in feasible solutions
- Non-zero indicates insufficient energy available

**Total Carbon Emissions**
- Total kg CO2 emitted due to grid electricity consumption
- Lower when charging during high-renewable periods

**Peak Power**
- Maximum instantaneous grid power draw (kW)
- Important for demand charge calculations
- System tries to minimize peak if demand charges apply

**Work Completion Percentage**
- Percentage of required work actually completed
- Should be 100% in optimal solutions
- Less than 100% indicates infeasibility or insufficient charging

---

## AI Chat Assistant

### What is the Chat Assistant?

The AI-powered chat panel provides:
- **Natural language guidance** - Ask questions in plain English
- **Context-aware help** - Suggestions based on current step
- **Parameter recommendations** - Advice on configuration values
- **Validation feedback** - Error explanations and fixes
- **Navigation assistance** - "Go to Parameters step" automatically navigates

### How to Use Chat

1. **Click chat icon** (right side of interface)
2. **Type your question** in natural language
3. **Receive AI response** with actionable guidance
4. **Follow suggestions** or ask follow-up questions

### Example Interactions

**Getting Started:**
```
You: "How do I start?"
AI: "Let's begin with scenario configuration. First, decide how many mobile
     charging stations you need. For a first-time user, I recommend starting
     with 1 MCS and 2 CEVs. Would you like me to guide you through each step?"
```

**Parameter Help:**
```
You: "What should I set for MCS battery capacity?"
AI: "MCS battery capacity depends on your mobile charger model:
     - Saniset J250: 250 kWh
     - Saniset J100: 100 kWh
     - Custom trailer: 50-150 kWh typically

     For 1-2 CEVs, a 250 kWh MCS is usually sufficient for a full day.
     What type of MCS are you using?"
```

**Error Help:**
```
You: "I got an error about CEV assignments"
AI: "The error occurs because each CEV must be assigned to exactly ONE
     construction site. Check the Location Data step and ensure:
     1. Each CEV has one checkbox selected
     2. No CEV is assigned to a grid node
     3. Grid nodes have no assignments

     Would you like me to navigate you to the Location Data step?"
```

**Optimization Questions:**
```
You: "Why is the MCS charging at 2 AM?"
AI: "The optimizer schedules charging at 2 AM because:
     1. Electricity prices are lowest during nighttime off-peak hours
     2. Grid carbon intensity is lower (less fossil fuel generation)
     3. No immediate CEV charging needs until morning work starts

     This minimizes both cost and emissions. Is this the behavior you expected?"
```

### Chat Features

**Prompt Orchestration System:**
- **Understanding Prompt:** Interprets your natural language input
- **Validation Prompt:** Checks data consistency and identifies errors
- **Recommendation Prompt:** Suggests parameter values and best practices
- **Conversation Manager:** Generates helpful, context-aware responses

*Note: See [AI Architecture Assessment](AI_ARCHITECTURE_ASSESSMENT.md) for technical details on the prompt-based orchestration system.*

**Context Awareness:**
- Knows which step you're on
- Remembers previous conversation
- Suggests next actions based on workflow
- Provides step-specific guidance

**Navigation Commands:**
- "Go to Parameters step" - Automatically switches tabs
- "Show me Time Data" - Navigates to time configuration
- "Take me to Results" - Opens results viewer

### Requirements

**OpenAI API Key:**
- Required for chat functionality
- Set in `.env` file: `OPENAI_API_KEY=your_key_here`
- Without key: Chat panel shows "API key not configured" message

**Internet Connection:**
- Required for AI responses
- Responses typically take 1-3 seconds

---

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to backend"
**Symptoms:** Frontend loads but shows connection error

**Solutions:**
- Check backend is running: `curl http://localhost:3004/api/health`
- Verify port configuration in `config.js` (backend) and `api.js` (frontend)
- Check firewall settings
- Look for port conflicts: `lsof -i :3004`

#### 2. "Julia optimization failed"
**Symptoms:** Optimization starts but ends with error

**Possible Causes:**
- **Infeasible problem:** Not enough energy available to complete work
- **Invalid data:** Asymmetric matrices, negative values, missing data
- **Insufficient charging time:** Work requirements exceed available charging periods
- **Battery constraints too tight:** Min/max bounds don't allow flexibility

**Solutions:**
- Review validation messages in console
- Check that work schedules have charging windows
- Ensure CEV battery capacity is sufficient for work requirements
- Verify MCS battery can support all CEVs
- Try increasing MCS capacity or reducing work requirements

#### 3. "Chat assistant not responding"
**Symptoms:** Type message but no response appears

**Solutions:**
- Check OpenAI API key is set in `.env` file
- Verify API key is valid: Test with OpenAI playground
- Check browser console for error messages
- Ensure internet connection is active
- Try refreshing the page

#### 4. "Optimization takes too long"
**Symptoms:** Optimization running for >10 minutes

**Causes:**
- Large problem size (many MCS, CEVs, nodes)
- Tight constraints causing solver difficulty
- Complex travel patterns

**Solutions:**
- Wait for timeout (10 min Julia, 30 min backend)
- Use best solution found at timeout
- Reduce problem size (fewer MCS/CEVs/nodes)
- Simplify constraints (wider battery bounds)
- Consider using coarser time resolution (30-min instead of 15-min)

#### 5. "Results show missed work"
**Symptoms:** Optimization completes but work completion < 100%

**Diagnosis:**
- Insufficient MCS battery capacity
- Not enough charging time between work periods
- CEV battery too small for work requirements
- MCS cannot reach construction sites in time

**Solutions:**
- Increase MCS battery capacity
- Add more charging periods in work schedule
- Add more MCS to distribute load
- Reduce work power requirements
- Check distance/travel time matrices are realistic

#### 6. "Energy balance error"
**Symptoms:** Warning message about energy balance violation

**Diagnosis:**
- Numerical precision issues in solver
- Constraint violations due to tight bounds

**Solutions:**
- If error is < 1e-6 kWh, it's likely numerical precision (safe to ignore)
- If error is > 1 kWh, check constraints and bounds
- Review optimization log for constraint violations

### Getting Help

**Check Logs:**
```bash
# Backend logs
cd src/web-interface/backend
npm start  # View console output

# Julia logs
# Located in results directory: optimization_log.txt
```

**Debug Mode:**
```bash
# Enable verbose logging
export LOG_LEVEL=debug
npm start
```

**Contact:**
- Review documentation in `/docs` folder
- Check GitHub issues (if project is hosted on GitHub)
- Contact system administrator or project lead

---

## FAQs

### General Questions

**Q: How accurate is the optimization?**
A: The optimization finds mathematically optimal solutions within numerical precision (typically 0.01% of optimal). Results are deterministic - same input always produces same output.

**Q: Can I use real-time data?**
A: Yes! The system supports importing real electricity prices and CO2 data. See sample datasets for CAISO (California) data examples.

**Q: How many scenarios can I optimize per day?**
A: Limited by `MAX_CONCURRENT_JOBS` (default: 3 simultaneous). No daily limit. Old results are cleaned up after 24 hours.

**Q: Can I run multiple optimizations in parallel?**
A: Yes, up to 3 concurrent jobs. Additional requests queue automatically.

### Technical Questions

**Q: What optimization solver is used?**
A: HiGHS (open-source linear programming solver). Also supports GLPK, Cbc, Clp, Ipopt.

**Q: How is the mathematical model formulated?**
A: Mixed-Integer Linear Programming (MILP) using JuMP framework in Julia. See "MCS-CEV Optimization Framework (Task 2 Deliverables).pdf" for full formulation.

**Q: What are the decision variables?**
A:
- Continuous: Power (charging, discharging, work), Energy (SOE), Travel energy
- Binary: MCS location, MCS travel, CEV-MCS connections, Charging mode

**Q: What is the objective function?**
A: Minimize total cost = (electricity cost) + (carbon cost) + (peak demand charge) + (missed work penalty)

**Q: What are the main constraints?**
A:
- Energy balance (charge - discharge - travel = SOE change)
- Power limits (charging/discharging rates)
- Battery bounds (min/max SOE)
- Travel energy consumption
- Work-charging exclusivity (can't do both simultaneously)
- MCS location (one location per time period)
- CEV assignment (one site per CEV)

### Data Questions

**Q: What CSV format is required?**
A: System generates correct format automatically. For manual datasets, see examples in `/data` folder.

**Q: Can I use my own electricity tariff?**
A: Yes! Enter your utility's tariff in Time Data step. Use actual $/kWh rates for each 15-minute period.

**Q: What if I don't know CO2 emission factors?**
A: Use typical values: 0.4-0.6 kg CO2/kWh for US grid. For more accuracy, check your grid operator's data (e.g., CAISO, PJM, ERCOT).

**Q: How do I model time-of-use (TOU) tariffs?**
A: Enter different prices for different time periods in Time Data step. Example:
- Off-peak (12 AM - 6 AM): $0.10/kWh
- Mid-peak (6 AM - 4 PM): $0.20/kWh
- On-peak (4 PM - 9 PM): $0.35/kWh
- Off-peak (9 PM - 12 AM): $0.10/kWh

**Q: Can I import data from Excel?**
A: The system accepts CSV files. Export your Excel data to CSV format first.

### Results Questions

**Q: Why is the MCS charging at night?**
A: Optimizer minimizes cost. Nighttime electricity is typically cheapest, so MCS charges then.

**Q: Why doesn't the MCS discharge at peak price periods?**
A: MCS discharges only when CEVs need power (based on work schedule and battery levels). It's not a grid-scale battery for energy arbitrage - it's a mobile charging service for CEVs.

**Q: What does "OPTIMAL" status mean?**
A: Solver found the mathematically best solution. All constraints are satisfied and objective is minimized.

**Q: What if status is "TIME_LIMIT"?**
A: Solver hit time limit (10 min) but found a feasible solution. It's usable but may not be the absolute optimal. Try simplifying the problem for faster solving.

**Q: Can I export results to Excel?**
A: Yes! All results are provided as CSV files, which open directly in Excel.

**Q: How do I compare multiple scenarios?**
A: Run optimizations with different parameters, download CSV files, and compare objective values and key metrics (cost, emissions, peak power).

### Deployment Questions

**Q: Can I deploy this on a server?**
A: Yes! Use Docker deployment for easiest setup. See DOCKER_README.md for production deployment guide.

**Q: What are the hardware requirements?**
A:
- **Minimum:** 2 CPU cores, 4 GB RAM, 10 GB storage
- **Recommended:** 4 CPU cores, 8 GB RAM, 20 GB storage
- **For large scenarios:** 8+ CPU cores, 16+ GB RAM

**Q: Does it work on Windows/Mac/Linux?**
A: Yes! Tested on all three platforms. Docker deployment works identically on all OS.

**Q: Can multiple users access simultaneously?**
A: Yes! Each user gets a separate session. Concurrent optimization jobs are limited by `MAX_CONCURRENT_JOBS` setting.

---

## Glossary

**CEV (Construction Electric Vehicle):** Electric-powered construction equipment (excavators, loaders, etc.) that requires periodic charging.

**MCS (Mobile Charging Station):** A mobile battery storage system on wheels that can travel to construction sites to charge CEVs.

**Grid Node:** A fixed location with grid connection where MCS can charge from the utility grid.

**Construction Site:** A work location where CEVs operate and require charging from MCS.

**SOE (State of Energy):** Total energy stored in a battery at a given time (kWh).

**Time Period:** A discrete time interval for optimization (typically 15 minutes = 0.25 hours).

**MILP (Mixed-Integer Linear Programming):** Mathematical optimization technique used by the solver.

**HiGHS:** Open-source optimization solver used for linear programming.

**JuMP (Julia for Mathematical Programming):** Julia package for formulating optimization problems.

**Demand Charge:** Utility fee based on peak power consumption ($/kW).

**Carbon Intensity:** CO2 emissions per unit of electricity (kg CO2/kWh).

**Round-trip Efficiency:** Energy output divided by energy input for charging/discharging cycle (typically 90-95%).

**Objective Function:** Mathematical expression to minimize (total cost in this system).

**Constraint:** Mathematical requirement that must be satisfied (e.g., battery limits).

**Feasible Solution:** A solution that satisfies all constraints.

**Optimal Solution:** The best feasible solution (minimizes objective function).

**Infeasible Problem:** No solution exists that satisfies all constraints simultaneously.

---

## Appendix: Keyboard Shortcuts

**Navigation:**
- `Tab` - Move to next input field
- `Shift + Tab` - Move to previous input field
- `Enter` - Submit form / Move to next step
- `Ctrl/Cmd + Home` - Scroll to top
- `Ctrl/Cmd + End` - Scroll to bottom

**Chat Panel:**
- `Ctrl/Cmd + /` - Focus chat input
- `Enter` - Send message
- `Shift + Enter` - New line in message

**General:**
- `Ctrl/Cmd + R` - Refresh page
- `Ctrl/Cmd + P` - Print results
- `Ctrl/Cmd + S` - Download results (when available)

---

## Support and Feedback

For questions, issues, or feedback:

1. **Check this manual** - Most questions are answered here
2. **Review documentation** - See `/docs` folder for technical details
3. **Ask AI chat** - Use the built-in assistant for guidance
4. **Contact administrator** - Reach out to your system administrator

**System Version:** 1.0
**Last Updated:** March 26, 2026
**Manual Version:** 1.0

---

**Happy Optimizing!** 🚛⚡🏗️
