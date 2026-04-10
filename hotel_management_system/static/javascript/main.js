const HERO_IMAGES = {
    rooms: '/static/assets/rooms-head.jpg'
};

function preloadImage(src) {
    if (!src) return;
    const img = new Image();
    img.src = src;
}

function ensureRoomsHeroLoaded() {
    const roomsHeader = document.querySelector('.rooms_header');
    if (!roomsHeader || roomsHeader.classList.contains('hero-ready')) return;
    roomsHeader.classList.add('hero-ready');
}


function showPage(pageId, event) {
    if (event) event.preventDefault();

    window.location.hash = pageId;

   
    const navLinks = document.querySelectorAll('.nav_menu a');
    navLinks.forEach(link => link.classList.remove('active'));

    const activeNavLink = document.querySelector(`.nav_menu a[onclick*="${pageId}"]`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }

   
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => {
        page.style.display = 'none';
    });

    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.style.display = 'block';
    }

    if (pageId === 'rooms_section') {
        ensureRoomsHeroLoaded();
    }

    if (event) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
}


function toggleProfileMenu(event) {
    if (event && event.stopPropagation) event.stopPropagation(); 
    const menu = document.getElementById('profileDropdown');
    if (menu) {
        menu.classList.toggle('show');
    }
}


window.addEventListener('click', function (e) {
    const menu = document.getElementById('profileDropdown');
    if (menu && menu.classList.contains('show')) {
        if (!menu.contains(e.target)) {
            menu.classList.remove('show');
        }
    }
});


document.addEventListener('DOMContentLoaded', function () {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    const inEl = document.getElementById('check_in');
    const outEl = document.getElementById('check_out');

    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
       
        showPage(hash, null);
    } else {
        
        showPage('home_section', null);
    }

    const prefetchRoomsHero = () => preloadImage(HERO_IMAGES.rooms);
    if ('requestIdleCallback' in window) {
        requestIdleCallback(prefetchRoomsHero, { timeout: 2000 });
    } else {
        setTimeout(prefetchRoomsHero, 1200);
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


// ----------------------- FILTER BUTTON -------------------
document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const header = this.parentElement;
            let input = header.querySelector('.dynamic-search');

            
            if (input) {
                input.remove();
                this.textContent = 'Filter';
                this.classList.remove('active');
                
                
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

                
                input.addEventListener('keyup', function() {
                    const filterValue = this.value.toLowerCase();
                    const tableWrapper = header.nextElementSibling;
                    const rows = tableWrapper.querySelectorAll('tbody tr');

                    rows.forEach(row => {
                        
                        const rowText = row.textContent.toLowerCase();
                        
                        
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

// Mobile Nav Toggle (Sidebar)
document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.querySelector('.nav_toggle');
    const navMenu = document.querySelector('.nav_menu');

    const closeMobileMenu = () => {
        if (!navMenu || !navToggle) return;
        navMenu.classList.remove('active');
        document.body.classList.remove('menu-open');
        navToggle.setAttribute('aria-expanded', 'false');
        const icon = navToggle.querySelector('i');
        if (icon) icon.className = 'uil uil-bars';
    };

    if (navToggle && navMenu) {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
            const isOpen = navMenu.classList.contains('active');
            document.body.classList.toggle('menu-open', isOpen);
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            
            
            const icon = navToggle.querySelector('i');
            if(isOpen) {
                icon.className = 'uil uil-multiply'; // Close icon
            } else {
                icon.className = 'uil uil-bars'; // Burger icon
            }
        });
    }

    
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && navMenu && navMenu.classList.contains('active')) {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                closeMobileMenu();
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu && navMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    const navLinks = document.querySelectorAll('.nav_menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024 && navMenu) {
                closeMobileMenu();
            }
        });
    });
});

// Gallery filters and lightbox
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.gallery_filter_btn');
    const galleryItems = document.querySelectorAll('.gallery_item');
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImage = document.getElementById('galleryLightboxImage');
    const lightboxCaption = document.getElementById('galleryLightboxCaption');
    const lightboxDesc = document.getElementById('galleryLightboxDesc');
    const lightboxClose = document.getElementById('galleryLightboxClose');
    const mediaButtons = document.querySelectorAll('.gallery_media_btn');

    const roomDescriptions = {
        single: {
            name: 'Single Room',
            bedType: '1 Single/Twin Bed',
            occupancy: '1 Adult',
            features: [
                'Compact, ergonomic layout optimized for solo travelers.',
                'Dedicated work desk with accessible power outlets.',
                'En-suite bathroom with a walk-in rainfall shower.',
                'Smart LED TV and high-speed Wi-Fi.',
                'In-room coffee and tea-making facilities.'
            ]
        },
        double: {
            name: 'Double Room',
            bedType: '1 Queen or King Bed',
            occupancy: '2 Adults',
            features: [
                'Spacious floor plan with a comfortable seating area.',
                'Large wardrobe with an integrated digital safe.',
                'Blackout curtains for an undisturbed sleep experience.',
                'Modern vanity mirror and full-length mirror.',
                'Individually controlled air conditioning and heating.'
            ]
        },
        twin: {
            name: 'Twin Room',
            bedType: '2 Separate Single Beds',
            occupancy: '2 Adults',
            features: [
                'Symmetrical layout providing equal space for both guests.',
                'Dual bedside tables with individual reading lamps.',
                'Large windows providing ample natural light.',
                'High-speed internet access and multiple USB charging ports.',
                'Private bathroom stocked with premium towels and toiletries.'
            ]
        },
        premium: {
            name: 'Premium Room',
            bedType: '1 Luxury King Bed',
            occupancy: '2 Adults',
            features: [
                'Located on higher floors for better city or garden views.',
                'Upgraded bedding featuring high-thread-count linens.',
                'Mini-bar stocked with a selection of beverages and snacks.',
                'Bathrobes and plush slippers provided for extra comfort.',
                'Enhanced soundproofing for a quieter environment.'
            ]
        },
        deluxe: {
            name: 'Deluxe Room',
            bedType: '1 California King Bed',
            occupancy: '2 Adults (Space for 1 extra bed)',
            features: [
                'Expansive living space including a small lounge or sofa area.',
                'Luxury bathroom featuring a separate soaking tub and shower.',
                'State-of-the-art entertainment system with surround sound.',
                'Nespresso machine or premium coffee station.',
                'Walk-in closet with ample storage for long-term stays.'
            ]
        },
        executive: {
            name: 'Executive Room',
            bedType: '1 Grand King Bed',
            occupancy: '2 Adults',
            features: [
                'Top-floor location with panoramic views.',
                'Large ergonomic workstation designed for business productivity.',
                'Exclusive access to the Executive Lounge (complimentary breakfast/drinks).',
                'Smart room automation (lighting, temperature, and drapes controlled by tablet).',
                'Priority check-in and late check-out services.'
            ]
        }
    };

    if (filterButtons.length && galleryItems.length) {
        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const selected = button.getAttribute('data-filter');

                filterButtons.forEach((btn) => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });

                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');

                galleryItems.forEach((item) => {
                    const category = item.getAttribute('data-category');
                    const showItem = selected === 'all' || selected === category;
                    item.classList.toggle('hidden', !showItem);
                });
            });
        });
    }

    if (lightbox && lightboxImage && mediaButtons.length) {
        const closeLightbox = () => {
            lightbox.classList.remove('open');
            lightbox.setAttribute('aria-hidden', 'true');
            lightboxImage.src = '';
            lightboxCaption.textContent = '';
            lightboxDesc.innerHTML = '';
            document.body.style.overflow = '';
        };

        mediaButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const fullImage = button.getAttribute('data-full');
                const caption = button.getAttribute('data-caption') || '';
                const roomType = button.getAttribute('data-room-type') || '';
                
                if (!fullImage) return;

                lightboxImage.src = fullImage;
                lightboxCaption.textContent = caption;

                if (roomType && roomDescriptions[roomType]) {
                    const desc = roomDescriptions[roomType];
                    let descHTML = `<h3>${desc.name}</h3>`;
                    descHTML += `<p><strong>Bed Type:</strong> ${desc.bedType}</p>`;
                    descHTML += `<p><strong>Occupancy:</strong> ${desc.occupancy}</p>`;
                    descHTML += `<p><strong>Key Features:</strong></p><ul>`;
                    desc.features.forEach(feature => {
                        descHTML += `<li>${feature}</li>`;
                    });
                    descHTML += `</ul>`;
                    
                    if (lightboxDesc) {
                        lightboxDesc.innerHTML = descHTML;
                    }
                }

                lightbox.classList.add('open');
                lightbox.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
            });
        });

        if (lightboxClose) {
            lightboxClose.addEventListener('click', closeLightbox);
        }

        lightbox.addEventListener('click', (event) => {
            if (event.target === lightbox) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && lightbox.classList.contains('open')) {
                closeLightbox();
            }
        });
    }
});