# CEV Knowledge Base - Construction Electric Vehicles

## 🚜 **Mini Excavators (Most Common CEVs)**

### **Volvo EC18 Electric Mini Excavator**
- **Battery Capacity**: 20-25 kWh
- **Operating Time**: 4-6 hours continuous work
- **Charging Time**: 2-3 hours (0-100%)
- **Work Power**: 3-5 kW during operation
- **Break Power**: 0.5-1 kW (idle mode)
- **Typical Work Schedule**: 8 AM - 5 PM (9 hours)
- **Break Pattern**: 2 hours at noon (12-2 PM)
- **Daily Energy Consumption**: 25-35 kWh

### **Volvo EC20 Electric Mini Excavator**
- **Battery Capacity**: 25-30 kWh
- **Operating Time**: 5-7 hours continuous work
- **Charging Time**: 2.5-3.5 hours (0-100%)
- **Work Power**: 4-6 kW during operation
- **Break Power**: 0.5-1 kW (idle mode)
- **Typical Work Schedule**: 8 AM - 5 PM (9 hours)
- **Break Pattern**: 2 hours at noon (12-2 PM)
- **Daily Energy Consumption**: 30-40 kWh

### **Volvo EC25 Electric Mini Excavator**
- **Battery Capacity**: 30-35 kWh
- **Operating Time**: 6-8 hours continuous work
- **Charging Time**: 3-4 hours (0-100%)
- **Work Power**: 5-7 kW during operation
- **Break Power**: 0.5-1 kW (idle mode)
- **Typical Work Schedule**: 8 AM - 5 PM (9 hours)
- **Break Pattern**: 2 hours at noon (12-2 PM)
- **Daily Energy Consumption**: 35-45 kWh

## ⚡ **Charging Infrastructure Requirements**

### **For 20 Mini Excavators at 5 Sites:**
- **Total Daily Energy**: 500-800 kWh
- **Peak Charging Power**: 200-300 kW
- **Recommended MCS Capacity**: 800-1200 kWh
- **Optimal Charging Rate**: 50-75 kW per MCS
- **Number of MCS Needed**: 3-4 stations

### **Charging Strategy:**
- **Night Charging**: 6 PM - 6 AM (12 hours)
- **Break Charging**: 12 PM - 2 PM (2 hours)
- **Opportunity Charging**: During breaks and idle time
- **Smart Scheduling**: Prioritize vehicles with low battery

## 🏗️ **Site-Specific Considerations**

### **5 Campus Sites Distribution:**
- **Site A**: 4 excavators (Central location)
- **Site B**: 4 excavators (North campus)
- **Site C**: 4 excavators (South campus)
- **Site D**: 4 excavators (East campus)
- **Site E**: 4 excavators (West campus)

### **Optimal MCS Placement:**
- **Central MCS**: Site A (serves 8-12 excavators)
- **Satellite MCS**: Sites B, C, D, E (serve 4 excavators each)
- **Mobile MCS**: Can move between sites as needed

## 💰 **Cost Optimization Strategies**

### **Electricity Pricing:**
- **Off-Peak Hours**: 6 PM - 6 AM (lower rates)
- **Peak Hours**: 6 AM - 6 PM (higher rates)
- **Break Hours**: 12 PM - 2 PM (medium rates)

### **Carbon Reduction:**
- **Solar Integration**: Use campus solar panels during day
- **Grid Optimization**: Charge during low-carbon grid periods
- **Battery Management**: Optimize charging cycles for longevity

## 📊 **Recommended Parameters for 20 CEVs**

### **Scenario Configuration:**
- **numMCS**: 4 (3 fixed + 1 mobile)
- **numCEV**: 20 (mini excavators)
- **numNodes**: 6 (5 sites + 1 grid connection)
- **is24Hours**: false (standard work hours)

### **Model Parameters:**
- **eta_ch_dch**: 0.92 (high efficiency charging)
- **MCS_max**: 1200 kWh (sufficient for daily needs)
- **MCS_min**: 200 kWh (minimum buffer)
- **CH_MCS**: 75 kW (fast charging capability)
- **delta_T**: 0.5 hours (30-minute intervals)

### **EV Data (per excavator):**
- **SOE_min**: 0.15 (15% minimum battery)
- **SOE_max**: 0.95 (95% maximum battery)
- **SOE_ini**: 0.80 (80% starting battery)
- **ch_rate**: 25 kW (optimal charging rate)

## 🎯 **Smart Recommendations for Tomorrow's Schedule**

### **Immediate Actions:**
1. **Pre-charge all vehicles** to 80% during off-peak hours
2. **Schedule break charging** during 12-2 PM break
3. **Optimize route planning** to minimize travel between sites
4. **Monitor battery levels** throughout the day

### **Long-term Optimizations:**
1. **Install solar panels** at central charging location
2. **Implement smart charging** based on grid carbon intensity
3. **Use predictive analytics** for battery health management
4. **Establish maintenance schedules** for optimal performance

---

*This knowledge base provides the AI agents with specific technical information about Volvo mini excavators and optimization strategies for construction sites.*
