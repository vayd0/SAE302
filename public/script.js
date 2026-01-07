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
    
    createChart(counts);
});

function createChart(counts) {
    new Chart(document.getElementById('salesChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Statuts des problèmes'
                }
            }
        }
    });
}