window.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const progressBar = document.getElementById('progressBar');
    const loadingText = document.getElementById('loadingPercent');

    let progress = 0;

    const interval = setInterval(() => {
        if (progress < 90) {
            progress += 1;
        } else if (progress < 99) {
            progress += 0.3;
        } else {
            progress = 100;
        }

        progressBar.style.width = `${progress}%`;
        loadingText.textContent = `${Math.floor(progress)}%`;

        if (progress === 100) {
            clearInterval(interval);

            setTimeout(() => {
                loadingScreen.classList.add('fade-out');

                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 1000);
        }
    }, 20);
});