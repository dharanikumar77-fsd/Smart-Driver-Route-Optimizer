class MinPriorityQueue {
  constructor() { this.heap = []; }
  isEmpty() { return this.heap.length === 0; }
  push(item, priority) {
    this.heap.push({ item, priority });
    this.heap.sort((a, b) => a.priority - b.priority);
  }
  pop() { return this.heap.shift(); }
  getSnapshot() { return this.heap.map(h => ({ item: h.item, priority: Math.round(h.priority * 10) / 10 })); }
}

class DijkstraEngine {
  constructor(cities, roads) {
    this.cities = cities; this.roads = roads; this.adjacencyList = {};
    for (const c in cities) this.adjacencyList[c] = [];
    roads.forEach(r => {
      this.adjacencyList[r.from]?.push({ to: r.to, dist: r.distance, type: r.type, code: r.code, speed: r.speed_limit, edgeData: r });
      this.adjacencyList[r.to]?.push({ to: r.from, dist: r.distance, type: r.type, code: r.code, speed: r.speed_limit, edgeData: r });
    });
  }

  findOptimalRoute(startNode, endNode, vehicleKey, currentFuel, mileage) {
    const vehicle = VEHICLE_PROFILES[vehicleKey] || VEHICLE_PROFILES["car"];
    const times = {}, distances = {}, predecessors = {}, visited = new Set(), pq = new MinPriorityQueue(), trace = [];

    for (const node in this.cities) { times[node] = Infinity; distances[node] = Infinity; predecessors[node] = null; }
    times[startNode] = 0; distances[startNode] = 0; pq.push(startNode, 0);

    trace.push({ step: 1, type: "INIT", desc: `Initialized Priority Queue with source city '${startNode}' at Cost = 0.`, pqSnapshot: pq.getSnapshot(), visitedList: Array.from(visited) });

    let stepCounter = 2, targetReached = false;
    while (!pq.isEmpty()) {
      const { item: u, priority: currentCost } = pq.pop();
      if (visited.has(u)) continue;
      visited.add(u);

      trace.push({ step: stepCounter++, type: "VISIT", desc: `Popped '${u}' Cost=${Math.round(currentCost)}m. Marked Settled.`, pqSnapshot: pq.getSnapshot(), visitedList: Array.from(visited) });
      if (u === endNode) { targetReached = true; break; }

      for (const edge of this.adjacencyList[u]) {
        const v = edge.to;
        if (visited.has(v)) continue;

        const effectiveSpeed = Math.min(edge.speed, vehicle.speed_caps[edge.type] || edge.speed);
        const timeMins = (edge.dist / effectiveSpeed) * 60;
        const candidateTime = times[u] + timeMins;

        if (candidateTime < times[v]) {
          times[v] = candidateTime; distances[v] = distances[u] + edge.dist;
          predecessors[v] = { from: u, edge: edge, dist: edge.dist, time: timeMins, speed: effectiveSpeed, type: edge.type, code: edge.code };
          pq.push(v, candidateTime);
          trace.push({ step: stepCounter++, type: "RELAX", desc: `Found faster route to '${v}' via '${u}'. Update cost=${Math.round(candidateTime)}m.`, pqSnapshot: pq.getSnapshot(), visitedList: Array.from(visited) });
        }
      }
    }

    if (!targetReached) return { success: false, message: "No route found." };

    const pathNodes = [], pathLegs = [];
    let curr = endNode;
    while (curr !== null) {
      pathNodes.unshift(curr);
      const p = predecessors[curr];
      if (p) { pathLegs.unshift(p); curr = p.from; } else break;
    }

    return {
      success: true, vehicle, mileage, pathNodes, pathLegs, executionTrace: trace,
      totalDistance: Math.round(distances[endNode]), rawDrivingTimeMins: Math.round(times[endNode]),
      itinerary: this.scheduleFatigueAndFuel(pathNodes, pathLegs, vehicle, currentFuel, mileage)
    };
  }

  scheduleFatigueAndFuel(pathNodes, pathLegs, vehicle, initialFuel, mileage) {
    const schedule = [];
    let curFuel = parseFloat(initialFuel) || 20.0, driveMins = 0, totalRefuels = 0;

    // Use translation tags directly inside the engine
    schedule.push({
      type: "START", city: pathNodes[0], remainingFuel: Math.round(curFuel * 10) / 10,
      title: `🟢 ${t('depart_from')} ${getCityName(pathNodes[0])}`,
      details: `${t('initial_tank')}: ${curFuel} L`
    });

    for (let i = 0; i < pathLegs.length; i++) {
      const leg = pathLegs[i], fuelBurned = leg.dist / mileage;
      driveMins += leg.time;

      schedule.push({
        type: "DRIVE_LEG", speedLimit: leg.speed, remainingFuel: Math.max(0, Math.round((curFuel - fuelBurned) * 10) / 10),
        title: `${t('drive')}: ${getCityName(leg.from)} ➔ ${getCityName(pathNodes[i + 1])}`,
        details: `${leg.dist} km ${t('at')} ${leg.speed} km/h`
      });

      curFuel -= fuelBurned;

      const cityData = this.cities[pathNodes[i + 1]];

      if (curFuel <= vehicle.fuel_reserve_litres && cityData.fuel_station) {
        curFuel = vehicle.fuel_capacity; totalRefuels++;
        schedule.push({
          type: "REFUEL", remainingFuel: curFuel,
          title: `⛽ ${t('refuel_at')} ${getCityName(pathNodes[i + 1])}`,
          details: `${t('tank_filled')} ${cityData.fuel_station.name}.`
        });
      }

      if (driveMins >= vehicle.continuous_drive_limit_mins) {
        const venue = leg.edge.edgeData.mid_route_resort || "Highway Star Rest Plaza";
        schedule.push({
          type: "MEAL_REST", remainingFuel: Math.round(curFuel * 10) / 10,
          title: `🍽️ ${t('meal_rest')}`,
          details: `${t('fatigue_recovery')} (${venue}).`
        });
        driveMins = 0;
      } else if (driveMins >= vehicle.tea_break_interval_mins) {
        const venue = leg.edge.edgeData.mid_route_tea || "Highway Chai Kadai";
        schedule.push({
          type: "TEA_BREAK", remainingFuel: Math.round(curFuel * 10) / 10,
          title: `☕ ${t('tea_break')}`,
          details: `${t('stretch_tea')} (${venue}).`
        });
        driveMins = 0;
      }
    }

    schedule.push({
      type: "DESTINATION", remainingFuel: Math.round(curFuel * 10) / 10,
      title: `🏁 ${t('arrival_at')} ${getCityName(pathNodes[pathNodes.length - 1])}`,
      details: t('dest_reached')
    });

    return { schedule, totalRefuels };
  }
}