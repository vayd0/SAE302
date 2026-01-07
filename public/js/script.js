fetch('https://www.cril.univ-artois.fr/~lecoutre/teaching/jssae/code5/results.json')
.then(response => response.json())
.then(data => {
    const tableData = data.find(item => 
        item.type === 'table' && item.name === 'results'
    );
    
    const results = tableData.data;
    
    const counts = {};
    results.forEach(r => {
        counts[r.status] = (counts[r.status] || 0) + 1;
    });
    
    createD3Chart(counts);
});

function createD3Chart(counts) {
    const data = Object.entries(counts).map(([key, value]) => ({
        status: key,
        count: value
    }));

    const margin = {top: 20, right: 30, bottom: 40, left: 50};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(data.map(d => d.status))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height, 0]);

    const colors = ['#ff7f50', '#ffa500', '#ff8c00', '#ff6347', '#ffd700', '#ffb347', '#ff9966'];
    const color = d3.scaleOrdinal()
        .domain(data.map(d => d.status))
        .range(colors);

    g.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500");

    g.append("g")
        .attr("class", "axis y-axis")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500");

    const bars = g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.status))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.count))
        .attr("height", d => height - y(d.count))
        .attr("fill", d => color(d.status))
        .attr("rx", 4)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    const labels = g.selectAll(".label")
        .data(data)
        .enter().append("text")
        .attr("class", "label")
        .attr("x", d => x(d.status) + x.bandwidth() / 2)
        .attr("y", d => y(d.count) - 8)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("opacity", 1)
        .text(d => d.count);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "10px 15px")
        .style("border-radius", "8px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", "1000");

    bars.on("mouseover", function(event, d) {
        d3.select(this)
            .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))")
            .style("opacity", 0.8);

        tooltip.style("opacity", 1);
        
        tooltip.html(`<strong>${d.status}</strong><br/>Count: ${d.count}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
        d3.select(this)
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
            .style("opacity", 1);

        tooltip.style("opacity", 0);
    });
}