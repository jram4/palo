document.addEventListener('DOMContentLoaded', function() {
    const api_key_input = document.getElementById('apiKey');
    const theme_name = document.getElementById('theme-name');
    const mode_switch = document.getElementById('modeSwitch');
    const save_button = document.getElementById('saveButton');
    const status_element = document.getElementById('status');
    const themePreview = document.getElementById('themePreview');

    const manage_plans = document.getElementById('subButton');
    let isPaidUser = false;

    chrome.runtime.sendMessage({action: 'checkUserPaid'}, response => {
        isPaidUser = response.paid;
        if (isPaidUser) {
            manage_plans.textContent = 'Manage Palo+';
        } else {
            manage_plans.textContent = 'Upgrade to Palo+';
        }
        manage_plans.addEventListener('click', () => {
            chrome.tabs.create({
                url: 'plans.html'
            });
        });
        updateThemeGrid();
    });

    //posible themes    
    const themes = [
        { name: 'Default', key: 'default', isPremium: false },
        { name: 'Palo', key: 'palo', isPremium: false },
        { name: 'Ocean', key: 'ocean', isPremium: false },
        { name: 'Forest', key: 'forest', isPremium: true },
        { name: 'Sunset', key: 'sunset', isPremium: true },
        { name: 'Lavender Dreams', key: 'lavender-dreams', isPremium: true },
        { name: 'Mint Breeze', key: 'mint-breeze', isPremium: true },
        { name: 'Golden Sands', key: 'golden-sands', isPremium: true },
        { name: 'Cherry Blossom', key: 'cherry-blossom', isPremium: true },
        { name: 'Emerald City', key: 'emerald-city', isPremium: true },
        { name: 'Arctic Frost', key: 'arctic-frost', isPremium: true }
    ];
    
    let currentThemeIndex = 0;

    //is user allowed to use the themej
    function updateThemeGrid() {
        const currentTheme = themes[currentThemeIndex];
        theme_name.textContent = currentTheme.name;
        
        if (!isPaidUser && currentTheme.isPremium) {
            themePreview.classList.add('blocked');
        } else {
            themePreview.classList.remove('blocked');
        }

        applyTheme(currentTheme.key, mode_switch.checked ? 'dark' : 'light');
    }

    function calcNextThemeIndex(current, increment) {
        let next = current + increment;
        if (next < 0) {
            next = themes.length - 1;
        } else if (next >= themes.length) {
            next = 0;
        }
        return next;
    }

    const theme_back = document.getElementById('theme-back');
    const theme_next = document.getElementById('theme-next');
    theme_back.addEventListener('click', () => {
        currentThemeIndex = calcNextThemeIndex(currentThemeIndex, -1);
        updateThemeGrid();
    });
    theme_next.addEventListener('click', () => {
        currentThemeIndex = calcNextThemeIndex(currentThemeIndex, 1);
        updateThemeGrid();
    });

    // sets css attributes for the theme and mode
    function applyTheme(theme, mode) {
        const fullTheme = `${theme}-${mode}`;
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-mode', mode);
        mode_switch.checked = (mode === 'dark');
    }

    //kinda gave up on this
    function isSystemDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // load saved preferenes
    chrome.storage.sync.get(['apiKey', 'theme', 'mode'], function(data) {
        if (data.apiKey) {
            api_key_input.value = data.apiKey;
        }
        
        let theme = 'default';
        let mode = 'light';

        if (data.theme) {
            const savedThemeIndex = themes.findIndex(t => t.key === data.theme);
            if (savedThemeIndex !== -1) {
                currentThemeIndex = savedThemeIndex;
                theme = data.theme;
            }
        }

        // check if mode is saved or use system preference
        if (data.mode) {
            mode = data.mode;
        } else {
            mode = isSystemDarkMode() ? 'dark' : 'light';
        }

        applyTheme(theme, mode);
        updateThemeGrid();
    });

    // mode switch event listener
    mode_switch.addEventListener('change', function() {
        const mode = this.checked ? 'dark' : 'light';
        applyTheme(themes[currentThemeIndex].key, mode);
    });

    const theme_locked = document.getElementById('themeLocked');
    theme_locked.addEventListener('click', () => {
        chrome.tabs.create({
            url: 'chrome-extension://febegeohmiiandnohfaiojdcedkoionk/plans.html'
        });
    });

    // save button click event
    save_button.addEventListener('click', function() {
        const apiKey = api_key_input.value;
        const currentTheme = themes[currentThemeIndex];
        const mode = mode_switch.checked ? 'dark' : 'light';

        // always save the api key
        chrome.storage.sync.set({apiKey: apiKey}, function() {
            if (!isPaidUser && currentTheme.isPremium) {
                //if user is not paid and trying to save a premium theme
                status_element.textContent = 'Please Upgrade to Palo+ for access to all themes. API key saved.';
                setTimeout(() => {
                    status_element.textContent = '';
                }, 3000);
            } else {
                // save theme and mode only if user is paid or theme is not premium
                chrome.storage.sync.set({theme: currentTheme.key, mode: mode}, function() {
                    status_element.textContent = 'Preferences Saved!';
                });
                //doesnt actually reload the popup, it reloads the page beneath, like youtube most of the time. so that the theme can apply.
                setTimeout(() => {
                    chrome.runtime.sendMessage({action: "reloadPopup"});
                }, 50);
                setTimeout(() => {
                    status_element.textContent = '';
                }, 3000);
            }

            
        });
    });

    // listen for system color scheme changes
    window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
        chrome.storage.sync.get('mode', (data) => {
            if (!data.mode) {
                const newMode = e.matches ? 'dark' : 'light';
                applyTheme(themes[currentThemeIndex].key, newMode);
            }
        });
    });
});