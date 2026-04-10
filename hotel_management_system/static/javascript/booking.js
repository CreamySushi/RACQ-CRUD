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
        desc: 'Ideal for business travelers or individuals, the Single Room features a comfortable twin-sized bed, a dedicated workspace, and modern amenities. It offers a private sanctuary with everything you need for a restful stay.'
    },
    'double_room': {
        assetDir: 'Double',
        images: ['Double1.jpg', 'Double2.jpg', 'Double3.jpg', 'Double4.jpg', 'Double5.jpg', 'Double6.jpg', 'Double7.jpg', 'Double8.jpg'],
        desc: 'Our Double Room is equipped with a plush full or queen-sized bed, perfect for couples. The room is thoughtfully designed with contemporary decor, high-speed internet, and a spacious bathroom to ensure a relaxing experience.'
    },
    'twin_room': {
        assetDir: 'Twin',
        images: ['Twin.jpg', 'Twin1.jpg', 'Twin2.jpg', 'Twin3.jpg', 'Twin4.jpg', 'Twin5.jpg', 'Twin6.jpg', 'Twin7.jpg', 'Twin8.jpg'],
        desc: 'Perfect for friends or colleagues traveling together, the Twin Room offers two separate single beds. The layout maximizes space and comfort, providing individual sleeping areas without compromising on style or amenities.'
    },
    'premium_room': {
        assetDir: 'Premium',
        images: ['Premium.jpg', 'Premium1.jpg', 'Premium2.jpg', 'Premium3.jpg', 'Premium4.jpg', 'Premium5.jpg', 'Premium6.jpg', 'Premium7.jpg', 'Premium8.jpg'],
        desc: 'Our Deluxe Room offers a blend of luxury and functionality. It features a generous floor plan, sophisticated interior design, a lounge seating area, and an oversized bathroom. It is designed for guests who prioritize comfort and aesthetic appeal.'
    },
    'deluxe_room': {
        assetDir: 'Deluxe',
        images: ['Deluxe.jpg', 'Deluxe1.jpg', 'Deluxe2.jpg', 'Deluxe3.jpg', 'Deluxe4.jpg', 'Deluxe5.jpg', 'Deluxe6.jpg', 'Deluxe7.png', 'Deluxe8.jpg'],
        desc: 'Designed for the high-end traveler, the Executive Room offers the pinnacle of hotel living. It includes a king-sized bed, a spacious ergonomic workstation, and access to exclusive services. With refined decor and top-tier amenities, it provides an environment conducive to both productivity and relaxation.'
    },
    'executive_room': {
        assetDir: 'Executive',
        images: ['Executive.jpg', 'Executive1.jpg', 'Executive2.jpg', 'Executive3.jpg', 'Executive4.jpg', 'Executive5.jpg', 'Executive6.jpg', 'Executive7.jpg', 'Executive8.jpg'],
        desc: 'Designed for the modern professional. Spacious and sophisticated with working space and top-tier facilities.'
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
            descriptionText.innerText = roomInfo[roomType].desc;
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