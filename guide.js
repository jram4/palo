// function to apply the theme, sets css attributes for the theme and mode
function applyTheme(theme, mode) {
    const fullTheme = `${theme}-${mode}`;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', mode);
}

//checks stored themes and loads with applytheme.
function loadSavedTheme() {
    chrome.storage.sync.get(['theme', 'mode'], function(data) {
        if (data.theme && data.mode) {
            applyTheme(data.theme, data.mode);
        } else {
            //default to default-light theme if no theme is saved
            applyTheme('default', 'light');
        }
    });
}

// call the function to load and apply the saved theme when the page loads
document.addEventListener('DOMContentLoaded', loadSavedTheme);