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

function updateRoomDetails() {
    // Can be used to update the Lorem Ipsum text dynamically if you had descriptions in DB
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
    // 1. Run Filter initially (in case Room Type is passed in URL)
    filterRooms();

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

    // If dates exist in URL and inputs are filled
    if (hasCheckin && hasCheckout && inVal && outVal) {
        
        nextStep(1);
    }
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