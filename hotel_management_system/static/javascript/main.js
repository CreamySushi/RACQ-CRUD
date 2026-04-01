// 1. Function to switch pages
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

    if(event) window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 2. Profile Dropdown Toggle
function toggleProfileMenu(event) {
    if (event && event.stopPropagation) event.stopPropagation(); // Prevent click from bubbling to window
    const menu = document.getElementById('profileDropdown');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// 3. Close dropdown when clicking anywhere else
window.addEventListener('click', function (e) {
    const menu = document.getElementById('profileDropdown');
    if (menu && menu.classList.contains('show')) {
        if (!menu.contains(e.target)) {
            menu.classList.remove('show');
        }
    }
});

// 4. Date Picker Logic (Wrapped in DOMContentLoaded to be safe)
document.addEventListener('DOMContentLoaded', function () {
    const inEl = document.getElementById('check_in');
    const outEl = document.getElementById('check_out');

    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        // If hash exists and matches an ID, show that page
        showPage(hash, null);
    } else {
        // Default to Home if no hash
        showPage('home_section', null);
    }

    // Only run if elements exist
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


// ----------------------- FILTER BUTTON -------------------
document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const header = this.parentElement;
            let input = header.querySelector('.dynamic-search');

            // If input exists, we are in "Close" mode
            if (input) {
                input.remove();
                this.textContent = 'Filter';
                this.classList.remove('active');
                
                // Reset table rows to show everything
                const tableWrapper = header.nextElementSibling; 
                const rows = tableWrapper.querySelectorAll('tbody tr');
                rows.forEach(row => row.style.display = '');
            } 
            
            else {
                input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'Type Status, Type, or Name...';
                input.className = 'dynamic-search'; 
                
                
                header.insertBefore(input, this);
                
                this.textContent = 'Close';
                this.classList.add('active');
                input.focus();

                // Add the typing listener
                input.addEventListener('keyup', function() {
                    const filterValue = this.value.toLowerCase();
                    const tableWrapper = header.nextElementSibling;
                    const rows = tableWrapper.querySelectorAll('tbody tr');

                    rows.forEach(row => {
                        // Get all text in the row
                        const rowText = row.textContent.toLowerCase();
                        
                        // If row contains the filter text, show it, else hide it
                        if (rowText.includes(filterValue)) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                });
            }
        });
    });
});