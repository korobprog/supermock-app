// Debug script to check language switcher functionality
console.log('=== Language Switcher Debug ===');

// Check if we're in browser environment
if (typeof window !== 'undefined') {
    console.log('Running in browser environment');
    
    // Wait for page to load
    setTimeout(() => {
        console.log('Page loaded, checking language switcher...');
        
        // Find language switcher button
        const languageSwitcher = document.querySelector('[aria-label*="Current language"]');
        console.log('Language switcher found:', languageSwitcher);
        
        if (languageSwitcher) {
            console.log('Language switcher attributes:', {
                'aria-expanded': languageSwitcher.getAttribute('aria-expanded'),
                'aria-haspopup': languageSwitcher.getAttribute('aria-haspopup'),
                'onclick': languageSwitcher.onclick,
                'class': languageSwitcher.className
            });
            
            // Check if there are any event listeners
            console.log('Event listeners:', getEventListeners ? getEventListeners(languageSwitcher) : 'getEventListeners not available');
            
            // Try to click the button
            console.log('Attempting to click language switcher...');
            languageSwitcher.click();
            
            // Wait a bit and check if dropdown appeared
            setTimeout(() => {
                const dropdown = document.querySelector('[role="listbox"]');
                console.log('Dropdown found after click:', dropdown);
                
                if (dropdown) {
                    console.log('Dropdown is visible:', dropdown.style.display !== 'none');
                    console.log('Dropdown classes:', dropdown.className);
                    
                    // Look for language options
                    const options = dropdown.querySelectorAll('[role="option"]');
                    console.log('Language options found:', options.length);
                    
                    options.forEach((option, index) => {
                        console.log(`Option ${index}:`, {
                            text: option.textContent,
                            'aria-selected': option.getAttribute('aria-selected'),
                            onclick: option.onclick
                        });
                    });
                } else {
                    console.log('No dropdown found after click');
                }
            }, 1000);
        } else {
            console.log('Language switcher not found');
        }
        
        // Check localStorage
        console.log('Current language in localStorage:', localStorage.getItem('language'));
        
        // Check if i18n is available
        if (window.i18n) {
            console.log('i18n available:', {
                language: window.i18n.language,
                isInitialized: window.i18n.isInitialized,
                languages: window.i18n.languages
            });
        } else {
            console.log('i18n not available on window object');
        }
        
    }, 2000);
} else {
    console.log('Not in browser environment');
}
