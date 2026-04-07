let currentStep = 1;

function nextStep(step) {
    // Validation before moving forward
    if (step > currentStep) {
        if (currentStep === 1) {
            const inDate = document.getElementById('checkin').value;
            const outDate = document.getElementById('checkout').value;
            if (!inDate || !outDate) {
                alert("Please select both Check-in and Check-out dates.");
                return;
            }
        }
        if (currentStep === 2) {
            const room = document.getElementById('room_id_select').value;
            if (!room) {
                alert("Please select a room.");
                return;
            }
            
            const adults = parseInt(document.getElementById('adults_count').value) || 0;
            const children = parseInt(document.getElementById('children_count').value) || 0;
            const infants = parseInt(document.getElementById('infants_count').value) || 0;
            
            if (adults < 1) {
                alert("At least 1 adult is required to make a booking.");
                return;
            }
            
            // Calculate totals before showing Step 3
            calculateReceipt();
        }
    }

    // Hide all steps
    document.querySelectorAll('.form_step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.progress_step').forEach(el => el.classList.remove('active'));

    // Show target step
    document.getElementById('step' + step).classList.add('active');
    
    // Update progress bar (highlight all steps up to current)
    for(let i=1; i<=step; i++) {
        document.getElementById('p_step' + i).classList.add('active');
    }

    currentStep = step;
}

function filterRooms() {
    const typeSelect = document.getElementById('room_type_select');
    const roomSelect = document.getElementById('room_id_select');
    const selectedType = typeSelect.value;
    const options = roomSelect.getElementsByTagName('option');

    let firstVisible = "";

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const roomType = option.getAttribute('data-type');

        if (option.value === "") {
            option.style.display = "";
            continue;
        }

        if (selectedType === "" || roomType === selectedType) {
            option.style.display = "";
            if(!firstVisible) firstVisible = option.value;
        } else {
            option.style.display = "none";
        }
    }
    
    // Reset selection if current selection is hidden
    if (roomSelect.selectedOptions[0].style.display === "none") {
        roomSelect.value = "";
    }
}

const roomInfo = {
    'single_room': {
        img: 'single-bed.jpg',
        desc: 'Perfect for solo travelers. A cozy and comfortable room equipped with all the essentials for a relaxing stay.'
    },
    'double_room': {
        img: 'double-bed.jpg',
        desc: 'Ideal for couples or friends. A spacious room featuring a comfortable double bed and modern amenities.'
    },
    'twin_room': {
        img: 'double-bed.jpg', 
        desc: 'Great for companions. This room offers two separate single beds for individual comfort.'
    },
    'premium_room': {
        img: 'Deluxe.png', 
        desc: 'Experience elevated luxury. Premium rooms offer extra space, superior comfort, and exclusive amenities.'
    },
    'deluxe_room': {
        img: 'Deluxe.png',
        desc: 'A touch of elegance. Our Deluxe rooms provide premium furnishings and beautiful views for an unforgettable stay.'
    },
    'executive_room': {
        img: 'Executive.png',
        desc: 'Designed for the modern professional. Spacious and sophisticated with working space and top-tier facilities.'
    }
};

function updateRoomDetails() {
    const roomSelect = document.getElementById('room_id_select');
    const typeSelect = document.getElementById('room_type_select');
    const descriptionContainer = document.getElementById('room_description_container');
    const descriptionText = document.getElementById('room_description_text');
    const previewImage = document.getElementById('room_preview_image');
    
    // If a room is selected, extract its data-type and set the room_type_select to match automatically
    if(roomSelect.selectedIndex > 0) {
        const selectedOption = roomSelect.options[roomSelect.selectedIndex];
        const roomType = selectedOption.getAttribute('data-type');
        typeSelect.value = roomType;

        if (roomType && roomInfo[roomType]) {
            descriptionText.innerText = roomInfo[roomType].desc;
            if (previewImage) {
                previewImage.src = "/static/assets/" + roomInfo[roomType].img;
                previewImage.style.display = "block";
            }
            if (descriptionContainer) descriptionContainer.style.display = "block";
        } else {
            if (descriptionContainer) descriptionContainer.style.display = "none";
        }
    } else {
        typeSelect.value = "";
        if (descriptionContainer) descriptionContainer.style.display = "none";
    }
}

function calculateReceipt() {
    const inDate = new Date(document.getElementById('checkin').value);
    const outDate = new Date(document.getElementById('checkout').value);
    const roomSelect = document.getElementById('room_id_select');
    const selectedOption = roomSelect.options[roomSelect.selectedIndex];
    
    const price = parseFloat(selectedOption.getAttribute('data-price'));
    const roomText = selectedOption.text;

    // Calculate Days
    const diffTime = Math.abs(outDate - inDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const total = diffDays * price;

    // Update HTML
    document.getElementById('summary_checkin').innerText = inDate.toISOString().split('T')[0];
    document.getElementById('summary_checkout').innerText = outDate.toISOString().split('T')[0];
    document.getElementById('summary_days').innerText = diffDays + " Nights";
    document.getElementById('summary_room').innerText = roomText;
    document.getElementById('summary_price').innerText = "₱" + price;
    document.getElementById('summary_total').innerText = "₱" + total.toFixed(2);
    
    // Update Hidden Input
    document.getElementById('input_total_amount').value = total.toFixed(2);
}

// AUTO-SKIP LOGIC (Runs on Load)
document.addEventListener('DOMContentLoaded', function() {
    // Auto-select type on load if a room was pre-selected via URL
    updateRoomDetails();

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;

            const tag = (e.target.tagName || '').toLowerCase();
            const isTextarea = tag === 'textarea';
            const isSubmitButton = tag === 'button' && e.target.type === 'submit';

            // Block Enter-to-submit on Steps 1-3 to prevent accidental booking.
            if (!isTextarea && !isSubmitButton && currentStep < 4) {
                e.preventDefault();
            }
        });
    }

    const Check_In = document.getElementById('checkin');
    const Check_Out = document.getElementById('checkout');

    // Helper to add days (must be defined before use)
    function addDays(d, n) {
        const x = new Date(d.getTime());
        x.setDate(x.getDate() + n);
        return x.toISOString().split('T')[0];
    }

    if (Check_In && Check_Out) {
        const today = new Date();
        const isoToday = today.toISOString().split('T')[0];
        
        // A. Set Minimum Check-in to Today
        Check_In.min = isoToday;

        // B. Validate Pre-filled Values (Fixes the issue you asked about)
        if (Check_In.value) {
            const currentIn = new Date(Check_In.value);
            const minOut = addDays(currentIn, 1);
            
            // Set minimum checkout date based on checkin
            Check_Out.min = minOut;

            // FIX: Compare values, not elements. Ensure checkout > checkin
            if (Check_Out.value && Check_Out.value <= Check_In.value) {
                Check_Out.value = minOut; // Auto-correct to the next day
            }
        } else {
            // Default min checkout is tomorrow
            Check_Out.min = addDays(today, 1);
        }

        // C. Event Listener: When Check-in changes, update Check-out limits
        Check_In.addEventListener('change', () => {
            if (!Check_In.value) return;
            
            const inDate = new Date(Check_In.value);
            const newMin = addDays(inDate, 1);

            // Update the minimum allowed date for checkout
            Check_Out.min = newMin;

            // If current checkout is now invalid (before or same as new checkin), fix it
            if (!Check_Out.value || Check_Out.value <= Check_In.value) {
                Check_Out.value = newMin;
            }
        });

        // D. Event Listener: Prevent manual invalid Check-out
        Check_Out.addEventListener('change', () => {
            if (Check_In.value && Check_Out.value <= Check_In.value) {
                alert("Check-out date must be after check-in date.");
                const inDate = new Date(Check_In.value);
                Check_Out.value = addDays(inDate, 1);
            }
        });
    }
    // 2. Check if Dates are passed in URL
    const urlParams = new URLSearchParams(window.location.search);
    const hasCheckin = urlParams.has('checkin_date');
    const hasCheckout = urlParams.has('checkout_date');
    const inVal = document.getElementById('checkin').value;
    const outVal = document.getElementById('checkout').value;

    // Optional: We removed the auto-skip so users can review the dates in step 1.
    // if (hasCheckin && hasCheckout && inVal && outVal) {
    //    nextStep(2);
    // }
    // 3. Set initial Check-out Minimum
        if (Check_In.value) {
            // If URL pre-filled the date, base min checkout on that
            const currentIn = new Date(Check_In.value);
            Check_Out.min = addDays(currentIn, 1);
        } else {
            Check_Out.min = addDays(today, 1);
        }

        // 4. Update Check-out constraints when Check-in changes
        Check_In.addEventListener('change', () => {
            if (!Check_In.value) return;
            
            const inDate = new Date(Check_In.value);
            const newMin = addDays(inDate, 1);

            // If current checkout is invalid (before or same as new checkin), update it
            if (!Check_Out.value || Check_Out.value <= Check_In.value) {
                Check_Out.value = newMin;
            }
            // Always update the minimum allowed date
            Check_Out.min = newMin;
        })
});