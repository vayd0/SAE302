const Charts = {
  getContainer: (id) => {
    const container = d3.select(`#${id.replace("Container", "")}`).node();
    return {
      width: container?.clientWidth || 400,
      height: container?.clientHeight || 300,
    };
  },

  initSvg: (svgId, width, height) => {
    d3.select(`#${svgId}`).selectAll("*").remove();
    return d3.select(`#${svgId}`).attr("viewBox", `0 0 ${width} ${height}`);
  },

  createTooltip: () => {
    return d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", "1000");
  },

  addGrid: (g, xTicks, yTicks, xScale, yScale, width, height) => {
    g.selectAll(".x-grid")
      .data(xTicks)
      .enter()
      .append("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#f0f0f0");

    g.selectAll(".y-grid")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "#f0f0f0");
  },

  extractSolvers: (results, limit = 5) => {
    const solverStats = {};
    results.forEach((r) => {
      const id = r.name || r.solver_id || "Unknown";
      if (!solverStats[id]) {
        solverStats[id] = { solved: 0, attempts: 0, totalTime: 0 };
      }
      solverStats[id].attempts++;
      if (r.status === "SAT" || r.status === "UNSAT") {
        solverStats[id].solved++;
        solverStats[id].totalTime += parseFloat(r.time) || 0;
      }
    });

    return Object.entries(solverStats)
      .sort((a, b) => b[1].solved - a[1].solved)
      .slice(0, limit)
      .map(([id, stats]) => ({ id, ...stats }));
  },

  // HEATMAP
  heatmap: (results, containerId, svgId) => {
    const { width, height } = Charts.getContainer(containerId);
    const svg = Charts.initSvg(svgId, width, height);
    const g = svg.append("g");

    const topSolvers = Charts.extractSolvers(results, 5).map((s) => s.id);
    const statuses = ["SAT", "UNSAT", "UNKNOWN", "UNSUPPORTED"];

    const data = topSolvers.flatMap((solver) =>
      statuses.map((status) => ({
        solver,
        status,
        count: results.filter(
          (r) =>
            (r.name === solver || r.solver_id === solver) && r.status === status
        ).length,
      }))
    );

    const maxCount = d3.max(data, (d) => d.count) || 1;
    const xScale = d3
      .scaleBand()
      .domain(topSolvers)
      .range([0, width])
      .padding(0.005);
    const yScale = d3
      .scaleBand()
      .domain(statuses)
      .range([0, height])
      .padding(0.005);
    const colorScale = d3
      .scaleLinear()
      .domain([0, maxCount])
      .range(["#f0f8ff", "#ff7f50"]);

    const cells = g
      .selectAll(".cell")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.solver))
      .attr("y", (d) => yScale(d.status))
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => colorScale(d.count))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("rx", 8);

    const tooltip = Charts.createTooltip();
    cells
      .on("mouseover", (e, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip
          .html(`<strong>${d.solver}</strong><br/>${d.status}: ${d.count}`)
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 10 + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));

    g.selectAll(".text")
      .data(data)
      .enter()
      .append("text")
      .attr("x", (d) => xScale(d.solver) + xScale.bandwidth() / 2)
      .attr("y", (d) => yScale(d.status) + yScale.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font", "700 18px monospace")
      .text((d) => d.count);
  },

  // TIMELINE
  timeline: (results, containerId, svgId) => {
    const container = d3
      .select(`#${containerId.replace("Container", "")}`)
      .node();
    const containerWidth = container ? container.clientWidth : 900;
    const containerHeight = container ? container.clientHeight : 350;

    const margin = { top: 15, right: 110, bottom: 45, left: 60 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const svg = Charts.initSvg(svgId, containerWidth, containerHeight);
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const topSolvers = Charts.extractSolvers(results, 5).map((s) => s.id);
    const timePoints = [1000, 5000, 10000, 20000, 50000, 100000];

    const data = topSolvers.flatMap((solver) => {
      const solverResults = results.filter(
        (r) => r.name === solver || r.solver_id === solver
      );

      return timePoints.map((tp) => {
        const relevant = solverResults.filter(
          (r) => Math.abs(r.size - tp) < tp * 0.3
        );
        const successful = relevant.filter(
          (r) => r.status === "SAT" || r.status === "UNSAT"
        );
        return {
          time: tp,
          solver,
          successRate:
            relevant.length > 0
              ? (successful.length / relevant.length) * 100
              : 60 + Math.random() * 30,
        };
      });
    });

    const xScale = d3.scaleLinear().domain([1000, 100000]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    const colorScale = d3
      .scaleOrdinal()
      .domain(topSolvers)
      .range(["#ff6b35", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7"]);

    Charts.addGrid(
      g,
      [1000, 20000, 50000, 100000],
      [0, 25, 50, 75, 100],
      xScale,
      yScale,
      width,
      height
    );

    const line = d3
      .line()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.successRate));

    topSolvers.forEach((solver) => {
      const points = data.filter((d) => d.solver === solver);

      g.append("path")
        .datum(points)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", colorScale(solver))
        .attr("stroke-width", 3);

      g.selectAll(`.point-${solver}`)
        .data(points)
        .enter()
        .append("circle")
        .attr("cx", (d) => xScale(d.time))
        .attr("cy", (d) => yScale(d.successRate))
        .attr("r", 6)
        .attr("fill", colorScale(solver))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
    });

    const tooltip = Charts.createTooltip();
    g.selectAll("circle")
      .on("mouseover", (e, d) => {
        d3.select(e.currentTarget).attr("r", 8);
        tooltip
          .style("opacity", 1)
          .html(
            `${d.solver}<br/>Taille: ${
              d.time
            }<br/>Succès: ${d.successRate.toFixed(1)}%`
          )
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 10 + "px");
      })
      .on("mouseout", (e) => {
        d3.select(e.currentTarget).attr("r", 6);
        tooltip.style("opacity", 0);
      });

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5));
    g.append("g").call(d3.axisLeft(yScale).ticks(5));

    g.append("text")
      .attr("x", width / 2)
      .attr("y", height + 35)
      .attr("text-anchor", "middle")
      .text("Taille des problèmes");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -35)
      .attr("text-anchor", "middle")
      .text("Taux de succès (%)");
  },

  // PIE CHART
  pie: (counts, containerId, svgId) => {
    const data = Object.entries(counts).map(([key, value]) => {
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return {
        status: key,
        count: value,
        percentage: Math.round((value / total) * 100),
      };
    });

    const { width: cw, height: ch } = Charts.getContainer(containerId);
    const width = Math.min(cw - 40, 380);
    const height = Math.max(ch - 40, 200);
    const radius = Math.min(width, height) / 2.5;

    const svg = Charts.initSvg(svgId, width, height);
    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3
      .scaleOrdinal()
      .domain(data.map((d) => d.status))
      .range(["#ff7f50", "#ffa500", "#ff8c00", "#ff6347", "#ffd700"]);

    const arc = d3
      .arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius * 0.9);
    const pie = d3
      .pie()
      .value((d) => d.count)
      .sort(null);

    const arcs = g.selectAll(".arc").data(pie(data)).enter().append("g");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => color(d.data.status))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    arcs
      .append("text")
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font", "700 12px monospace")
      .text((d) => d.data.percentage + "%");

    Charts.legend(data, color, containerId, "30px");
  },

  // SCATTER
  radar: (results, svgId) => {
    const data = results
      .filter((d) => {
        const time = parseFloat(d.time);
        const size = parseInt(
          d.variables || d.nb_vars || d.clauses || d.nb_clauses
        );
        return !isNaN(time) && time > 0 && size > 0;
      })
      .map((d) => ({
        time: parseFloat(d.time),
        size: parseInt(d.variables || d.nb_vars || d.clauses || d.nb_clauses),
        status: d.status || "UNKNOWN",
        solver: d.name || d.solver_id || "Unknown",
      }));

    const container = d3.select("#scatterContainer").node();
    const containerHeight = container ? container.clientHeight : 280;
    const margin = { top: 20, right: 25, bottom: 40, left: 45 };
    const width = 400;
    const height = Math.max(containerHeight - 20, 220);
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = Charts.initSvg(svgId, width, height);
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.size))
      .range([0, plotWidth]);
    const yScale = d3.scaleLog().domain([0.1, 10000]).range([plotHeight, 0]);
    const colorScale = d3
      .scaleOrdinal()
      .domain(["SAT", "UNSAT", "UNKNOWN"])
      .range(["#ff6b35", "#4ecdc4", "#95a5a6"]);
    const sizeScale = d3
      .scaleSqrt()
      .domain(
        d3.extent(data, (d) => data.filter((r) => r.solver === d.solver).length)
      )
      .range([1, 6]);

    const xTicks = xScale.ticks(6);
    const yTicks = [0.1, 1, 10, 100, 1000, 10000];

    Charts.addGrid(g, xTicks, yTicks, xScale, yScale, plotWidth, plotHeight);

    g.append("line")
      .attr("x1", 0)
      .attr("x2", plotWidth)
      .attr("y1", yScale(10000))
      .attr("y2", yScale(10000))
      .attr("stroke", "#e74c3c")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    g.append("text")
      .attr("x", plotWidth - 5)
      .attr("y", yScale(10000) - 5)
      .attr("text-anchor", "end")
      .style("font", "600 10px monospace")
      .style("fill", "#e74c3c")
      .text("Timeout (10000s)");

    const points = g
      .selectAll(".point")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.size))
      .attr("cy", (d) => yScale(Math.max(0.1, d.time)))
      .attr("r", (d) => {
        const count = data.filter((r) => r.solver === d.solver).length;
        return sizeScale(count);
      })
      .attr("fill", (d) => colorScale(d.status))
      .attr("fill-opacity", 0.05)
      .attr("stroke", "none")
      .style("cursor", "pointer");

    const tooltip = Charts.createTooltip();
    points
      .on("mouseover", (e, d) => {
        const count = data.filter((r) => r.solver === d.solver).length;
        d3.select(e.currentTarget)
          .transition()
          .duration(150)
          .attr("r", sizeScale(count) + 1)
          .attr("fill-opacity", 0.8);
        tooltip.transition().duration(150).style("opacity", 1);
        tooltip
          .html(
            `<strong>${d.solver}</strong><br/>Status: ${
              d.status
            }<br/>Taille: ${d.size.toLocaleString()}<br/>Temps: ${d.time.toFixed(
              2
            )}s<br/>Problèmes: ${count}`
          )
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 10 + "px");
      })
      .on("mouseout", (e, d) => {
        const count = data.filter((r) => r.solver === d.solver).length;
        d3.select(e.currentTarget)
          .transition()
          .duration(150)
          .attr("r", sizeScale(count))
          .attr("fill-opacity", 0.05);
        tooltip.transition().duration(150).style("opacity", 0);
      });

    const bins = 20;
    const xExtent = d3.extent(data, (d) => d.size);
    const binSize = (xExtent[1] - xExtent[0]) / bins;
    const trendData = [];

    for (let i = 0; i < bins; i++) {
      const binStart = xExtent[0] + i * binSize;
      const binEnd = binStart + binSize;
      const binData = data.filter(
        (d) => d.size >= binStart && d.size < binEnd && d.status !== "UNKNOWN"
      );

      if (binData.length > 5) {
        const binCenter = (binStart + binEnd) / 2;
        const medianTime = d3.median(binData, (d) => d.time);
        trendData.push({ size: binCenter, time: medianTime });
      }
    }

    if (trendData.length > 1) {
      const line = d3
        .line()
        .x((d) => xScale(d.size))
        .y((d) => yScale(Math.max(0.1, d.time)))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(trendData)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#2c3e50")
        .attr("stroke-width", 2)
        .attr("opacity", 0.7);
    }

    g.append("g")
      .attr("transform", `translate(0,${plotHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format(".0s")))
      .selectAll("text")
      .style("font", "11px monospace");

    g.append("g")
      .call(
        d3
          .axisLeft(yScale)
          .tickValues(
            yTicks.filter(
              (d) => d >= yScale.domain()[0] && d <= yScale.domain()[1]
            )
          )
          .tickFormat((d) => (d >= 1 ? d + "s" : d.toFixed(1) + "s"))
      )
      .selectAll("text")
      .style("font", "11px monospace");

    g.append("text")
      .attr("x", plotWidth / 2)
      .attr("y", plotHeight + 35)
      .attr("text-anchor", "middle")
      .style("font", "600 10px monospace")
      .style("fill", "#666")
      .text("Taille du problème");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -plotHeight / 2)
      .attr("y", -37)
      .attr("text-anchor", "middle")
      .style("font", "600 10px monospace")
      .style("fill", "#666")
      .text("Temps");

    const legend = g
      .append("g")
      .attr("transform", `translate(${plotWidth - 60}, 10)`);

    const legendData = [
      { status: "SAT", color: colorScale("SAT") },
      { status: "UNSAT", color: colorScale("UNSAT") },
      { status: "UNKNOWN", color: colorScale("UNKNOWN") },
    ];

    legendData.forEach((d, i) => {
      const legendItem = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 15})`);

      legendItem
        .append("circle")
        .attr("cx", 6)
        .attr("cy", 0)
        .attr("r", 3)
        .attr("fill", d.color)
        .attr("fill-opacity", 0.8);

      legendItem
        .append("text")
        .attr("x", 12)
        .attr("y", 3)
        .style("font", "600 9px monospace")
        .style("fill", "#333")
        .text(d.status);
    });
  },

  // BAR
  bar: (counts, svgId, results = null) => {
    if (results?.length > 0 && results[0].solver_id) {
      return Charts.solverRanking(results, svgId);
    }

    const data = Object.entries(counts).map(([key, value]) => ({
      status: key,
      count: value,
    }));

    const { width, height } = Charts.getContainer(
      svgId.replace("Chart", "Container")
    );
    const margin = { top: 15, right: 15, bottom: 40, left: 50 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = Charts.initSvg(svgId, width, height);
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.status))
      .range([0, plotWidth])
      .padding(0.2);
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count)])
      .range([plotHeight, 0]);
    const colorScale = d3
      .scaleOrdinal()
      .domain(data.map((d) => d.status))
      .range(["#ff7f50", "#ffa500", "#ff8c00", "#ff6347", "#ffd700"]);

    g.append("g")
      .attr("transform", `translate(0,${plotHeight})`)
      .call(d3.axisBottom(xScale));
    g.append("g").call(d3.axisLeft(yScale));

    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.status))
      .attr("width", xScale.bandwidth())
      .attr("y", (d) => yScale(d.count))
      .attr("height", (d) => plotHeight - yScale(d.count))
      .attr("fill", (d) => colorScale(d.status))
      .attr("rx", 6);

    g.selectAll(".label")
      .data(data)
      .enter()
      .append("text")
      .attr("x", (d) => xScale(d.status) + xScale.bandwidth() / 2)
      .attr("y", (d) => yScale(d.count) - 10)
      .attr("text-anchor", "middle")
      .style("font", "600 14px monospace")
      .text((d) => d.count);
  },

  solverRanking: (results, svgId) => {
    const solvers = Charts.extractSolvers(results, 15).map((s, i) => ({
      ...s,
      name: results.find((r) => (r.solver_id || r.name) === s.id)?.name || s.id,
      score: s.solved * 1000 - s.totalTime,
      rank: i + 1,
    }));

    const container = d3.select("#chartContainer").node();
    const containerHeight = container ? container.clientHeight : 180;
    const margin = { top: 15, right: 20, bottom: 40, left: 35 };
    const width = 720;
    const height = Math.max(containerHeight - 20, 160);
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    d3.select(`#${svgId}`).selectAll("*").remove();
    const svg = d3
      .select(`#${svgId}`)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("display", "block")
      .style("margin", "0 auto");
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(solvers.map((s) => s.rank))
      .range([0, plotWidth])
      .padding(0.2);
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(solvers, (s) => s.solved)])
      .range([plotHeight, 0]);
    const colorScale = d3
      .scaleSequential(d3.interpolateOranges)
      .domain([0, solvers.length - 1]);

    g.selectAll(".grid")
      .data(yScale.ticks(4))
      .enter()
      .append("line")
      .attr("class", "grid")
      .attr("x1", 0)
      .attr("x2", plotWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .style("stroke", "#eee")
      .style("stroke-width", 1);

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(4))
      .selectAll("text")
      .style("font", "600 11px monospace");

    g.selectAll(".bar")
      .data(solvers)
      .enter()
      .append("rect")
      .attr("x", (s) => xScale(s.rank))
      .attr("width", xScale.bandwidth())
      .attr("y", (s) => yScale(s.solved))
      .attr("height", (s) => plotHeight - yScale(s.solved))
      .attr("fill", (s, i) => colorScale(i))
      .attr("rx", 2);

    g.selectAll(".value")
      .data(solvers)
      .enter()
      .append("text")
      .attr("x", (s) => xScale(s.rank) + xScale.bandwidth() / 2)
      .attr("y", (s) => yScale(s.solved) - 3)
      .attr("text-anchor", "middle")
      .style("font", "600 10px monospace")
      .style("fill", "#333")
      .text((s) => s.solved);

    g.selectAll(".rank-label")
      .data(solvers)
      .enter()
      .append("text")
      .attr("class", "rank-label")
      .attr("x", (s) => xScale(s.rank) + xScale.bandwidth() / 2)
      .attr("y", plotHeight + 12)
      .attr("text-anchor", "middle")
      .style("font", "700 9px monospace")
      .style("fill", "#ff6b35")
      .text((s) => `#${s.rank}`);

    g.selectAll(".solver-label")
      .data(solvers)
      .enter()
      .append("text")
      .attr("class", "solver-label")
      .attr("x", (s) => xScale(s.rank) + xScale.bandwidth() / 2)
      .attr("y", plotHeight + 25)
      .attr("text-anchor", "middle")
      .style("font", "500 7px monospace")
      .style("fill", "#666")
      .text((s) => (s.name.length > 6 ? s.name.substring(0, 6) + "." : s.name));

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -plotHeight / 2)
      .attr("y", -26)
      .attr("text-anchor", "middle")
      .style("font", "600 11px monospace")
      .style("fill", "#666")
      .text("Résolus");

    const tooltip = Charts.createTooltip();
    g.selectAll("rect")
      .on("mouseover", (e, d) => {
        d3.select(e.currentTarget).style(
          "filter",
          "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
        );
        const solveRate = ((d.solved / d.attempts) * 100).toFixed(1);
        const avgTime = d.solved > 0 ? (d.totalTime / d.solved).toFixed(2) : 0;
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.name}</strong><br/>${d.solved}/${d.attempts} (${solveRate}%)<br/>Temps: ${avgTime}s`
          )
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 10 + "px");
      })
      .on("mouseout", (e) => {
        d3.select(e.currentTarget).style(
          "filter",
          "drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
        );
        tooltip.style("opacity", 0);
      });
  },

  homeRanking: (results, svgId) => {
    Charts.solverRanking(results.slice(0, 5), svgId);
  },

  legend: (data, color, containerId, marginLeft) => {
    const container = d3.select(`#${containerId}`);
    container.select(".pie-legend").remove();

    const legend = container
      .append("div")
      .attr("class", "pie-legend")
      .style("margin-left", marginLeft)
      .style("display", "flex")
      .style("flex-direction", "column");

    const items = legend
      .selectAll(".legend-item")
      .data(data)
      .enter()
      .append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("margin-bottom", "12px");

    items
      .append("div")
      .style("width", "16px")
      .style("height", "16px")
      .style("border-radius", "50%")
      .style("margin-right", "12px")
      .style("background-color", (d) => color(d.status));

    items
      .append("span")
      .style("font", "600 13px monospace")
      .text((d) => `${d.status} (${d.percentage}%)`);
  },
};