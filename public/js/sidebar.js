const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("closed");
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