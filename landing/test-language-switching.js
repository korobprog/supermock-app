// Simple test script to check language switching
const puppeteer = require('puppeteer');

async function testLanguageSwitching() {
    console.log('Starting language switching test...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Navigate to the app
        console.log('Navigating to http://localhost:3001...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
        
        // Wait for the page to load
        await page.waitForTimeout(3000);
        
        // Check if language switcher is visible
        console.log('Looking for language switcher...');
        const languageSwitcher = await page.$('[aria-label*="Current language"]');
        
        if (languageSwitcher) {
            console.log('✅ Language switcher found!');
            
            // Click on the language switcher
            await languageSwitcher.click();
            await page.waitForTimeout(1000);
            
            // Look for language options
            const russianOption = await page.$('button[role="option"]:has-text("Русский")');
            if (russianOption) {
                console.log('✅ Russian option found!');
                await russianOption.click();
                await page.waitForTimeout(2000);
                
                // Check if language changed
                const currentLang = await page.evaluate(() => {
                    return localStorage.getItem('language');
                });
                console.log('Current language in localStorage:', currentLang);
                
                // Check if the page content changed
                const pageContent = await page.content();
                if (pageContent.includes('Главная') || pageContent.includes('Возможности')) {
                    console.log('✅ Language switched to Russian successfully!');
                } else {
                    console.log('❌ Language switch failed - content not in Russian');
                }
            } else {
                console.log('❌ Russian option not found');
            }
        } else {
            console.log('❌ Language switcher not found');
        }
        
        // Take a screenshot
        await page.screenshot({ path: 'language-test-screenshot.png' });
        console.log('Screenshot saved as language-test-screenshot.png');
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
testLanguageSwitching().catch(console.error);
