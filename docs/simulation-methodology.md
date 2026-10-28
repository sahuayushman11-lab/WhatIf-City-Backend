# Simulation Methodology & Mathematical Formulations

## 1. Scope & Disclaimers

**WhatIf City** is an educational, interactive scenario simulation platform built for students, campus administrators, civic researchers, and urban enthusiasts. 

> **Important Disclaimer:**
> The models in WhatIf City are simplified discrete-time queueing models intended for educational scenario exploration, sensitivity testing, and conceptual comparison. They **do not** replace professional microscopic traffic simulation software (such as VISSIM, AIMSUN, or Synchro), dynamic environmental impact assessments, or real-world traffic engineering studies. Real-world traffic involves geometric road design, driver psychological heterogeneity, lane-changing maneuvers, weather friction, spillback across adjacent intersections, and multi-modal turning conflicts.

---

## 2. Core Traffic Intersection Model (Deterministic Discrete-Time Queue)

### 2.1 Model Overview
- **Type:** Discrete-time deterministic and pseudo-random queue simulation with explicit signal phasing.
- **Time Step ($\Delta t$):** Standard 1 second (configurable up to 5 seconds).
- **Time Horizon ($T$):** Total simulation duration in minutes ($T_{\text{sec}} = T_{\text{min}} \times 60$).

### 2.2 Variables, Parameters, and Units

| Parameter / Variable | Symbol | Standard Unit | Feasible Bounds | Description |
|---|---|---|---|---|
| Arrival Rate | $\lambda$ | veh / min | $1 \le \lambda \le 120$ | Mean incoming vehicular flow arriving at approach |
| Saturation Flow / Discharge Rate | $s$ | veh / min | $5 \le s \le 120$ | Maximum queue discharge rate during active green |
| Initial Queue | $Q_0$ | vehicles | $0 \le Q_0 \le 500$ | Number of residual stopped vehicles at start ($t=0$) |
| Signal Cycle Length | $C$ | seconds | $20 \le C \le 240$ | Total period of one complete traffic signal sequence |
| Effective Green Time | $g$ | seconds | $5 \le g < C$ | Duration of green phase allocated to the approach |
| Clearance Interval (Yellow + All-Red) | $y$ | seconds | $0 \le y \le 10$ | Clearance and lost time per cycle |
| Pedestrian Crossing Phase | $P_w$ | seconds | $0 \le P_w \le C$ | Minimum safe pedestrian crossing / walk interval |
| Simulation Duration | $T_{\text{min}}$ | minutes | $5 \le T_{\text{min}} \le 180$ | Time window over which scenario is evaluated |
| Random Seed | $\sigma$ | integer | $\ge 0$ | Reproducible seed for Poisson / uniform arrival jitter |

### 2.3 Feasibility Constraints & Boundary Validations
1. **Cycle Bounds:** $g + y \le C$. 
   - Red time per cycle: $r = C - g - y$.
   - Red time must satisfy $r \ge 0$.
2. **Pedestrian Safety Constraint:** If an exclusive pedestrian scramble or crossing phase is active, vehicular green $g$ and pedestrian phase $P_w$ must satisfy:
   $$g + P_w + y \le C$$
3. **Queue Non-negativity:** At any step $t$, queue $Q_t \ge 0$.
4. **Departure Capacity Ceiling:** Departures $D_t \le \min(Q_{t-1} + A_t, \text{Capacity}_t)$.

### 2.4 Time-Stepping State Equations

Let $t \in \{1, 2, \dots, N\}$ where $N = \frac{T_{\text{sec}}}{\Delta t}$.

#### A. Signal Phase State
At second $t$, the offset within the current cycle is:
$$\tau(t) = (t \bmod C)$$
The approach has green if:
$$\text{IsGreen}(t) = \begin{cases} 1 & \text{if } 0 \le \tau(t) < g \\ 0 & \text{if } g \le \tau(t) < C \end{cases}$$

#### B. Vehicular Arrivals $A_t$
- Expected arrival per step:
  $$\mu_A = \frac{\lambda}{60} \cdot \Delta t$$
- Under deterministic mode, fractional arrivals accumulate in an arrival buffer $\beta_{\text{arr}}$. When $\beta_{\text{arr}} \ge 1$, an integer vehicle enters the queue.
- Under stochastic seeded mode, arrivals follow a seeded Poisson distribution with parameter $\mu_A$:
  $$P(A_t = k) = \frac{\mu_A^k e^{-\mu_A}}{k!}$$

#### C. Discharge Capacity & Departures $D_t$
- Discharge capacity per step during green:
  $$cap_t = \begin{cases} \frac{s}{60} \cdot \Delta t & \text{if } \text{IsGreen}(t) = 1 \\ 0 & \text{if } \text{IsGreen}(t) = 0 \end{cases}$$
- Potential departures cannot exceed the accumulated capacity and cannot exceed the vehicles present in the queue:
  $$D_t = \min\left(Q_{t-1} + A_t, \; \lfloor cap_{\text{accum}} \rfloor\right)$$

#### D. Queue Evolution
$$Q_t = \max\left(0, \; Q_{t-1} + A_t - D_t\right)$$

#### E. Delay Accumulation
Total vehicle delay accumulated during interval $t$:
$$\Delta \text{Delay}_t = Q_t \cdot \Delta t \quad [\text{vehicle-seconds}]$$
Cumulative delay:
$$\text{Delay}_{\text{total}} = \sum_{t=1}^N Q_t \cdot \Delta t$$

---

## 3. Aggregate Performance Indicators (KPIs)

1. **Total Arrived Vehicles ($V_{\text{arr}}$):**
   $$V_{\text{arr}} = \sum_{t=1}^N A_t$$
2. **Total Served Vehicles ($V_{\text{served}}$):**
   $$V_{\text{served}} = \sum_{t=1}^N D_t$$
3. **Remaining Queue ($Q_{\text{end}}$):**
   $$Q_{\text{end}} = Q_N$$
4. **Maximum Queue Length ($Q_{\max}$):**
   $$Q_{\max} = \max_{1 \le t \le N} Q_t$$
5. **Average Queue Length ($\bar{Q}$):**
   $$\bar{Q} = \frac{1}{N} \sum_{t=1}^N Q_t$$
6. **Average Delay per Arriving Vehicle ($\bar{d}$):**
   $$\bar{d} = \begin{cases} \frac{\text{Delay}_{\text{total}}}{V_{\text{arr}}} & \text{if } V_{\text{arr}} > 0 \\ 0 & \text{if } V_{\text{arr}} = 0 \end{cases} \quad [\text{seconds / vehicle}]$$
7. **Volume-to-Capacity Ratio ($v/c$ or Degree of Saturation $X$):**
   $$X = \frac{\lambda \cdot C}{s \cdot g}$$
   - $X < 0.85$: Under capacity (Stable flow)
   - $0.85 \le X \le 1.0$: Near capacity (Vulnerable to shockwaves)
   - $X > 1.0$: Oversaturated (Continuous queue accumulation)
8. **Level of Service (LOS) - Highway Capacity Manual (HCM 2010):**
   - **LOS A:** Delay $\le 10$ s
   - **LOS B:** $10 <$ Delay $\le 20$ s
   - **LOS C:** $20 <$ Delay $\le 35$ s
   - **LOS D:** $35 <$ Delay $\le 55$ s
   - **LOS E:** $55 <$ Delay $\le 80$ s
   - **LOS F:** Delay $> 80$ s or $X > 1.0$

---

## 4. Multi-Scenario Comparison & Sensitivity Calculations

When comparing a proposed plan $P$ against baseline $B$:

### Percentage Change Formulation:
$$\Delta\% = \begin{cases} \frac{\text{Metric}_P - \text{Metric}_B}{\text{Metric}_B} \times 100\% & \text{if } \text{Metric}_B \ne 0 \\ \text{N/A} & \text{if } \text{Metric}_B = 0 \text{ and } \text{Metric}_P = 0 \\ +\infty / \text{New Demand} & \text{if } \text{Metric}_B = 0 \text{ and } \text{Metric}_P > 0 \end{cases}$$

### Desirability Direction:
- **Delay, Maximum Queue, Remaining Queue:** Lower is preferable ($\downarrow$ improvement).
- **Vehicles Served, Throughput, Pedestrian Safety Score:** Higher is preferable ($\uparrow$ improvement).

### Multi-Objective Trade-Off Index
Users can specify planning priorities:
- **Minimize Vehicular Delay:** Weight $w_{\text{delay}} = 0.7$, $w_{\text{queue}} = 0.2$, $w_{\text{ped}} = 0.1$.
- **Prioritize Pedestrian Service:** Weight $w_{\text{ped}} = 0.6$, $w_{\text{delay}} = 0.2$, $w_{\text{queue}} = 0.2$.
- **Balanced Campus Optimization:** Weight $w_{\text{delay}} = 0.35$, $w_{\text{queue}} = 0.35$, $w_{\text{ped}} = 0.30$.

The composite weighted index is transparently reported with all formula weights exposed. It does not replace qualitative safety reviews.

---

## 5. Additional Urban Scenario Modules

### 5.1 Parking Demand Management
- **Inputs:** Capacity (stalls $K$), Arrival rate $\lambda_p$ (veh/hr), Mean parking dwell time $T_d$ (hrs).
- **Formulation:** Little's Law steady-state demand:
  $$L_p = \lambda_p \cdot T_d$$
- **Occupancy:** $\rho_p = \min(100\%, \frac{L_p}{K} \times 100\%)$.
- **Overflow Rate:** $\max(0, \lambda_p - \frac{K}{T_d})$ veh/hr.
- **Search Cruising Time:** Non-linear penalty when occupancy exceeds 85%:
  $$T_{\text{search}} = 2.0 + 15.0 \cdot \max\left(0, \frac{\rho_p - 85\%}{15\%}\right)^2 \quad [\text{minutes}]$$

### 5.2 Campus Shuttle Scheduling
- **Inputs:** Passenger arrival rate $\lambda_{\text{pax}}$ (pax/min), Shuttle fleet size $n$, One-way loop travel time $T_{\text{loop}}$ (min), Bus passenger capacity $C_{\text{bus}}$.
- **Headway:** $H = \frac{T_{\text{loop}}}{n}$ [min].
- **Capacity Delivered:** $Cap_{\text{hourly}} = \frac{60}{H} \cdot C_{\text{bus}}$ [pax/hr].
- **Expected Passenger Wait Time:**
  $$E[W] = \frac{H}{2} + \text{OverloadDelay}$$

### 5.3 Pedestrian Crossing & Safety
- **Inputs:** Pedestrian flow $V_p$ (peds/min), Crossing length $L_w$ (meters), Walking speed $v_w = 1.2$ m/s, Vehicular traffic $V_v$ (veh/hr).
- **Minimum Clearance Time:** $t_{\text{clear}} = \frac{L_w}{v_w}$ seconds.
- **Conflict Risk Index:** Normalized function of pedestrian crossing exposures and vehicular approach speeds.

---

## 6. Reproducibility & Integrity Standards

1. All random processes accept an explicit integer seed $\sigma$. Re-running the simulation with identical parameters and seed yields bit-for-bit identical outcomes.
2. Units are uniformly labeled on all chart axes and tabular outputs.
3. Every API response and export payload contains metadata detailing `modelName`, `modelVersion`, `executionTimestamp`, `boundaryWarnings`, and complete serialized input parameters.
