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
            
            calculateReceipt();
        }
    }

   
    document.querySelectorAll('.form_step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.progress_step').forEach(el => el.classList.remove('active'));

    
    document.getElementById('step' + step).classList.add('active');
    

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
    
    if (roomSelect.selectedOptions[0].style.display === "none") {
        roomSelect.value = "";
    }
}

const roomInfo = {
    'single_room': {
        assetDir: 'Single',
        images: ['Single.jpg', 'Single1.jpg', 'Single2.jpg', 'Single3.jpg', 'Single4.jpg', 'Single5.jpg', 'Single6.jpg', 'Single7.jpg', 'Single8.jpg'],
        desc: '<strong>Bed Type:</strong> 1 Single/Twin Bed<br><strong>Occupancy:</strong> 1 Adult<br><strong>Key Features:</strong><ul><li>Compact, ergonomic layout optimized for solo travelers.</li><li>Dedicated work desk with accessible power outlets.</li><li>En-suite bathroom with a walk-in rainfall shower.</li><li>Smart LED TV and high-speed Wi-Fi.</li><li>In-room coffee and tea-making facilities.</li></ul>'
    },
    'double_room': {
        assetDir: 'Double',
        images: ['Double1.jpg', 'Double2.jpg', 'Double3.jpg', 'Double4.jpg', 'Double5.jpg', 'Double6.jpg', 'Double7.jpg', 'Double8.jpg'],
        desc: '<strong>Bed Type:</strong> 1 Queen or King Bed<br><strong>Occupancy:</strong> 2 Adults<br><strong>Key Features:</strong><ul><li>Spacious floor plan with a comfortable seating area.</li><li>Large wardrobe with an integrated digital safe.</li><li>Blackout curtains for an undisturbed sleep experience.</li><li>Modern vanity mirror and full-length mirror.</li><li>Individually controlled air conditioning and heating.</li></ul>'
    },
    'twin_room': {
        assetDir: 'Twin',
        images: ['Twin.jpg', 'Twin1.jpg', 'Twin2.jpg', 'Twin3.jpg', 'Twin4.jpg', 'Twin5.jpg', 'Twin6.jpg', 'Twin7.jpg', 'Twin8.jpg'],
        desc: '<strong>Bed Type:</strong> 2 Separate Single Beds<br><strong>Occupancy:</strong> 2 Adults<br><strong>Key Features:</strong><ul><li>Symmetrical layout providing equal space for both guests.</li><li>Dual bedside tables with individual reading lamps.</li><li>Large windows providing ample natural light.</li><li>High-speed internet access and multiple USB charging ports.</li><li>Private bathroom stocked with premium towels and toiletries.</li></ul>'
    },
    'premium_room': {
        assetDir: 'Premium',
        images: ['Premium.jpg', 'Premium1.jpg', 'Premium2.jpg', 'Premium3.jpg', 'Premium4.jpg', 'Premium5.jpg', 'Premium6.jpg', 'Premium7.jpg', 'Premium8.jpg'],
        desc: '<strong>Bed Type:</strong> 1 Luxury King Bed<br><strong>Occupancy:</strong> 2 Adults<br><strong>Key Features:</strong><ul><li>Located on higher floors for better city or garden views.</li><li>Upgraded bedding featuring high-thread-count linens.</li><li>Mini-bar stocked with a selection of beverages and snacks.</li><li>Bathrobes and plush slippers provided for extra comfort.</li><li>Enhanced soundproofing for a quieter environment.</li></ul>'
    },
    'deluxe_room': {
        assetDir: 'Deluxe',
        images: ['Deluxe.jpg', 'Deluxe1.jpg', 'Deluxe2.jpg', 'Deluxe3.jpg', 'Deluxe4.jpg', 'Deluxe5.jpg', 'Deluxe6.jpg', 'Deluxe7.png', 'Deluxe8.jpg'],
        desc: '<strong>Bed Type:</strong> 1 California King Bed<br><strong>Occupancy:</strong> 2 Adults (Space for 1 extra bed)<br><strong>Key Features:</strong><ul><li>Expansive living space including a small lounge or sofa area.</li><li>Luxury bathroom featuring a separate soaking tub and shower.</li><li>State-of-the-art entertainment system with surround sound.</li><li>Nespresso machine or premium coffee station.</li><li>Walk-in closet with ample storage for long-term stays.</li></ul>'
    },
    'executive_room': {
        assetDir: 'Executive',
        images: ['Executive.jpg', 'Executive1.jpg', 'Executive2.jpg', 'Executive3.jpg', 'Executive4.jpg', 'Executive5.jpg', 'Executive6.jpg', 'Executive7.jpg', 'Executive8.jpg'],
        desc: '<strong>Bed Type:</strong> 1 Grand King Bed<br><strong>Occupancy:</strong> 2 Adults<br><strong>Key Features:</strong><ul><li>Top-floor location with panoramic views.</li><li>Large ergonomic workstation designed for business productivity.</li><li>Exclusive access to the Executive Lounge (complimentary breakfast/drinks).</li><li>Smart room automation (lighting, temperature, and drapes controlled by tablet).</li><li>Priority check-in and late check-out services.</li></ul>'
    }
};

function getRandomRoomImagePath(roomType) {
    const info = roomInfo[roomType];
    if (!info || !info.images || info.images.length === 0) return '';

    const randomIndex = Math.floor(Math.random() * info.images.length);
    return '/static/assets/' + info.assetDir + '/' + info.images[randomIndex];
}

function updateRoomDetails() {
    const roomSelect = document.getElementById('room_id_select');
    const typeSelect = document.getElementById('room_type_select');
    const descriptionContainer = document.getElementById('room_description_container');
    const descriptionText = document.getElementById('room_description_text');
    const previewImage = document.getElementById('room_preview_image');
    
    
    if(roomSelect.selectedIndex > 0) {
        const selectedOption = roomSelect.options[roomSelect.selectedIndex];
        const roomType = selectedOption.getAttribute('data-type');
        typeSelect.value = roomType;

        if (roomType && roomInfo[roomType]) {
            descriptionText.innerHTML = roomInfo[roomType].desc;
            if (previewImage) {
                const randomImagePath = getRandomRoomImagePath(roomType);
                if (randomImagePath) {
                    previewImage.src = randomImagePath;
                    previewImage.style.display = "block";
                } else {
                    previewImage.style.display = "none";
                }
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
    
    
    document.getElementById('input_total_amount').value = total.toFixed(2);
}


document.addEventListener('DOMContentLoaded', function() {
    
    updateRoomDetails();

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;

            const tag = (e.target.tagName || '').toLowerCase();
            const isTextarea = tag === 'textarea';
            const isSubmitButton = tag === 'button' && e.target.type === 'submit';

            if (!isTextarea && !isSubmitButton && currentStep < 4) {
                e.preventDefault();
            }
        });
    }

    const Check_In = document.getElementById('checkin');
    const Check_Out = document.getElementById('checkout');

    
    function addDays(d, n) {
        const x = new Date(d.getTime());
        x.setDate(x.getDate() + n);
        return x.toISOString().split('T')[0];
    }

    if (Check_In && Check_Out) {
        const today = new Date();
        const isoToday = today.toISOString().split('T')[0];
        
        
        Check_In.min = isoToday;

        
        if (Check_In.value) {
            const currentIn = new Date(Check_In.value);
            const minOut = addDays(currentIn, 1);
            
            
            Check_Out.min = minOut;

            
            if (Check_Out.value && Check_Out.value <= Check_In.value) {
                Check_Out.value = minOut; 
            }
        } else {
           
            Check_Out.min = addDays(today, 1);
        }

        
        Check_In.addEventListener('change', () => {
            if (!Check_In.value) return;
            
            const inDate = new Date(Check_In.value);
            const newMin = addDays(inDate, 1);

            
            Check_Out.min = newMin;

            
            if (!Check_Out.value || Check_Out.value <= Check_In.value) {
                Check_Out.value = newMin;
            }
        });

        
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


        if (Check_In.value) {
            
            const currentIn = new Date(Check_In.value);
            Check_Out.min = addDays(currentIn, 1);
        } else {
            Check_Out.min = addDays(today, 1);
        }

        Check_In.addEventListener('change', () => {
            if (!Check_In.value) return;
            
            const inDate = new Date(Check_In.value);
            const newMin = addDays(inDate, 1);

            
            if (!Check_Out.value || Check_Out.value <= Check_In.value) {
                Check_Out.value = newMin;
            }
            
            Check_Out.min = newMin;
        })
});