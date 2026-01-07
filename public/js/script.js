window.addEventListener('DOMContentLoaded', function() {
    const loadingScreen = document.getElementById('loadingScreen');
    const progressBar = document.getElementById('progressBar');
    
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        progressBar.style.width = progress + '%';
        
        if (progress >= 100) {
            clearInterval(loadingInterval);
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 500);
        }
    }, 100);
});

fetch('https://www.cril.univ-artois.fr/~lecoutre/teaching/jssae/code5/results.json')
.then(response => response.json())
.then(data => {
    const results = data.find(item => item.type === 'table' && item.name === 'results').data;
    const counts = results.reduce((acc, r) => (acc[r.status] = (acc[r.status] || 0) + 1, acc), {});
    
    const total = results.length;
    const satCount = counts['SAT'] || 0;
    const unsatCount = counts['UNSAT'] || 0;
    const successRate = Math.round(((satCount + unsatCount) / total) * 100);
    
    document.getElementById('successRateCard').textContent = successRate + '%';
    document.getElementById('satCount').textContent = satCount.toLocaleString();
    document.getElementById('unsatCount').textContent = unsatCount.toLocaleString();
    document.getElementById('totalCount').textContent = total.toLocaleString();
    document.getElementById('satPercent').textContent = Math.round((satCount / total) * 100) + '%';
    document.getElementById('unsatPercent').textContent = Math.round((unsatCount / total) * 100) + '%';
    
    Charts.pie(counts, 'pieContainer', 'pieChart');
    Charts.radar(results, 'scatterChart');
    Charts.bar(counts, 'chart', results);
    
    Charts.heatmap(results, 'heatmapContainer', 'heatmapChart');
    Charts.timeline(results, 'timelineContainer', 'timelineChart');
})
.catch(error => {
    console.error('Erreur lors du chargement des données:', error);
});