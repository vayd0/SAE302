const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("closed");
});

const menuItems = document.querySelectorAll(".menu li");
const accueilSection = document.getElementById("accueil");
const statsSection = document.getElementById("stats");

menuItems.forEach((item, index) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    
    menuItems.forEach(menuItem => menuItem.classList.remove("active"));
    
    item.classList.add("active");
    
    if (index === 0) {
      accueilSection.style.display = "block";
      statsSection.style.display = "none";
    } else if (index === 1) {
      accueilSection.style.display = "none";
      statsSection.style.display = "block";
    }
  });
});

document.getElementById('advancedStatsBtn').addEventListener('click', () => {
  menuItems.forEach(menuItem => menuItem.classList.remove("active"));
  
  menuItems[1].classList.add("active");
  
  accueilSection.style.display = "none";
  statsSection.style.display = "block";
});

function remove_a(element) {
    const links = element.getElementsByTagName('a');
    while (links.length > 0) {
        const link = links[0];
        while (link.firstChild) {
            link.parentNode.insertBefore(link.firstChild, link);
        }
        link.parentNode.removeChild(link);
    }
}