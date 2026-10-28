-- Seed Data for WhatIf City
-- Synthetic Example Scenarios (Educational / Illustrative Demo Data)

INSERT INTO public.scenarios (
    id,
    name,
    category,
    description,
    location_type,
    data_source,
    model_version,
    visibility,
    input_parameters,
    baseline_parameters,
    default_plan_a,
    default_plan_b
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'Morning Traffic Outside College Main Gate',
    'traffic',
    'Severe morning peak queues on the University Boulevard approach outside Campus Gate 1 caused by drop-offs, pedestrian crosswalk conflicts, and short green signal time.',
    'signalized_intersection',
    'synthetic_baseline',
    'v1.0.0-discrete-queue',
    'public',
    '{
        "arrivalRateVehiclesPerMin": 28,
        "initialQueueVehicles": 12,
        "dischargeRateVehiclesPerMin": 30,
        "signalCycleLengthSeconds": 90,
        "effectiveGreenTimeSeconds": 30,
        "pedestrianCrossingDurationSeconds": 20,
        "simulationDurationMinutes": 30,
        "amberAndAllRedSeconds": 4,
        "exclusivePedestrianPhase": false,
        "randomSeed": 42
    }',
    '{
        "name": "Baseline (Existing Status Quo)",
        "arrivalRateVehiclesPerMin": 28,
        "initialQueueVehicles": 12,
        "dischargeRateVehiclesPerMin": 30,
        "signalCycleLengthSeconds": 90,
        "effectiveGreenTimeSeconds": 30,
        "pedestrianCrossingDurationSeconds": 20,
        "simulationDurationMinutes": 30,
        "amberAndAllRedSeconds": 4,
        "exclusivePedestrianPhase": false,
        "randomSeed": 42
    }',
    '{
        "name": "Plan A: Extended Green Phase (+15s)",
        "arrivalRateVehiclesPerMin": 28,
        "initialQueueVehicles": 12,
        "dischargeRateVehiclesPerMin": 32,
        "signalCycleLengthSeconds": 90,
        "effectiveGreenTimeSeconds": 45,
        "pedestrianCrossingDurationSeconds": 20,
        "simulationDurationMinutes": 30,
        "amberAndAllRedSeconds": 4,
        "exclusivePedestrianPhase": false,
        "randomSeed": 42
    }',
    '{
        "name": "Plan B: Scramble Crosswalk & Dedicated Left Turn",
        "arrivalRateVehiclesPerMin": 28,
        "initialQueueVehicles": 12,
        "dischargeRateVehiclesPerMin": 36,
        "signalCycleLengthSeconds": 110,
        "effectiveGreenTimeSeconds": 50,
        "pedestrianCrossingDurationSeconds": 25,
        "simulationDurationMinutes": 30,
        "amberAndAllRedSeconds": 5,
        "exclusivePedestrianPhase": true,
        "randomSeed": 42
    }'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Pedestrian Safety & Mid-Block Crossing',
    'pedestrian',
    'High-volume student crossing connecting West Quad dormitory complex to the Engineering precinct across a 4-lane arterial road.',
    'midblock_crosswalk',
    'synthetic_baseline',
    'v1.0.0-ped-cross',
    'public',
    '{
        "pedestrianArrivalRatePerMin": 45,
        "vehicularTrafficPerHour": 850,
        "crossingLengthMeters": 14,
        "pedestrianWalkSpeedMps": 1.2,
        "crossingType": "unsignalized_zebra",
        "signalCycleSeconds": 60,
        "flashingBeaconEnabled": false,
        "simulationDurationMinutes": 30
    }',
    '{
        "name": "Baseline (Uncontrolled Zebra Crossing)",
        "pedestrianArrivalRatePerMin": 45,
        "vehicularTrafficPerHour": 850,
        "crossingLengthMeters": 14,
        "pedestrianWalkSpeedMps": 1.2,
        "crossingType": "unsignalized_zebra",
        "signalCycleSeconds": 60,
        "flashingBeaconEnabled": false,
        "simulationDurationMinutes": 30
    }',
    '{
        "name": "Plan A: Push-Button Pelican Signal",
        "pedestrianArrivalRatePerMin": 45,
        "vehicularTrafficPerHour": 850,
        "crossingLengthMeters": 14,
        "pedestrianWalkSpeedMps": 1.2,
        "crossingType": "pelican_pushbutton",
        "signalCycleSeconds": 60,
        "flashingBeaconEnabled": true,
        "simulationDurationMinutes": 30
    }',
    '{
        "name": "Plan B: Raised Table Crosswalk + Pedestrian Refuge Island",
        "pedestrianArrivalRatePerMin": 45,
        "vehicularTrafficPerHour": 720,
        "crossingLengthMeters": 8,
        "pedestrianWalkSpeedMps": 1.2,
        "crossingType": "raised_island",
        "signalCycleSeconds": 45,
        "flashingBeaconEnabled": true,
        "simulationDurationMinutes": 30
    }'
),
(
    '33333333-3333-3333-3333-333333333333',
    'Campus North Parking Deck Demand Management',
    'parking',
    'Evaluating peak morning parking demand, spillover cruising traffic, and the impact of dynamic pricing and carpooling incentives.',
    'parking_garage',
    'synthetic_baseline',
    'v1.0.0-parking-queue',
    'public',
    '{
        "capacityStalls": 400,
        "arrivalRateVehPerHour": 160,
        "meanParkingDurationHours": 3.5,
        "hourlyPriceUsd": 1.5,
        "carpoolReservedStalls": 20,
        "transitSubsidyActive": false,
        "simulationDurationHours": 8
    }',
    '{
        "name": "Baseline (Flat Pricing, No Carpool)",
        "capacityStalls": 400,
        "arrivalRateVehPerHour": 160,
        "meanParkingDurationHours": 3.5,
        "hourlyPriceUsd": 1.5,
        "carpoolReservedStalls": 20,
        "transitSubsidyActive": false,
        "simulationDurationHours": 8
    }',
    '{
        "name": "Plan A: Peak Demand Pricing ($3.50/hr)",
        "capacityStalls": 400,
        "arrivalRateVehPerHour": 125,
        "meanParkingDurationHours": 2.8,
        "hourlyPriceUsd": 3.5,
        "carpoolReservedStalls": 50,
        "transitSubsidyActive": true,
        "simulationDurationHours": 8
    }',
    '{
        "name": "Plan B: Transit Pass Integration + Remote Lot Shuttle",
        "capacityStalls": 550,
        "arrivalRateVehPerHour": 110,
        "meanParkingDurationHours": 3.0,
        "hourlyPriceUsd": 2.0,
        "carpoolReservedStalls": 80,
        "transitSubsidyActive": true,
        "simulationDurationHours": 8
    }'
),
(
    '44444444-4444-4444-4444-444444444444',
    'Circulator Campus Shuttle Frequency Optimization',
    'transit',
    'Balancing fleet headway, passenger waiting queues at dorm transit hubs, and vehicle operating costs during peak lecture changeovers.',
    'bus_loop',
    'synthetic_baseline',
    'v1.0.0-transit-headway',
    'public',
    '{
        "passengerArrivalRatePerMin": 18,
        "fleetSize": 3,
        "roundtripTimeMinutes": 24,
        "vehicleCapacityPax": 35,
        "operatingCostPerBusHour": 45,
        "simulationDurationMinutes": 60
    }',
    '{
        "name": "Baseline (3 Buses, 8 min Headway)",
        "passengerArrivalRatePerMin": 18,
        "fleetSize": 3,
        "roundtripTimeMinutes": 24,
        "vehicleCapacityPax": 35,
        "operatingCostPerBusHour": 45,
        "simulationDurationMinutes": 60
    }',
    '{
        "name": "Plan A: +2 High-Capacity Electric Buses (5 Buses, 4.8 min Headway)",
        "passengerArrivalRatePerMin": 18,
        "fleetSize": 5,
        "roundtripTimeMinutes": 24,
        "vehicleCapacityPax": 50,
        "operatingCostPerBusHour": 40,
        "simulationDurationMinutes": 60
    }',
    '{
        "name": "Plan B: Express Skip-Stop Route with 4 Shuttles",
        "passengerArrivalRatePerMin": 18,
        "fleetSize": 4,
        "roundtripTimeMinutes": 16,
        "vehicleCapacityPax": 35,
        "operatingCostPerBusHour": 45,
        "simulationDurationMinutes": 60
    }'
),
(
    '55555555-5555-5555-5555-555555555555',
    'Perimeter Ave One-Way Ring Road Proposal',
    'one-way',
    'Converting a congested two-way perimeter corridor into a clock-wise one-way loop with dedicated contraflow bike lane and wider sidewalks.',
    'corridor_loop',
    'synthetic_baseline',
    'v1.0.0-oneway-flow',
    'public',
    '{
        "corridorLengthKm": 2.4,
        "twoWayBottleneckCapacityVehHr": 900,
        "oneWayContinuousCapacityVehHr": 1600,
        "peakVehicularDemandVehHr": 1100,
        "avgDetourDistanceKm": 0.6,
        "activeBikeLane": true,
        "simulationDurationMinutes": 60
    }',
    '{
        "name": "Baseline (Two-Way Narrow Corridor with Left Turn Delays)",
        "corridorLengthKm": 2.4,
        "twoWayBottleneckCapacityVehHr": 900,
        "oneWayContinuousCapacityVehHr": 1600,
        "peakVehicularDemandVehHr": 1100,
        "avgDetourDistanceKm": 0.0,
        "activeBikeLane": false,
        "simulationDurationMinutes": 60
    }',
    '{
        "name": "Plan A: Full One-Way Loop Conversion + Protected Cycleway",
        "corridorLengthKm": 2.4,
        "twoWayBottleneckCapacityVehHr": 900,
        "oneWayContinuousCapacityVehHr": 1600,
        "peakVehicularDemandVehHr": 1100,
        "avgDetourDistanceKm": 0.6,
        "activeBikeLane": true,
        "simulationDurationMinutes": 60
    }',
    '{
        "name": "Plan B: Peak-Only Reversible Center Lane",
        "corridorLengthKm": 2.4,
        "twoWayBottleneckCapacityVehHr": 1350,
        "oneWayContinuousCapacityVehHr": 1350,
        "peakVehicularDemandVehHr": 1100,
        "avgDetourDistanceKm": 0.1,
        "activeBikeLane": false,
        "simulationDurationMinutes": 60
    }'
);
