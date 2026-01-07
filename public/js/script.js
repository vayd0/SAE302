fetch('https://www.cril.univ-artois.fr/~lecoutre/teaching/jssae/code5/results.json')
.then(response => response.json())
.then(data => {
    const results = data.find(item => item.type === 'table' && item.name === 'results').data;
    const counts = results.reduce((acc, r) => (acc[r.status] = (acc[r.status] || 0) + 1, acc), {});
    
    document.getElementById('totalCountTitle').textContent = results.length + " ";
    document.getElementById('successRate').textContent = 
        Math.round(((counts['SAT'] || 0) / results.length) * 100) + '%';
    
    Charts.pie(counts, 'pieContainer', 'pieChart');
    Charts.radar(results, 'scatterChart');
    Charts.bar(counts, 'chart', results);
});