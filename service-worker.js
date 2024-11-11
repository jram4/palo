importScripts('./scripts/google-analytics.js', './ExtPay.js');

const extPay = new ExtPay('palo-ai');
//for ext pay 

//analytics testing.
self.addEventListener('unhandledrejection', async (event) => {
  self.Analytics.fireErrorEvent(event.reason);
});

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "install") {
        self.Analytics.fireEvent('analytics_installed');
        chrome.tabs.create({
            url: 'https://paloai.github.io/onboarding?install=true'
        });
    }
});

//message listeners for all.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    //track an analytics event.
    if (message.action === "trackEvent" && message.eventName) {
        self.Analytics.fireEvent(message.eventName);
    }
    //reload the main page.
    if (message.action === "reloadPopup") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.reload(tabs[0].id);
            }
        });
    }
    //check if the user is paid, and return the response.
    if (message.action === "checkUserPaid") {
        extPay.getUser().then(user => {
            sendResponse({paid: true});
        });
        return true; 
    }
    //open the ext payment page.
    if (message.action === "openPayment") {
        extPay.openPaymentPage();
    }
    //fetch the quota. maybe increase it.
    if (message.action === "fetchQuota") {
        extPay.getUser().then(user => {
            let user_paid = user.paid;
            user_paid = true;
            if (user_paid) {
                sendResponse({ quota: 1747 });
            } else {
                chrome.storage.sync.get(['quota', 'quota_date'], function(data) {
                    let currentDate = new Date();
                    let quotaDate = data.quota_date ? new Date(data.quota_date) : null;
                    let quota = data.quota;
                    if (quota === undefined) {quota = 20;}
                    if (!quotaDate || quotaDate.getDate() !== currentDate.getDate()) {
                        quota = 20;
                        quotaDate = currentDate;
                        chrome.storage.sync.set({
                            quota: quota,
                            quota_date: quotaDate.toISOString()
                        });
                    }

                    sendResponse({ quota: quota });
                });
            }
        });
        return true;
    }
    //decrement the quota
    if (message.action === "decreaseQuota") {
        chrome.storage.sync.get(['quota'], function(data) {
            let quota = data.quota;
            if (quota === 1747){
                return;
            }
            if (quota <= 0) {
                return;
            }
            quota -= 1;
            chrome.storage.sync.set({quota: quota});
        });
    }
    //open the plans page because i dont think other scripts have permission.
    if (message.action === "openPlansPage") {
        chrome.tabs.create({
            url: chrome.runtime.getURL("plans.html")
        });
    }
    if (message.action === "openOptionsPage") {
        chrome.tabs.create({
            url: chrome.runtime.getURL("options.html")
        });
    }
});

extPay.startBackground();