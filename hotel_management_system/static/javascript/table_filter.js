document.addEventListener('DOMContentLoaded', function() {
    // Select all search inputs within table headers
    const searchInputs = document.querySelectorAll('.table_header input[type="search"]');

    searchInputs.forEach(input => {
        // Listen for typing (keyup event)
        input.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            
            // Find the wrapper and table associated with this specific input
            // (Assumes .table_wrapper is a sibling or inside the same parent container)
            const header = this.closest('.table_header');
            const parent = header.parentElement;
            const tableBody = parent.querySelector('tbody');
            
            if (tableBody) {
                const rows = tableBody.getElementsByTagName('tr');
                
                // Loop through all table rows
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    // Get all text content in the row
                    const rowText = row.textContent.toLowerCase();
                    
                    // Show or hide based on match
                    if (rowText.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            }
        });
    });
});