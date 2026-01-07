const Charts = {
    pie: (counts, containerId, svgId) => {
        const data = Object.entries(counts).map(([key, value]) => ({
            status: key,
            count: value,
            percentage: Math.round((value / Object.values(counts).reduce((a,b) => a+b, 0)) * 100)
        }));

        const container = d3.select(`#${containerId.replace('Container', '')}`).node();
        const containerHeight = container ? container.clientHeight : 280;
        const containerWidth = container ? container.clientWidth : 380;
        
        const [width, height] = [Math.min(containerWidth - 40, 380), Math.max(containerHeight - 40, 200)];
        const radius = Math.min(width, height) / 2.5;
        
        const svg = d3.select(`#${svgId}`).selectAll("*").remove() && 
                   d3.select(`#${svgId}`).attr("viewBox", `0 0 ${width} ${height}`);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const g = svg.append("g").attr("transform", `translate(${centerX},${centerY})`);

        const color = d3.scaleOrdinal()
            .domain(data.map(d => d.status))
            .range(['#ff7f50', '#ffa500', '#ff8c00', '#ff6347', '#ffd700']);

        const arc = d3.arc().innerRadius(radius * 0.4).outerRadius(radius * 0.9);
        const pie = d3.pie().value(d => d.count).sort(null);

        const arcs = g.selectAll(".arc").data(pie(data)).enter().append("g");
        arcs.append("path").attr("d", arc).attr("fill", d => color(d.data.status))
            .style("stroke", "#fff").style("stroke-width", 2);
        arcs.append("text").attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle").style("font", "700 12px \"Space Mono\", monospace")
            .style("fill", "#333").text(d => d.data.percentage + '%');

        Charts.legend(data, color, containerId, "30px");
    },

    radar: (results, svgId) => {
        const solverStats = {};
        results.forEach(d => {
            const solverId = d.solver_id || d.name || 'Unknown';
            const solverName = d.name || `Solver ${solverId}`;
            if (!solverStats[solverId]) {
                solverStats[solverId] = { name: solverName, count: 0 };
            }
            solverStats[solverId].count++;
        });

        const data = results.filter(d => {
            const time = parseFloat(d.time);
            const variables = parseInt(d.variables) || parseInt(d.nb_vars);
            const clauses = parseInt(d.clauses) || parseInt(d.nb_clauses);
            return !isNaN(time) && time > 0 && (variables > 0 || clauses > 0);
        }).map(d => {
            const solverId = d.solver_id || d.name || 'Unknown';
            return {
                time: parseFloat(d.time),
                size: parseInt(d.variables) || parseInt(d.nb_vars) || parseInt(d.clauses) || parseInt(d.nb_clauses),
                status: d.status || 'UNKNOWN',
                solverId: solverId,
                solverName: solverStats[solverId]?.name || 'Unknown',
                solverCount: solverStats[solverId]?.count || 1
            };
        });

        const container = d3.select('#scatterContainer').node();
        const containerHeight = container ? container.clientHeight : 280;
        const [margin, width, height] = [{ top: 20, right: 25, bottom: 40, left: 45 }, 400, Math.max(containerHeight - 20, 220)];
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;

        d3.select(`#${svgId}`).selectAll("*").remove();
        const svg = d3.select(`#${svgId}`)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("width", "100%")
            .attr("height", "100%");
        
        const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

        const xScale = d3.scaleLinear().domain(d3.extent(data, d => d.size)).range([0, plotWidth]);
        const yScale = d3.scaleLog().domain([0.1, 10000]).range([plotHeight, 0]);
        const colorScale = d3.scaleOrdinal().domain(['SAT', 'UNSAT', 'UNKNOWN']).range(['#ff6b35', '#4ecdc4', '#95a5a6']);
        const sizeScale = d3.scaleSqrt().domain(d3.extent(data, d => d.solverCount)).range([1, 6]);

        const xTicks = xScale.ticks(6);
        const yTicks = [0.1, 1, 10, 100, 1000, 10000];

        g.selectAll(".x-grid").data(xTicks).enter().append("line").attr("class", "x-grid")
            .attr("x1", d => xScale(d)).attr("x2", d => xScale(d)).attr("y1", 0).attr("y2", plotHeight)
            .attr("stroke", "#f0f0f0").attr("stroke-width", 1);

        g.selectAll(".y-grid").data(yTicks.filter(d => d >= yScale.domain()[0] && d <= yScale.domain()[1]))
            .enter().append("line").attr("class", "y-grid").attr("x1", 0).attr("x2", plotWidth)
            .attr("y1", d => yScale(d)).attr("y2", d => yScale(d)).attr("stroke", "#f0f0f0").attr("stroke-width", 1);

        g.append("line").attr("x1", 0).attr("x2", plotWidth).attr("y1", yScale(10000)).attr("y2", yScale(10000))
            .attr("stroke", "#e74c3c").attr("stroke-width", 2).attr("stroke-dasharray", "5,5");

        g.append("text").attr("x", plotWidth - 5).attr("y", yScale(10000) - 5).attr("text-anchor", "end")
            .style("font", "600 10px \"Space Mono\", monospace").style("fill", "#e74c3c").text("Timeout (10000s)");

        const points = g.selectAll(".scatter-point").data(data).enter().append("circle").attr("class", "scatter-point")
            .attr("cx", d => xScale(d.size)).attr("cy", d => yScale(Math.max(0.1, d.time))).attr("r", d => sizeScale(d.solverCount))
            .attr("fill", d => colorScale(d.status)).attr("fill-opacity", 0.05).attr("stroke", "none").style("cursor", "pointer");

        const tooltip = d3.select("body").append("div").attr("class", "scatter-tooltip")
            .style("position", "absolute").style("background", "rgba(0,0,0,0.9)").style("color", "white")
            .style("padding", "8px 12px").style("border-radius", "6px").style("font-size", "12px")
            .style("pointer-events", "none").style("opacity", 0).style("z-index", "1000")
            .style("box-shadow", "0 2px 8px rgba(0,0,0,0.3)");

        points.on("mouseover", function(event, d) {
            d3.select(this).transition().duration(150).attr("fill-opacity", 0.8).attr("r", d => sizeScale(d.solverCount) + 1);
            tooltip.transition().duration(150).style("opacity", 1);
            tooltip.html(`<strong>${d.solverName}</strong><br/>Status: ${d.status}<br/>Taille: ${d.size.toLocaleString()}<br/>Temps: ${d.time.toFixed(2)}s<br/>Problèmes: ${d.solverCount}`)
                .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 10) + "px");
        }).on("mouseout", function(event, d) {
            d3.select(this).transition().duration(150).attr("fill-opacity", 0.05).attr("r", d => sizeScale(d.solverCount));
            tooltip.transition().duration(150).style("opacity", 0);
        });

        const bins = 20;
        const xExtent = d3.extent(data, d => d.size);
        const binSize = (xExtent[1] - xExtent[0]) / bins;
        const trendData = [];

        for (let i = 0; i < bins; i++) {
            const binStart = xExtent[0] + i * binSize;
            const binEnd = binStart + binSize;
            const binData = data.filter(d => d.size >= binStart && d.size < binEnd && d.status !== 'UNKNOWN');
            
            if (binData.length > 5) {
                const binCenter = (binStart + binEnd) / 2;
                const medianTime = d3.median(binData, d => d.time);
                trendData.push({ size: binCenter, time: medianTime });
            }
        }

        if (trendData.length > 1) {
            const line = d3.line().x(d => xScale(d.size)).y(d => yScale(Math.max(0.1, d.time))).curve(d3.curveMonotoneX);
            g.append("path").datum(trendData).attr("d", line).attr("fill", "none")
                .attr("stroke", "#2c3e50").attr("stroke-width", 2).attr("opacity", 0.7);
        }

        g.append("g").attr("transform", `translate(0,${plotHeight})`).call(d3.axisBottom(xScale).tickFormat(d3.format(".0s")))
            .selectAll("text").style("font", "11px \"Space Mono\", monospace");

        g.append("g").call(d3.axisLeft(yScale).tickValues(yTicks.filter(d => d >= yScale.domain()[0] && d <= yScale.domain()[1]))
            .tickFormat(d => d >= 1 ? d + "s" : d.toFixed(1) + "s")).selectAll("text").style("font", "11px \"Space Mono\", monospace");

        g.append("text").attr("x", plotWidth / 2).attr("y", plotHeight + 35).attr("text-anchor", "middle")
            .style("font", "600 10px \"Space Mono\", monospace").style("fill", "#666").text("Taille du problème");

        g.append("text").attr("transform", "rotate(-90)").attr("x", -plotHeight / 2).attr("y", -35).attr("text-anchor", "middle")
            .style("font", "600 10px \"Space Mono\", monospace").style("fill", "#666").text("Temps (log)");

        const legend = g.append("g").attr("transform", `translate(${plotWidth - 60}, 10)`);
        const legendData = [
            { status: 'SAT', color: colorScale('SAT') },
            { status: 'UNSAT', color: colorScale('UNSAT') },
            { status: 'UNKNOWN', color: colorScale('UNKNOWN') }
        ];

        legendData.forEach((d, i) => {
            const legendItem = legend.append("g").attr("transform", `translate(0, ${i * 15})`);
            legendItem.append("circle").attr("cx", 6).attr("cy", 0).attr("r", 3).attr("fill", d.color).attr("fill-opacity", 0.8);
            legendItem.append("text").attr("x", 12).attr("y", 3).style("font", "600 9px \"Space Mono\", monospace")
                .style("fill", "#333").text(d.status);
        });
    },

    bar: (counts, svgId, results = null) => {
        if (results && results.length > 0 && results[0].solver_id) {
            return Charts.solverRanking(results, svgId);
        }
        
        const data = Object.entries(counts).map(([key, value]) => ({ status: key, count: value }));
        const [margin, width, height] = [{ top: 20, right: 30, bottom: 40, left: 50 }, 720, 360];

        const svg = d3.select(`#${svgId}`).attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom);
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const [x, y] = [
            d3.scaleBand().domain(data.map(d => d.status)).range([0, width]).padding(0.1),
            d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).range([height, 0])
        ];

        const color = d3.scaleOrdinal().domain(data.map(d => d.status)).range(['#ff7f50', '#ffa500', '#ff8c00', '#ff6347', '#ffd700']);

        g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
            .selectAll("text").style("font", "500 12px \"Space Mono\", monospace");
        g.append("g").call(d3.axisLeft(y)).selectAll("text").style("font", "500 12px \"Space Mono\", monospace");

        const bars = g.selectAll(".bar").data(data).enter().append("rect")
            .attr("x", d => x(d.status)).attr("width", x.bandwidth()).attr("y", d => y(d.count)).attr("height", d => height - y(d.count))
            .attr("fill", d => color(d.status)).attr("rx", 4).style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

        g.selectAll(".label").data(data).enter().append("text")
            .attr("x", d => x(d.status) + x.bandwidth() / 2).attr("y", d => y(d.count) - 8).attr("text-anchor", "middle")
            .style("font", "600 14px \"Space Mono\", monospace").text(d => d.count);

        const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("position", "absolute")
            .style("background", "rgba(0,0,0,0.8)").style("color", "white").style("padding", "10px 15px")
            .style("border-radius", "8px").style("font-size", "12px").style("pointer-events", "none")
            .style("opacity", 0).style("z-index", "1000");

        bars.on("mouseover", function(e, d) {
            d3.select(this).style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))").style("opacity", 0.8);
            tooltip.style("opacity", 1).html(`<strong>${d.status}</strong><br/>Count: ${d.count}`)
                .style("left", (e.pageX + 10) + "px").style("top", (e.pageY - 10) + "px");
        }).on("mouseout", function() {
            d3.select(this).style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))").style("opacity", 1);
            tooltip.style("opacity", 0);
        });
    },

    solverRanking: (results, svgId) => {
        const solverStats = {};
        
        results.forEach(d => {
            const solverId = d.solver_id || d.name || 'Unknown';
            if (!solverStats[solverId]) {
                solverStats[solverId] = {
                    name: d.name || `Solver ${solverId}`,
                    solved: 0,
                    totalTime: 0,
                    attempts: 0
                };
            }
            
            solverStats[solverId].attempts++;
            if (d.status === 'SAT' || d.status === 'UNSAT') {
                solverStats[solverId].solved++;
                solverStats[solverId].totalTime += parseFloat(d.time) || 0;
            }
        });

        const solvers = Object.entries(solverStats).map(([id, stats]) => ({
            id,
            name: stats.name,
            solved: stats.solved,
            totalTime: stats.totalTime,
            attempts: stats.attempts,
            solveRate: (stats.solved / stats.attempts * 100).toFixed(1),
            avgTime: stats.solved > 0 ? (stats.totalTime / stats.solved).toFixed(2) : 0,
            score: stats.solved * 1000 - stats.totalTime
        }));

        const topSolvers = solvers.sort((a, b) => b.score - a.score).slice(0, 15);

        const container = d3.select('#chartContainer').node();
        const containerHeight = container ? container.clientHeight : 180;
        const [margin, width, height] = [{ top: 15, right: 20, bottom: 40, left: 35 }, 720, Math.max(containerHeight - 20, 160)];
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;

        d3.select(`#${svgId}`).selectAll("*").remove();
        const svg = d3.select(`#${svgId}`).attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom).style("display", "block").style("margin", "0 auto");
        
        const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

        const x = d3.scaleBand().domain(topSolvers.map((d, i) => i + 1)).range([0, plotWidth]).padding(0.2);
        const y = d3.scaleLinear().domain([0, d3.max(topSolvers, d => d.solved)]).range([plotHeight, 0]);
        const colorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, topSolvers.length - 1]);

        g.selectAll(".grid").data(y.ticks(4)).enter().append("line").attr("class", "grid")
            .attr("x1", 0).attr("x2", plotWidth).attr("y1", d => y(d)).attr("y2", d => y(d))
            .style("stroke", "#eee").style("stroke-width", 1);

        g.append("g").call(d3.axisLeft(y).ticks(4)).selectAll("text").style("font", "600 11px \"Space Mono\", monospace");

        const bars = g.selectAll(".bar").data(topSolvers).enter().append("rect")
            .attr("x", (d, i) => x(i + 1)).attr("width", x.bandwidth()).attr("y", d => y(d.solved))
            .attr("height", d => plotHeight - y(d.solved)).attr("fill", (d, i) => colorScale(i)).attr("rx", 2)
            .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.1))");

        g.selectAll(".value-label").data(topSolvers).enter().append("text").attr("class", "value-label")
            .attr("x", (d, i) => x(i + 1) + x.bandwidth() / 2).attr("y", d => y(d.solved) - 3).attr("text-anchor", "middle")
            .style("font", "600 10px \"Space Mono\", monospace").style("fill", "#333").text(d => d.solved);

        g.selectAll(".rank-label").data(topSolvers).enter().append("text").attr("class", "rank-label")
            .attr("x", (d, i) => x(i + 1) + x.bandwidth() / 2).attr("y", plotHeight + 12).attr("text-anchor", "middle")
            .style("font", "700 9px \"Space Mono\", monospace").style("fill", "#ff6b35").text((d, i) => `#${i + 1}`);

        g.selectAll(".solver-label").data(topSolvers).enter().append("text").attr("class", "solver-label")
            .attr("x", (d, i) => x(i + 1) + x.bandwidth() / 2).attr("y", plotHeight + 25).attr("text-anchor", "middle")
            .style("font", "500 7px \"Space Mono\", monospace").style("fill", "#666")
            .text(d => d.name.length > 6 ? d.name.substring(0, 6) + "." : d.name);

        g.append("text").attr("transform", "rotate(-90)").attr("x", -plotHeight / 2).attr("y", -25).attr("text-anchor", "middle")
            .style("font", "600 11px \"Space Mono\", monospace").style("fill", "#666").text("Résolus");

        const tooltip = d3.select("body").append("div").attr("class", "solver-tooltip").style("position", "absolute")
            .style("background", "rgba(0,0,0,0.9)").style("color", "white").style("padding", "8px")
            .style("border-radius", "6px").style("font-size", "11px").style("pointer-events", "none")
            .style("opacity", 0).style("z-index", "1000");

        bars.on("mouseover", function(e, d) {
            d3.select(this).style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))");
            tooltip.style("opacity", 1).html(`<strong>${d.name}</strong><br/>${d.solved}/${d.attempts} (${d.solveRate}%)<br/>Temps: ${d.avgTime}s`)
                .style("left", (e.pageX + 10) + "px").style("top", (e.pageY - 10) + "px");
        }).on("mouseout", function() {
            d3.select(this).style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.1))");
            tooltip.style("opacity", 0);
        });
    },

    legend: (data, color, containerId, marginLeft) => {
        const container = d3.select(`#${containerId}`);
        container.select(".pie-legend").remove();
        
        const legend = container.append("div").attr("class", "pie-legend").style("margin-left", marginLeft)
            .style("display", "flex").style("flex-direction", "column").style("justify-content", "center");

        const items = legend.selectAll(".legend-item").data(data).enter().append("div")
            .style("display", "flex").style("align-items", "center").style("margin-bottom", "12px");

        items.append("div").style("width", "16px").style("height", "16px").style("border-radius", "50%")
            .style("margin-right", "12px").style("background-color", d => color(d.status));

        items.append("span").style("font", "600 13px \"Space Mono\", monospace").style("color", "#666")
            .text(d => `${d.status} (${d.percentage}%)`);
    }
};