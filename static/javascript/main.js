// Function to switch pages
function showPage(pageId, event) {
    if (event) event.preventDefault();

    window.location.hash = pageId;

    // Update Navbar Indicator
    const navLinks = document.querySelectorAll('.nav_menu a');
    navLinks.forEach(link => link.classList.remove('active'));

    const activeNavLink = document.querySelector(`.nav_menu a[onclick*="${pageId}"]`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }

    // Show Content
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => {
        page.style.display = 'none';
    });

    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.style.display = 'block';
    }

    if (event) window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Profile Dropdown Toggle
function toggleProfileMenu(event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const menu = document.getElementById('profileDropdown');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// Close dropdown when clicking anywhere else
window.addEventListener('click', function (e) {
    const menu = document.getElementById('profileDropdown');
    if (menu && menu.classList.contains('show')) {
        if (!menu.contains(e.target)) {
            menu.classList.remove('show');
        }
    }
});

// Date Picker Logic 
document.addEventListener('DOMContentLoaded', function () {
    const inEl = document.getElementById('check_in');
    const outEl = document.getElementById('check_out');

    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        showPage(hash, null);
    } else {
        showPage('home_section', null);
    }

    if (inEl && outEl) {
        const today = new Date();
        const isoToday = today.toISOString().split('T')[0];
        inEl.min = isoToday;
        inEl.value = isoToday;

        function addDays(d, n) {
            const x = new Date(d.getTime());
            x.setDate(x.getDate() + n);
            return x.toISOString().split('T')[0];
        }

        outEl.min = addDays(today, 1);
        outEl.value = addDays(today, 1);

        inEl.addEventListener('change', () => {
            const inDate = new Date(inEl.value);
            const newMin = addDays(inDate, 1);
            if (!outEl.value || outEl.value <= inEl.value) {
                outEl.value = newMin;
            }
            outEl.min = newMin;
        });
    }
});


