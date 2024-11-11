const subscription_button = document.getElementById('sub');
const regular_button = document.getElementById('reg');

//on planload check if user is paid
chrome.runtime.sendMessage({action: 'checkUserPaid'}, response => {
    console.log(response);
    if (response.paid) {
        console.log('User is paid');
        const free_plan = document.getElementById('free-plan');
        // hide free plan
        free_plan.style.display = 'none';
        subscription_button.textContent = 'Manage Subscription';
        
        // create manage settings button
        const manage_settings_button = document.createElement('button');
        manage_settings_button.textContent = 'Extension Settings';
        manage_settings_button.classList.add('plan-button');
        manage_settings_button.style.width = '20%';
        
        // Improved centering
        manage_settings_button.style.display = 'block';
        manage_settings_button.style.margin = '20px auto';
        manage_settings_button.style.textAlign = 'center';
        
        // insert it before class comparison-table
        const comparison_table = document.querySelector('.comparison-table');

        //load to options page
        manage_settings_button.addEventListener('click', () => {
            chrome.runtime.sendMessage({action: 'openOptionsPage'});
        });
        comparison_table.parentNode.insertBefore(manage_settings_button, comparison_table);
        
        subscription_button.addEventListener('click', () => {
            chrome.runtime.sendMessage({action: 'openPayment'});
        });
        regular_button.style.display = 'block';
    } else {
        //use is not paid, all we need.
        console.log('User is not paid');
        subscription_button.addEventListener('click', () => {
            chrome.runtime.sendMessage({action: 'openPayment'});
        });
    }
});

regular_button.addEventListener('click', () => {
    console.log('Regular button clicked');
    // open extension options.html in new tab
    chrome.runtime.sendMessage({action: 'openOptionsPage'});
});