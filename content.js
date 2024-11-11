let g_transcript = null;
let g_thinking = false;
let api_key = ""

//fetch api key
chrome.storage.sync.get('apiKey', function(data) {
    console.log("fetching api key")
    if (data.apiKey) {
        api_key = data.apiKey;
        console.log("api key updated")
        console.log(`api key: ${api_key}`)
    }
});


let extpay = ExtPay('palo-ai');

/**
 * Sends message to service-worker.js to check the user paid status. If the user has not paid, it will open the payment page.
 */
function checkUserPaid() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "checkUserPaid" }, function (response) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
            }
            console.log("User paid status:", response.paid);
            if (!response.paid) {
                console.log("User has not paid");
                extpay.openPaymentPage();
            }
            resolve(response.paid);
        });
    });
}

hello_store = ''
timeline_store = ''

/**
 * Simplified prompt function to Gemini, in the future easy to switch to another AI model.
 * @param {string} message - The prompt to send to Gemini. 
 * @returns {string} - The response from Gemini with error handling
 */
async function prompt(message) {
    chrome.runtime.sendMessage({ action: "trackEvent", eventName: "ai_prompt_ran" });
    //console.log("prompting ai" + message)
    let API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + api_key;
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: message }]
                    }
                ]
            })
        });
        if (!response.ok) {
            return "There was an error fetching a response"
        }
        const data = await response.json();
        if (data) {
            finish_reason = data.candidates[0].finishReason;
            if (finish_reason == "SAFETY") {
                return "Sorry, the request was deemed unsafe. This could be due to the content of the request or the context of the video.";
            } else if (finish_reason == "STOP"){
                return data.candidates[0].content.parts[0].text;
            } else if (finish_reason == "RECITATION") {
                return "Sorry, the request potentially contained copyright violations.";
            } else if (finish_reason == "OTHER") {
                return "Sorry, the request was blocked due to other reasons.";
            } else if (finish_reason == "BLOCKLIST") {
                return "Sorry, the request was blocked due to content restrictions.";
            } else if (finish_reason == "PROHIBITED_CONTENT") {
                return "Sorry, the request contained prohibited content.";
            } else if (finish_reason == "SPII") {
                return "Sorry, the request violated personally identifiable information (PII) guidelines.";
            } else if (finish_reason == "MALFORMED_FUNCTION_CALL") {
                return "Sorry, there was an error in the function call.";
            }
            return "hmm";
        }
    } catch (error) {
        console.error(error);
        //console.log(error);
        return "An error occurred while fetching the response"
    }
}

/**
 * Extracts video ID from the URL
 * @param {string} url - URL
 * @returns {string} - Video ID
 */
function getVideoId(url) {
    const urlObj = new URL(url);
    //const urlParams = new URLSearchParams(urlObj.search);
    //const v = urlParams.get('v');
    return new URLSearchParams(urlObj.search).get('v');
    //return v;
}

/**
 * Calls gapt to fetch the transcript. Also tracks the event.
 */
function fetchTranscript() {
    chrome.runtime.sendMessage({ action: "trackEvent", eventName: "transcript_fetched" });
    //console.log("fetching transcript")
    //remenant of old fetch transcript gapt is new
    gapt();
    
}


fetchTranscript();


/**
 * Creates and inserts the main extension box.
 */
function createExtensionBox(){
    //console.log(`FETCHED TRIENSTO INSTE NRISTN ESCRIPT EICHINESTEIN: ${g_transcript}`)
    //console.log("creating extension")
    const already_exists = document.getElementById("main-extension-box");
    if (already_exists) {
        return;
    }
    //console.log("looking for expandable metadata")
    const expandable_metadata_div = document.getElementById('panels');
    //console.log(`expandable_metadata_div: ${expandable_metadata_div}`)
    if (!expandable_metadata_div){
        //console.log("notfoundtryingagain")
        setTimeout(function(){
            createExtensionBox()
        }, 200)
        return;
    }
    //console.log("found expandable metadata")
    const extension_box = document.createElement("div");
    extension_box.id = "main-extension-box";
    //console.log("setting inner html")
    
    extension_box.innerHTML = `
        <div class="main-box chat-mode" id="mainBox">
        <div class="main-box-chat">
            <div class="top-bar">
                <div class="mode-buttons">
                    <button id="chatchattoggle" class="active" ><svg height="18px" width="18px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512.029 512.029" xml:space="preserve" transform="matrix(1, 0, 0, 1, 0, 0)rotate(0)" stroke="#000000" stroke-width="0.00512029">

<g id="SVGRepo_bgCarrier" stroke-width="0"/>

<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="3.0721739999999995"/>

<g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M385.039,0H126.991C56.862,0,0.015,56.847,0.015,126.976v130.048C0.015,327.153,56.862,384,126.991,384h22.357v106.667 c0,22.934,31.242,29.714,40.748,8.843c11.135-24.448,29.01-47.631,51.842-69.079c14.665-13.776,30.453-25.985,46.231-36.44 c6.534-4.329,11.999-7.676,16.016-9.99h80.855c70.129,0,126.976-56.847,126.976-126.976V126.976 C512.015,56.847,455.167,0,385.039,0z M469.348,257.024c0,46.565-37.745,84.309-84.309,84.309h-86.357 c-3.45,0-6.849,0.837-9.905,2.439c-5.072,2.659-13.497,7.575-24.176,14.651c-17.668,11.707-35.325,25.362-51.876,40.909 c-7.328,6.884-14.246,13.958-20.71,21.224v-57.89c0-11.782-9.551-21.333-21.333-21.333h-43.691 c-46.565,0-84.309-37.745-84.309-84.309V126.976c0-46.565,37.745-84.309,84.309-84.309h258.048 c46.565,0,84.309,37.745,84.309,84.309V257.024z"/> <path d="M128.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667 c23.573,0,42.667-19.093,42.667-42.667S151.588,149.333,128.015,149.333z"/> <path d="M256.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667s42.667-19.093,42.667-42.667 S279.588,149.333,256.015,149.333z"/> <path d="M384.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667 c23.573,0,42.667-19.093,42.667-42.667S407.588,149.333,384.015,149.333z"/> </g> </g> </g> </g>

</svg></button>
                    <button id="chattimelinetoggle"><svg width="18px" height="18px" viewBox="0 0 36 36" version="1.1"  preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <title>timeline-line</title>
	<path d="M10,18c0-1.3-0.8-2.4-2-2.8v-3.4c1.2-0.4,2-1.5,2-2.8c0-1.7-1.3-3-3-3S4,7.3,4,9c0,1.3,0.8,2.4,2,2.8v3.4
			c-1.2,0.4-2,1.5-2,2.8s0.8,2.4,2,2.8v3.4c-1.2,0.4-2,1.5-2,2.8c0,1.7,1.3,3,3,3s3-1.3,3-3c0-1.3-0.8-2.4-2-2.8v-3.4
			C9.2,20.4,10,19.3,10,18z"/>
	<path d="M31,10H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,10,31,10z"/>
	<path d="M31,19H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,19,31,19z"/>
	<path d="M31,28H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,28,31,28z"/>
    <rect width="36" height="36" fill-opacity="0"/>
</svg></button>
                    <button id="chattranscripttoggle"><svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <title>close-caption</title>
    <g id="Layer_2" data-name="Layer 2">
      <g id="invisible_box" data-name="invisible box">
        <rect width="48" height="48" fill="none"/>
      </g>
      <g id="icons_Q2" data-name="icons Q2">
        <g>
          <path d="M14,31h6a2.9,2.9,0,0,0,3-3V26H19v1H15V21h4v1h4V20a2.9,2.9,0,0,0-3-3H14a2.9,2.9,0,0,0-3,3v8A2.9,2.9,0,0,0,14,31Z"/>
          <path d="M28,31h6a2.9,2.9,0,0,0,3-3V26H33v1H29V21h4v1h4V20a2.9,2.9,0,0,0-3-3H28a2.9,2.9,0,0,0-3,3v8A2.9,2.9,0,0,0,28,31Z"/>
          <path d="M44,9H4a2,2,0,0,0-2,2V37a2,2,0,0,0,2,2H44a2,2,0,0,0,2-2V11A2,2,0,0,0,44,9ZM42,35H6V13H42Z"/>
        </g>
      </g>
    </g>
  </svg></button>
                    <!--<button id="chatsearchtoggle" ">Search</button>-->
                </div>


                <div class="quota-counter">
                    <span id="quota-counter">❄️: XX/20</span>
                    <div class="reset-timer">
                        <span id="reset-clock">Resets in: </span>
                    </div>
                </div>



                <div class="actions">
                <button id="chat-copy-button" class="clear-btn">
                        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M21 8C21 6.34315 19.6569 5 18 5H10C8.34315 5 7 6.34315 7 8V20C7 21.6569 8.34315 23 10 23H18C19.6569 23 21 21.6569 21 20V8ZM19 8C19 7.44772 18.5523 7 18 7H10C9.44772 7 9 7.44772 9 8V20C9 20.5523 9.44772 21 10 21H18C18.5523 21 19 20.5523 19 20V8Z" />
<path d="M6 3H16C16.5523 3 17 2.55228 17 2C17 1.44772 16.5523 1 16 1H6C4.34315 1 3 2.34315 3 4V18C3 18.5523 3.44772 19 4 19C4.55228 19 5 18.5523 5 18V4C5 3.44772 5.44772 3 6 3Z" />
</svg>
                    </button>
                    <button id="chatreload" class="clear-btn">
                        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.39502 12.0014C4.39544 12.4156 4.73156 12.751 5.14577 12.7506C5.55998 12.7502 5.89544 12.4141 5.89502 11.9999L4.39502 12.0014ZM6.28902 8.1116L6.91916 8.51834L6.91952 8.51777L6.28902 8.1116ZM9.33502 5.5336L9.0396 4.84424L9.03866 4.84464L9.33502 5.5336ZM13.256 5.1336L13.4085 4.39927L13.4062 4.39878L13.256 5.1336ZM16.73 7.0506L16.1901 7.57114L16.1907 7.57175L16.73 7.0506ZM17.7142 10.2078C17.8286 10.6059 18.2441 10.8358 18.6422 10.7214C19.0403 10.607 19.2703 10.1915 19.1558 9.79342L17.7142 10.2078ZM17.7091 9.81196C17.6049 10.2129 17.8455 10.6223 18.2464 10.7265C18.6473 10.8307 19.0567 10.5901 19.1609 10.1892L17.7091 9.81196ZM19.8709 7.45725C19.9751 7.05635 19.7346 6.6469 19.3337 6.54272C18.9328 6.43853 18.5233 6.67906 18.4191 7.07996L19.8709 7.45725ZM18.2353 10.7235C18.6345 10.8338 19.0476 10.5996 19.1579 10.2004C19.2683 9.80111 19.034 9.38802 18.6348 9.2777L18.2353 10.7235ZM15.9858 8.5457C15.5865 8.43537 15.1734 8.66959 15.0631 9.06884C14.9528 9.46809 15.187 9.88119 15.5863 9.99151L15.9858 8.5457ZM19.895 11.9999C19.8946 11.5856 19.5585 11.2502 19.1443 11.2506C18.7301 11.251 18.3946 11.5871 18.395 12.0014L19.895 11.9999ZM18.001 15.8896L17.3709 15.4829L17.3705 15.4834L18.001 15.8896ZM14.955 18.4676L15.2505 19.157L15.2514 19.1566L14.955 18.4676ZM11.034 18.8676L10.8815 19.6019L10.8839 19.6024L11.034 18.8676ZM7.56002 16.9506L8.09997 16.4301L8.09938 16.4295L7.56002 16.9506ZM6.57584 13.7934C6.46141 13.3953 6.04593 13.1654 5.64784 13.2798C5.24974 13.3942 5.01978 13.8097 5.13421 14.2078L6.57584 13.7934ZM6.58091 14.1892C6.6851 13.7884 6.44457 13.3789 6.04367 13.2747C5.64277 13.1705 5.23332 13.4111 5.12914 13.812L6.58091 14.1892ZM4.41914 16.544C4.31495 16.9449 4.55548 17.3543 4.95638 17.4585C5.35727 17.5627 5.76672 17.3221 5.87091 16.9212L4.41914 16.544ZM6.05478 13.2777C5.65553 13.1674 5.24244 13.4016 5.13212 13.8008C5.02179 14.2001 5.25601 14.6132 5.65526 14.7235L6.05478 13.2777ZM8.30426 15.4555C8.70351 15.5658 9.11661 15.3316 9.22693 14.9324C9.33726 14.5331 9.10304 14.12 8.70378 14.0097L8.30426 15.4555ZM5.89502 11.9999C5.89379 10.7649 6.24943 9.55591 6.91916 8.51834L5.65889 7.70487C4.83239 8.98532 4.3935 10.4773 4.39502 12.0014L5.89502 11.9999ZM6.91952 8.51777C7.57513 7.50005 8.51931 6.70094 9.63139 6.22256L9.03866 4.84464C7.65253 5.4409 6.47568 6.43693 5.65852 7.70544L6.91952 8.51777ZM9.63045 6.22297C10.7258 5.75356 11.9383 5.62986 13.1059 5.86842L13.4062 4.39878C11.9392 4.09906 10.4158 4.25448 9.0396 4.84424L9.63045 6.22297ZM13.1035 5.86793C14.2803 6.11232 15.3559 6.7059 16.1901 7.57114L17.27 6.53006C16.2264 5.44761 14.8807 4.70502 13.4085 4.39927L13.1035 5.86793ZM16.1907 7.57175C16.9065 8.31258 17.4296 9.21772 17.7142 10.2078L19.1558 9.79342C18.8035 8.5675 18.1557 7.44675 17.2694 6.52945L16.1907 7.57175ZM19.1609 10.1892L19.8709 7.45725L18.4191 7.07996L17.7091 9.81196L19.1609 10.1892ZM18.6348 9.2777L15.9858 8.5457L15.5863 9.99151L18.2353 10.7235L18.6348 9.2777ZM18.395 12.0014C18.3963 13.2363 18.0406 14.4453 17.3709 15.4829L18.6312 16.2963C19.4577 15.0159 19.8965 13.5239 19.895 11.9999L18.395 12.0014ZM17.3705 15.4834C16.7149 16.5012 15.7707 17.3003 14.6587 17.7786L15.2514 19.1566C16.6375 18.5603 17.8144 17.5643 18.6315 16.2958L17.3705 15.4834ZM14.6596 17.7782C13.5643 18.2476 12.3517 18.3713 11.1842 18.1328L10.8839 19.6024C12.3508 19.9021 13.8743 19.7467 15.2505 19.157L14.6596 17.7782ZM11.1865 18.1333C10.0098 17.8889 8.93411 17.2953 8.09997 16.4301L7.02008 17.4711C8.06363 18.5536 9.40936 19.2962 10.8815 19.6019L11.1865 18.1333ZM8.09938 16.4295C7.38355 15.6886 6.86042 14.7835 6.57584 13.7934L5.13421 14.2078C5.48658 15.4337 6.13433 16.5545 7.02067 17.4718L8.09938 16.4295ZM5.12914 13.812L4.41914 16.544L5.87091 16.9212L6.58091 14.1892L5.12914 13.812ZM5.65526 14.7235L8.30426 15.4555L8.70378 14.0097L6.05478 13.2777L5.65526 14.7235Z" />
</svg>
                    </button>
                    
                </div>
            </div>
            <div class="chat-window">
                <div class="chat-window-content">
                    <div class="load-wrapp">
      <div class="load-3">
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
      </div>
    </div>
                </div>
            </div>
            <div class="bottom-bar">
                <input id="chatinput" type="text" placeholder="Type a message...">
                <button id="chatSendButton">Send</button>
                <button id="clearbutton" class="clear-btn-btn">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="ffffff" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M15.0722 3.9967L20.7508 9.83395L17.0544 13.5304L13.0758 17.5H21.0041V19H7.93503L4.00195 15.0669L15.0722 3.9967ZM10.952 17.5L15.4628 12.9994L11.8268 9.3634L6.12327 15.0669L8.55635 17.5H10.952Z" fill="#ffffff"/>
</svg>
                    </button>
            </div>
        </div>
        <div class="main-box-timeline">
           <div class="top-bar">
                <div class="mode-buttons">
                    <button id="timechattoggle" ><svg height="18px" width="18px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512.029 512.029" xml:space="preserve" transform="matrix(1, 0, 0, 1, 0, 0)rotate(0)" stroke="#000000" stroke-width="0.00512029">

<g id="SVGRepo_bgCarrier" stroke-width="0"/>

<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="3.0721739999999995"/>

<g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M385.039,0H126.991C56.862,0,0.015,56.847,0.015,126.976v130.048C0.015,327.153,56.862,384,126.991,384h22.357v106.667 c0,22.934,31.242,29.714,40.748,8.843c11.135-24.448,29.01-47.631,51.842-69.079c14.665-13.776,30.453-25.985,46.231-36.44 c6.534-4.329,11.999-7.676,16.016-9.99h80.855c70.129,0,126.976-56.847,126.976-126.976V126.976 C512.015,56.847,455.167,0,385.039,0z M469.348,257.024c0,46.565-37.745,84.309-84.309,84.309h-86.357 c-3.45,0-6.849,0.837-9.905,2.439c-5.072,2.659-13.497,7.575-24.176,14.651c-17.668,11.707-35.325,25.362-51.876,40.909 c-7.328,6.884-14.246,13.958-20.71,21.224v-57.89c0-11.782-9.551-21.333-21.333-21.333h-43.691 c-46.565,0-84.309-37.745-84.309-84.309V126.976c0-46.565,37.745-84.309,84.309-84.309h258.048 c46.565,0,84.309,37.745,84.309,84.309V257.024z"/> <path d="M128.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667 c23.573,0,42.667-19.093,42.667-42.667S151.588,149.333,128.015,149.333z"/> <path d="M256.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667s42.667-19.093,42.667-42.667 S279.588,149.333,256.015,149.333z"/> <path d="M384.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667 c23.573,0,42.667-19.093,42.667-42.667S407.588,149.333,384.015,149.333z"/> </g> </g> </g> </g>

</svg></button>
                    <button id="timetimelinetoggle" class="active"><svg width="18px" height="18px" viewBox="0 0 36 36" version="1.1"  preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <title>timeline-line</title>
	<path d="M10,18c0-1.3-0.8-2.4-2-2.8v-3.4c1.2-0.4,2-1.5,2-2.8c0-1.7-1.3-3-3-3S4,7.3,4,9c0,1.3,0.8,2.4,2,2.8v3.4
			c-1.2,0.4-2,1.5-2,2.8s0.8,2.4,2,2.8v3.4c-1.2,0.4-2,1.5-2,2.8c0,1.7,1.3,3,3,3s3-1.3,3-3c0-1.3-0.8-2.4-2-2.8v-3.4
			C9.2,20.4,10,19.3,10,18z"/>
	<path d="M31,10H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,10,31,10z"/>
	<path d="M31,19H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,19,31,19z"/>
	<path d="M31,28H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,28,31,28z"/>
    <rect width="36" height="36" fill-opacity="0"/>
</svg></button>
                    <button id="timetranscripttoggle"><svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <title>close-caption</title>
    <g id="Layer_2" data-name="Layer 2">
      <g id="invisible_box" data-name="invisible box">
        <rect width="48" height="48" fill="none"/>
      </g>
      <g id="icons_Q2" data-name="icons Q2">
        <g >
          <path d="M14,31h6a2.9,2.9,0,0,0,3-3V26H19v1H15V21h4v1h4V20a2.9,2.9,0,0,0-3-3H14a2.9,2.9,0,0,0-3,3v8A2.9,2.9,0,0,0,14,31Z"/>
          <path d="M28,31h6a2.9,2.9,0,0,0,3-3V26H33v1H29V21h4v1h4V20a2.9,2.9,0,0,0-3-3H28a2.9,2.9,0,0,0-3,3v8A2.9,2.9,0,0,0,28,31Z"/>
          <path d="M44,9H4a2,2,0,0,0-2,2V37a2,2,0,0,0,2,2H44a2,2,0,0,0,2-2V11A2,2,0,0,0,44,9ZM42,35H6V13H42Z"/>
        </g>
      </g>
    </g>
  </svg></button>
                    <!--<button id="chatsearchtoggle" ">Search</button>-->
                </div>
                <div class="actions">
                <button id="timeline-copy-button" class="clear-btn">
                        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M21 8C21 6.34315 19.6569 5 18 5H10C8.34315 5 7 6.34315 7 8V20C7 21.6569 8.34315 23 10 23H18C19.6569 23 21 21.6569 21 20V8ZM19 8C19 7.44772 18.5523 7 18 7H10C9.44772 7 9 7.44772 9 8V20C9 20.5523 9.44772 21 10 21H18C18.5523 21 19 20.5523 19 20V8Z" />
<path d="M6 3H16C16.5523 3 17 2.55228 17 2C17 1.44772 16.5523 1 16 1H6C4.34315 1 3 2.34315 3 4V18C3 18.5523 3.44772 19 4 19C4.55228 19 5 18.5523 5 18V4C5 3.44772 5.44772 3 6 3Z" />
</svg>
                    </button>
                    <button id="timelinereload" class="clear-btn">
                        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.39502 12.0014C4.39544 12.4156 4.73156 12.751 5.14577 12.7506C5.55998 12.7502 5.89544 12.4141 5.89502 11.9999L4.39502 12.0014ZM6.28902 8.1116L6.91916 8.51834L6.91952 8.51777L6.28902 8.1116ZM9.33502 5.5336L9.0396 4.84424L9.03866 4.84464L9.33502 5.5336ZM13.256 5.1336L13.4085 4.39927L13.4062 4.39878L13.256 5.1336ZM16.73 7.0506L16.1901 7.57114L16.1907 7.57175L16.73 7.0506ZM17.7142 10.2078C17.8286 10.6059 18.2441 10.8358 18.6422 10.7214C19.0403 10.607 19.2703 10.1915 19.1558 9.79342L17.7142 10.2078ZM17.7091 9.81196C17.6049 10.2129 17.8455 10.6223 18.2464 10.7265C18.6473 10.8307 19.0567 10.5901 19.1609 10.1892L17.7091 9.81196ZM19.8709 7.45725C19.9751 7.05635 19.7346 6.6469 19.3337 6.54272C18.9328 6.43853 18.5233 6.67906 18.4191 7.07996L19.8709 7.45725ZM18.2353 10.7235C18.6345 10.8338 19.0476 10.5996 19.1579 10.2004C19.2683 9.80111 19.034 9.38802 18.6348 9.2777L18.2353 10.7235ZM15.9858 8.5457C15.5865 8.43537 15.1734 8.66959 15.0631 9.06884C14.9528 9.46809 15.187 9.88119 15.5863 9.99151L15.9858 8.5457ZM19.895 11.9999C19.8946 11.5856 19.5585 11.2502 19.1443 11.2506C18.7301 11.251 18.3946 11.5871 18.395 12.0014L19.895 11.9999ZM18.001 15.8896L17.3709 15.4829L17.3705 15.4834L18.001 15.8896ZM14.955 18.4676L15.2505 19.157L15.2514 19.1566L14.955 18.4676ZM11.034 18.8676L10.8815 19.6019L10.8839 19.6024L11.034 18.8676ZM7.56002 16.9506L8.09997 16.4301L8.09938 16.4295L7.56002 16.9506ZM6.57584 13.7934C6.46141 13.3953 6.04593 13.1654 5.64784 13.2798C5.24974 13.3942 5.01978 13.8097 5.13421 14.2078L6.57584 13.7934ZM6.58091 14.1892C6.6851 13.7884 6.44457 13.3789 6.04367 13.2747C5.64277 13.1705 5.23332 13.4111 5.12914 13.812L6.58091 14.1892ZM4.41914 16.544C4.31495 16.9449 4.55548 17.3543 4.95638 17.4585C5.35727 17.5627 5.76672 17.3221 5.87091 16.9212L4.41914 16.544ZM6.05478 13.2777C5.65553 13.1674 5.24244 13.4016 5.13212 13.8008C5.02179 14.2001 5.25601 14.6132 5.65526 14.7235L6.05478 13.2777ZM8.30426 15.4555C8.70351 15.5658 9.11661 15.3316 9.22693 14.9324C9.33726 14.5331 9.10304 14.12 8.70378 14.0097L8.30426 15.4555ZM5.89502 11.9999C5.89379 10.7649 6.24943 9.55591 6.91916 8.51834L5.65889 7.70487C4.83239 8.98532 4.3935 10.4773 4.39502 12.0014L5.89502 11.9999ZM6.91952 8.51777C7.57513 7.50005 8.51931 6.70094 9.63139 6.22256L9.03866 4.84464C7.65253 5.4409 6.47568 6.43693 5.65852 7.70544L6.91952 8.51777ZM9.63045 6.22297C10.7258 5.75356 11.9383 5.62986 13.1059 5.86842L13.4062 4.39878C11.9392 4.09906 10.4158 4.25448 9.0396 4.84424L9.63045 6.22297ZM13.1035 5.86793C14.2803 6.11232 15.3559 6.7059 16.1901 7.57114L17.27 6.53006C16.2264 5.44761 14.8807 4.70502 13.4085 4.39927L13.1035 5.86793ZM16.1907 7.57175C16.9065 8.31258 17.4296 9.21772 17.7142 10.2078L19.1558 9.79342C18.8035 8.5675 18.1557 7.44675 17.2694 6.52945L16.1907 7.57175ZM19.1609 10.1892L19.8709 7.45725L18.4191 7.07996L17.7091 9.81196L19.1609 10.1892ZM18.6348 9.2777L15.9858 8.5457L15.5863 9.99151L18.2353 10.7235L18.6348 9.2777ZM18.395 12.0014C18.3963 13.2363 18.0406 14.4453 17.3709 15.4829L18.6312 16.2963C19.4577 15.0159 19.8965 13.5239 19.895 11.9999L18.395 12.0014ZM17.3705 15.4834C16.7149 16.5012 15.7707 17.3003 14.6587 17.7786L15.2514 19.1566C16.6375 18.5603 17.8144 17.5643 18.6315 16.2958L17.3705 15.4834ZM14.6596 17.7782C13.5643 18.2476 12.3517 18.3713 11.1842 18.1328L10.8839 19.6024C12.3508 19.9021 13.8743 19.7467 15.2505 19.157L14.6596 17.7782ZM11.1865 18.1333C10.0098 17.8889 8.93411 17.2953 8.09997 16.4301L7.02008 17.4711C8.06363 18.5536 9.40936 19.2962 10.8815 19.6019L11.1865 18.1333ZM8.09938 16.4295C7.38355 15.6886 6.86042 14.7835 6.57584 13.7934L5.13421 14.2078C5.48658 15.4337 6.13433 16.5545 7.02067 17.4718L8.09938 16.4295ZM5.12914 13.812L4.41914 16.544L5.87091 16.9212L6.58091 14.1892L5.12914 13.812ZM5.65526 14.7235L8.30426 15.4555L8.70378 14.0097L6.05478 13.2777L5.65526 14.7235Z" />
</svg>
                    </button>
                    
                </div>
            </div>
            <div class="timeline-content" id="timeline-content">
                <div class="load-wrapp">
      <div class="load-3">
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
      </div>
    </div>
            </div> 
        </div>
         <div class="main-box-transcript">
           <div class="top-bar">
                <div class="mode-buttons">
                    <button id="transcriptchattoggle" ><svg  height="18px" width="18px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512.029 512.029" xml:space="preserve" transform="matrix(1, 0, 0, 1, 0, 0)rotate(0)" stroke="#000000" stroke-width="0.00512029">

<g id="SVGRepo_bgCarrier" stroke-width="0"/>

<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="3.0721739999999995"/>

<g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M385.039,0H126.991C56.862,0,0.015,56.847,0.015,126.976v130.048C0.015,327.153,56.862,384,126.991,384h22.357v106.667 c0,22.934,31.242,29.714,40.748,8.843c11.135-24.448,29.01-47.631,51.842-69.079c14.665-13.776,30.453-25.985,46.231-36.44 c6.534-4.329,11.999-7.676,16.016-9.99h80.855c70.129,0,126.976-56.847,126.976-126.976V126.976 C512.015,56.847,455.167,0,385.039,0z M469.348,257.024c0,46.565-37.745,84.309-84.309,84.309h-86.357 c-3.45,0-6.849,0.837-9.905,2.439c-5.072,2.659-13.497,7.575-24.176,14.651c-17.668,11.707-35.325,25.362-51.876,40.909 c-7.328,6.884-14.246,13.958-20.71,21.224v-57.89c0-11.782-9.551-21.333-21.333-21.333h-43.691 c-46.565,0-84.309-37.745-84.309-84.309V126.976c0-46.565,37.745-84.309,84.309-84.309h258.048 c46.565,0,84.309,37.745,84.309,84.309V257.024z"/> <path d="M128.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667 c23.573,0,42.667-19.093,42.667-42.667S151.588,149.333,128.015,149.333z"/> <path d="M256.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667s42.667-19.093,42.667-42.667 S279.588,149.333,256.015,149.333z"/> <path d="M384.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667 c23.573,0,42.667-19.093,42.667-42.667S407.588,149.333,384.015,149.333z"/> </g> </g> </g> </g>

</svg></button>
                    <button id="transcripttimelinetoggle"><svg width="18px" height="18px" viewBox="0 0 36 36" version="1.1"  preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <title>timeline-line</title>
	<path d="M10,18c0-1.3-0.8-2.4-2-2.8v-3.4c1.2-0.4,2-1.5,2-2.8c0-1.7-1.3-3-3-3S4,7.3,4,9c0,1.3,0.8,2.4,2,2.8v3.4
			c-1.2,0.4-2,1.5-2,2.8s0.8,2.4,2,2.8v3.4c-1.2,0.4-2,1.5-2,2.8c0,1.7,1.3,3,3,3s3-1.3,3-3c0-1.3-0.8-2.4-2-2.8v-3.4
			C9.2,20.4,10,19.3,10,18z"/>
	<path d="M31,10H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,10,31,10z"/>
	<path d="M31,19H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,19,31,19z"/>
	<path d="M31,28H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,28,31,28z"/>
    <rect width="36" height="36" fill-opacity="0"/>
</svg></button>
                    <button id="transcripttranscripttoggle" class="active">
  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <title>close-caption</title>
    <g id="Layer_2" data-name="Layer 2">
      <g id="invisible_box" data-name="invisible box">
        <rect width="48" height="48" fill="none"/>
      </g>
      <g id="icons_Q2" data-name="icons Q2">
          <path d="M14,31h6a2.9,2.9,0,0,0,3-3V26H19v1H15V21h4v1h4V20a2.9,2.9,0,0,0-3-3H14a2.9,2.9,0,0,0-3,3v8A2.9,2.9,0,0,0,14,31Z"/>
          <path d="M28,31h6a2.9,2.9,0,0,0,3-3V26H33v1H29V21h4v1h4V20a2.9,2.9,0,0,0-3-3H28a2.9,2.9,0,0,0-3,3v8A2.9,2.9,0,0,0,28,31Z"/>
          <path d="M44,9H4a2,2,0,0,0-2,2V37a2,2,0,0,0,2,2H44a2,2,0,0,0,2-2V11A2,2,0,0,0,44,9ZM42,35H6V13H42Z"/>
        </g>
      </g>
    </g>
  </svg>
</button>
                    <!--<button id="chatsearchtoggle" ">Search</button>-->
                </div>
                <div class="actions">
                <button id="transcript-copy-button" class="clear-btn">
                        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M21 8C21 6.34315 19.6569 5 18 5H10C8.34315 5 7 6.34315 7 8V20C7 21.6569 8.34315 23 10 23H18C19.6569 23 21 21.6569 21 20V8ZM19 8C19 7.44772 18.5523 7 18 7H10C9.44772 7 9 7.44772 9 8V20C9 20.5523 9.44772 21 10 21H18C18.5523 21 19 20.5523 19 20V8Z" />
<path d="M6 3H16C16.5523 3 17 2.55228 17 2C17 1.44772 16.5523 1 16 1H6C4.34315 1 3 2.34315 3 4V18C3 18.5523 3.44772 19 4 19C4.55228 19 5 18.5523 5 18V4C5 3.44772 5.44772 3 6 3Z" />
</svg>
                    </button>
                <button id="transcript-download-button" class="clear-btn">
                        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.5535 16.5061C12.4114 16.6615 12.2106 16.75 12 16.75C11.7894 16.75 11.5886 16.6615 11.4465 16.5061L7.44648 12.1311C7.16698 11.8254 7.18822 11.351 7.49392 11.0715C7.79963 10.792 8.27402 10.8132 8.55352 11.1189L11.25 14.0682V3C11.25 2.58579 11.5858 2.25 12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V14.0682L15.4465 11.1189C15.726 10.8132 16.2004 10.792 16.5061 11.0715C16.8118 11.351 16.833 11.8254 16.5535 12.1311L12.5535 16.5061Z" />
<path d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z"/>
</svg>
                    </button>
                </div>
            </div>
            <div class="chat-window" id="transcript-content">
                <h1>Transcript</h1>
                <div class="chat-window-content"></div>
            </div> 
            </div> 
        </div>
        <a href="https://forms.gle/6F6ttQfrAuY8LPr37" target="_blank" class="feedback-link">Palo Feedback or Feature Request</a>
    </div> 
    
    `;
    
    expandable_metadata_div.parentNode.insertBefore(extension_box, expandable_metadata_div.nextSibling);
    const quota_counter = document.getElementById('quota-counter');
    chrome.runtime.sendMessage({action: "fetchQuota"}, function(response) {
        if (response && response.quota !== undefined) {
            if (response.quota === 1747) {
                quota_counter.textContent = `❄️: ∞/20`;
            } else {
                quota_counter.innerHTML = `❄️: ${response.quota}/20`;
            }
        } else {
            console.error("Failed to get quota from background script", response);
            quota_counter.innerHTML = `❄️: 0/20`;
        }
        
    });

    /**
    * Updates the countdown timer for the quota reset every minute.
    */
    function updateCountdown() {
        //for quota countdown display, does not factor in actual calculation.
        console.log("updating countdown")
        const now = new Date();
        
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        
        const timeRemaining = midnight - now; 
        const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
    
        document.getElementById('reset-clock').innerHTML = 
            `Resets in ${hours}h ${minutes}m`;
    
        setTimeout(updateCountdown, 60000);
    }
    
    updateCountdown();

    //console.log("inserted extension box")
    //console.log("setting styles")
    const style = document.createElement("style");
    style.textContent = `
:        :root {
    /* Default Light theme */
        --primary-color-ext: #0072ff; 
        --secondary-color-ext: #0062cc; 
        --background-color-ext: #ffffff;
        --card-color-ext: #f8f9fa;
        --text-color-ext: #212529; 
        --subtext-color-ext: #495057; 
        --light-gray-border-ext: #e9ecef;
        --lighter-gray-ext: #f1f3f5; 
        --gray-text-ext: #6c757d; 
        --border-color-ext: #ced4da; 
        --loading-dots-color-ext: #007bff; 
        --timeline-timestamp-ext: #6c757d;
        --link-color-ext: #007bff; 
        --link-hover-color-ext: #0069d9; 
        --svg-main-ext: #000000;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #065fd4;
        --timestamp-background-ext: #f9fcff;
        --focus-button-color: #0052cc;
        --focus-button-text: #ffffff;
    }


     :root[data-theme="default"][data-mode="light"] {
        --primary-color-ext: #0072ff; 
        --secondary-color-ext: #0062cc; 
        --background-color-ext: #ffffff;
        --card-color-ext: #f8f9fa;
        --text-color-ext: #212529; 
        --subtext-color-ext: #495057; 
        --light-gray-border-ext: #e9ecef;
        --lighter-gray-ext: #f1f3f5; 
        --gray-text-ext: #6c757d; 
        --border-color-ext: #ced4da; 
        --loading-dots-color-ext: #007bff; 
        --timeline-timestamp-ext: #6c757d;
        --link-color-ext: #007bff; 
        --link-hover-color-ext: #0069d9; 
        --svg-main-ext: #000000;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #065fd4;
        --timestamp-background-ext: #f9fcff;
        --focus-button-color: #0052cc;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="default"][data-mode="dark"] {
        --primary-color-ext: #0072ff;
        --secondary-color-ext: #0052cc; 
        --background-color-ext: #0f1724;
        --card-color-ext: #1c2b41; 
        --text-color-ext: #ffffff;
        --subtext-color-ext: #B0B0B0; 
        --light-gray-border-ext: #374151;
        --lighter-gray-ext: #4b5563; 
        --gray-text-ext: #9ca3af; 
        --border-color-ext: #6b7280; 
        --loading-dots-color-ext: #4c9aff; 
        --timeline-timestamp-ext: #9ca3af;
        --link-color-ext: #4c9aff; 
        --link-hover-color-ext: #79b8ff; 
        --svg-main-ext: #ffffff;
        --svg-selected-ext: #FFFFFF;
        --timestamp-color-ext: #065fd4;
        --timestamp-background-ext: #f9fcff;
        --focus-button-color: #4c9aff;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="forest"][data-mode="light"] {
        --primary-color-ext: #2ecc71;
        --secondary-color-ext: #27ae60; 
        --background-color-ext: #f1f8e9;
        --card-color-ext: #e8f5e9; 
        --text-color-ext: #1b5e20;
        --subtext-color-ext: #33691e; 
        --light-gray-border-ext: #c8e6c9;
        --lighter-gray-ext: #dcedc8; 
        --gray-text-ext: #558b2f; 
        --border-color-ext: #81c784; 
        --loading-dots-color-ext: #4caf50; 
        --timeline-timestamp-ext: #689f38;
        --link-color-ext: #43a047; 
        --link-hover-color-ext: #2e7d32; 
        --svg-main-ext: #1b5e20;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #33691e;
        --timestamp-background-ext: #e8f5e9;
        --focus-button-color: #43a047;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="forest"][data-mode="dark"] {
        --primary-color-ext: #2ecc71;
        --secondary-color-ext: #27ae60; 
        --background-color-ext: #1b2a1b;
        --card-color-ext: #2c3e2c; 
        --text-color-ext: #a5d6a7;
        --subtext-color-ext: #81c784; 
        --light-gray-border-ext: #3e4f3e;
        --lighter-gray-ext: #4c5f4c; 
        --gray-text-ext: #81c784; 
        --border-color-ext: #4caf50; 
        --loading-dots-color-ext: #66bb6a; 
        --timeline-timestamp-ext: #81c784;
        --link-color-ext: #4caf50; 
        --link-hover-color-ext: #66bb6a; 
        --svg-main-ext: #a5d6a7;
        --svg-selected-ext: #1b2a1b;
        --timestamp-color-ext: #66bb6a;
        --timestamp-background-ext: #2c3e2c;
        --focus-button-color: #4caf50;
        --focus-button-text: #1b2a1b;
    }

    :root[data-theme="ocean"][data-mode="light"] {
        --primary-color-ext: #03a9f4;
        --secondary-color-ext: #0288d1; 
        --background-color-ext: #e3f2fd;
        --card-color-ext: #bbdefb; 
        --text-color-ext: #01579b;
        --subtext-color-ext: #0277bd; 
        --light-gray-border-ext: #90caf9;
        --lighter-gray-ext: #e1f5fe; 
        --gray-text-ext: #0288d1; 
        --border-color-ext: #64b5f6; 
        --loading-dots-color-ext: #29b6f6; 
        --timeline-timestamp-ext: #0277bd;
        --link-color-ext: #0288d1; 
        --link-hover-color-ext: #01579b; 
        --svg-main-ext: #01579b;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #0277bd;
        --timestamp-background-ext: #e1f5fe;
        --focus-button-color: #0288d1;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="ocean"][data-mode="dark"] {
        --primary-color-ext: #03a9f4;
        --secondary-color-ext: #0288d1; 
        --background-color-ext: #0a2435;
        --card-color-ext: #0f3a5f; 
        --text-color-ext: #b3e5fc;
        --subtext-color-ext: #81d4fa; 
        --light-gray-border-ext: #1565c0;
        --lighter-gray-ext: #1976d2; 
        --gray-text-ext: #4fc3f7; 
        --border-color-ext: #1e88e5; 
        --loading-dots-color-ext: #29b6f6; 
        --timeline-timestamp-ext: #4fc3f7;
        --link-color-ext: #29b6f6; 
        --link-hover-color-ext: #4fc3f7; 
        --svg-main-ext: #b3e5fc;
        --svg-selected-ext: #0a2435;
        --timestamp-color-ext: #29b6f6;
        --timestamp-background-ext: #0f3a5f;
        --focus-button-color: #0288d1;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="sunset"][data-mode="light"] {
        --primary-color-ext: #ff7043;
        --secondary-color-ext: #f4511e; 
        --background-color-ext: #fff3e0;
        --card-color-ext: #ffe0b2; 
        --text-color-ext: #bf360c;
        --subtext-color-ext: #d84315; 
        --light-gray-border-ext: #ffcc80;
        --lighter-gray-ext: #fff8e1; 
        --gray-text-ext: #ef6c00; 
        --border-color-ext: #ffb74d; 
        --loading-dots-color-ext: #ff9800; 
        --timeline-timestamp-ext: #e65100;
        --link-color-ext: #f57c00; 
        --link-hover-color-ext: #e65100; 
        --svg-main-ext: #bf360c;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #d84315;
        --timestamp-background-ext: #fff8e1;
        --focus-button-color: #f57c00;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="sunset"][data-mode="dark"] {
        --primary-color-ext: #ff7043;
        --secondary-color-ext: #f4511e; 
        --background-color-ext: #3e2723;
        --card-color-ext: #4e342e; 
        --text-color-ext: #ffccbc;
        --subtext-color-ext: #ffab91; 
        --light-gray-border-ext: #6d4c41;
        --lighter-gray-ext: #795548; 
        --gray-text-ext: #ff8a65; 
        --border-color-ext: #d84315; 
        --loading-dots-color-ext: #ff5722; 
        --timeline-timestamp-ext: #ff8a65;
        --link-color-ext: #ff5722; 
        --link-hover-color-ext: #ff7043; 
        --svg-main-ext: #ffccbc;
        --svg-selected-ext: #3e2723;
        --timestamp-color-ext: #ff5722;
        --timestamp-background-ext: #4e342e;
        --focus-button-color: #f4511e;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="palo"][data-mode="light"] {
        --primary-color-ext: #4a90e2;
        --secondary-color-ext: #3a7bd5; 
        --background-color-ext: #f0f8ff;
        --card-color-ext: #e6f2ff; 
        --text-color-ext: #2c3e50;
        --subtext-color-ext: #34495e; 
        --light-gray-border-ext: #d4e6f7;
        --lighter-gray-ext: #ecf5fe; 
        --gray-text-ext: #7f8c8d; 
        --border-color-ext: #bdd9f2; 
        --loading-dots-color-ext: #5fa8f5; 
        --timeline-timestamp-ext: #6a89ad;
        --link-color-ext: #3498db; 
        --link-hover-color-ext: #2980b9; 
        --svg-main-ext: #2c3e50;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #3a7bd5;
        --timestamp-background-ext: #f0f8ff;
        --focus-button-color: #4a90e2;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="palo"][data-mode="dark"] {
        --primary-color-ext: #4a90e2;
        --secondary-color-ext: #3a7bd5; 
        --background-color-ext: #1c2331;
        --card-color-ext: #2c3e50; 
        --text-color-ext: #ecf0f1;
        --subtext-color-ext: #bdc3c7; 
        --light-gray-border-ext: #34495e;
        --lighter-gray-ext: #445566; 
        --gray-text-ext: #95a5a6; 
        --border-color-ext: #3498db; 
        --loading-dots-color-ext: #5fa8f5; 
        --timeline-timestamp-ext: #7f8c8d;
        --link-color-ext: #3498db; 
        --link-hover-color-ext: #5fa8f5; 
        --svg-main-ext: #ecf0f1;
        --svg-selected-ext: #1c2331;
        --timestamp-color-ext: #3a7bd5;
        --timestamp-background-ext: #2c3e50;
        --focus-button-color: #4a90e2;
        --focus-button-text: #ffffff;
    }   


    /* Lavender Dreams Theme */
:root[data-theme="lavender-dreams"][data-mode="light"] {
    --primary-color-ext: #9b59b6;
    --secondary-color-ext: #8e44ad;
    --background-color-ext: #f3e5f5;
    --card-color-ext: #e1bee7;
    --text-color-ext: #4a148c;
    --subtext-color-ext: #6a1b9a;
    --light-gray-border-ext: #ce93d8;
    --lighter-gray-ext: #f8e8ff;
    --gray-text-ext: #7b1fa2;
    --border-color-ext: #ba68c8;
    --loading-dots-color-ext: #ab47bc;
    --timeline-timestamp-ext: #8e24aa;
    --link-color-ext: #8e44ad;
    --link-hover-color-ext: #6a1b9a;
    --svg-main-ext: #4a148c;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #6a1b9a;
    --timestamp-background-ext: #f8e8ff;
    --focus-button-color: #8e44ad;
    --focus-button-text: #ffffff;
}

:root[data-theme="lavender-dreams"][data-mode="dark"] {
    --primary-color-ext: #9b59b6;
    --secondary-color-ext: #8e44ad;
    --background-color-ext: #2c0a37;
    --card-color-ext: #4a1259;
    --text-color-ext: #e1bee7;
    --subtext-color-ext: #ce93d8;
    --light-gray-border-ext: #6a1b9a;
    --lighter-gray-ext: #7b1fa2;
    --gray-text-ext: #ba68c8;
    --border-color-ext: #9c27b0;
    --loading-dots-color-ext: #ab47bc;
    --timeline-timestamp-ext: #ba68c8;
    --link-color-ext: #ab47bc;
    --link-hover-color-ext: #ce93d8;
    --svg-main-ext: #e1bee7;
    --svg-selected-ext: #2c0a37;
    --timestamp-color-ext: #ab47bc;
    --timestamp-background-ext: #4a1259;
    --focus-button-color: #8e44ad;
    --focus-button-text: #ffffff;
}

/* Mint Breeze Theme */
:root[data-theme="mint-breeze"][data-mode="light"] {
    --primary-color-ext: #00bfa5;
    --secondary-color-ext: #00897b;
    --background-color-ext: #e0f2f1;
    --card-color-ext: #b2dfdb;
    --text-color-ext: #004d40;
    --subtext-color-ext: #00695c;
    --light-gray-border-ext: #80cbc4;
    --lighter-gray-ext: #e8f5f3;
    --gray-text-ext: #00796b;
    --border-color-ext: #4db6ac;
    --loading-dots-color-ext: #26a69a;
    --timeline-timestamp-ext: #00897b;
    --link-color-ext: #00897b;
    --link-hover-color-ext: #00695c;
    --svg-main-ext: #004d40;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #00695c;
    --timestamp-background-ext: #e8f5f3;
    --focus-button-color: #00897b;
    --focus-button-text: #ffffff;
}

:root[data-theme="mint-breeze"][data-mode="dark"] {
    --primary-color-ext: #00bfa5;
    --secondary-color-ext: #00897b;
    --background-color-ext: #0a2724;
    --card-color-ext: #1c3f3a;
    --text-color-ext: #b2dfdb;
    --subtext-color-ext: #80cbc4;
    --light-gray-border-ext: #00695c;
    --lighter-gray-ext: #00796b;
    --gray-text-ext: #4db6ac;
    --border-color-ext: #009688;
    --loading-dots-color-ext: #26a69a;
    --timeline-timestamp-ext: #4db6ac;
    --link-color-ext: #26a69a;
    --link-hover-color-ext: #4db6ac;
    --svg-main-ext: #b2dfdb;
    --svg-selected-ext: #0a2724;
    --timestamp-color-ext: #26a69a;
    --timestamp-background-ext: #1c3f3a;
    --focus-button-color: #00897b;
    --focus-button-text: #ffffff;
}

/* Golden Sands Theme */
:root[data-theme="golden-sands"][data-mode="light"] {
    --primary-color-ext: #ffa000;
    --secondary-color-ext: #ff8f00;
    --background-color-ext: #fff8e1;
    --card-color-ext: #ffecb3;
    --text-color-ext: #ff6f00;
    --subtext-color-ext: #f57c00;
    --light-gray-border-ext: #ffe082;
    --lighter-gray-ext: #fffbef;
    --gray-text-ext: #ff8f00;
    --border-color-ext: #ffd54f;
    --loading-dots-color-ext: #ffc107;
    --timeline-timestamp-ext: #ff9800;
    --link-color-ext: #ff8f00;
    --link-hover-color-ext: #f57c00;
    --svg-main-ext: #ff6f00;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #f57c00;
    --timestamp-background-ext: #fffbef;
    --focus-button-color: #ff8f00;
    --focus-button-text: #ffffff;
}

:root[data-theme="golden-sands"][data-mode="dark"] {
    --primary-color-ext: #ffa000;
    --secondary-color-ext: #ff8f00;
    --background-color-ext: #332800;
    --card-color-ext: #4d3b00;
    --text-color-ext: #ffe082;
    --subtext-color-ext: #ffd54f;
    --light-gray-border-ext: #ff8f00;
    --lighter-gray-ext: #ffa000;
    --gray-text-ext: #ffca28;
    --border-color-ext: #ffc107;
    --loading-dots-color-ext: #ffb300;
    --timeline-timestamp-ext: #ffca28;
    --link-color-ext: #ffb300;
    --link-hover-color-ext: #ffca28;
    --svg-main-ext: #ffe082;
    --svg-selected-ext: #332800;
    --timestamp-color-ext: #ffb300;
    --timestamp-background-ext: #4d3b00;
    --focus-button-color: #ff8f00;
    --focus-button-text: #ffffff;
}

/* Cherry Blossom Theme */
:root[data-theme="cherry-blossom"][data-mode="light"] {
    --primary-color-ext: #ec407a;
    --secondary-color-ext: #d81b60;
    --background-color-ext: #fce4ec;
    --card-color-ext: #f8bbd0;
    --text-color-ext: #880e4f;
    --subtext-color-ext: #ad1457;
    --light-gray-border-ext: #f48fb1;
    --lighter-gray-ext: #fff0f6;
    --gray-text-ext: #c2185b;
    --border-color-ext: #f06292;
    --loading-dots-color-ext: #e91e63;
    --timeline-timestamp-ext: #d81b60;
    --link-color-ext: #d81b60;
    --link-hover-color-ext: #ad1457;
    --svg-main-ext: #880e4f;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #ad1457;
    --timestamp-background-ext: #fff0f6;
    --focus-button-color: #d81b60;
    --focus-button-text: #ffffff;
}

:root[data-theme="cherry-blossom"][data-mode="dark"] {
    --primary-color-ext: #ec407a;
    --secondary-color-ext: #d81b60;
    --background-color-ext: #2b0a1a;
    --card-color-ext: #4a1132;
    --text-color-ext: #f8bbd0;
    --subtext-color-ext: #f48fb1;
    --light-gray-border-ext: #ad1457;
    --lighter-gray-ext: #c2185b;
    --gray-text-ext: #f06292;
    --border-color-ext: #e91e63;
    --loading-dots-color-ext: #ec407a;
    --timeline-timestamp-ext: #f06292;
    --link-color-ext: #ec407a;
    --link-hover-color-ext: #f48fb1;
    --svg-main-ext: #f8bbd0;
    --svg-selected-ext: #2b0a1a;
    --timestamp-color-ext: #ec407a;
    --timestamp-background-ext: #4a1132;
    --focus-button-color: #d81b60;
    --focus-button-text: #ffffff;
}

/* Emerald City Theme */
:root[data-theme="emerald-city"][data-mode="light"] {
    --primary-color-ext: #00c853;
    --secondary-color-ext: #00a040;
    --background-color-ext: #e8f5e9;
    --card-color-ext: #c8e6c9;
    --text-color-ext: #1b5e20;
    --subtext-color-ext: #2e7d32;
    --light-gray-border-ext: #a5d6a7;
    --lighter-gray-ext: #f1f8e9;
    --gray-text-ext: #388e3c;
    --border-color-ext: #81c784;
    --loading-dots-color-ext: #4caf50;
    --timeline-timestamp-ext: #43a047;
    --link-color-ext: #00a040;
    --link-hover-color-ext: #2e7d32;
    --svg-main-ext: #1b5e20;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #2e7d32;
    --timestamp-background-ext: #f1f8e9;
    --focus-button-color: #00a040;
    --focus-button-text: #ffffff;
}

:root[data-theme="emerald-city"][data-mode="dark"] {
    --primary-color-ext: #00c853;
    --secondary-color-ext: #00a040;
    --background-color-ext: #0d2a0d;
    --card-color-ext: #1e4620;
    --text-color-ext: #c8e6c9;
    --subtext-color-ext: #a5d6a7;
    --light-gray-border-ext: #2e7d32;
    --lighter-gray-ext: #388e3c;
    --gray-text-ext: #81c784;
    --border-color-ext: #4caf50;
    --loading-dots-color-ext: #00e676;
    --timeline-timestamp-ext: #81c784;
    --link-color-ext: #00e676;
    --link-hover-color-ext: #69f0ae;
    --svg-main-ext: #c8e6c9;
    --svg-selected-ext: #0d2a0d;
    --timestamp-color-ext: #00e676;
    --timestamp-background-ext: #1e4620;
    --focus-button-color: #00a040;
    --focus-button-text: #ffffff;
}

/* Arctic Frost Theme */
:root[data-theme="arctic-frost"][data-mode="light"] {
    --primary-color-ext: #4fc3f7;
    --secondary-color-ext: #29b6f6;
    --background-color-ext: #e1f5fe;
    --card-color-ext: #b3e5fc;
    --text-color-ext: #01579b;
    --subtext-color-ext: #0277bd;
    --light-gray-border-ext: #81d4fa;
    --lighter-gray-ext: #f0f9ff;
    --gray-text-ext: #039be5;
    --border-color-ext: #4fc3f7;
    --loading-dots-color-ext: #03a9f4;
    --timeline-timestamp-ext: #0288d1;
    --link-color-ext: #29b6f6;
    --link-hover-color-ext: #0277bd;
    --svg-main-ext: #01579b;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #0277bd;
    --timestamp-background-ext: #f0f9ff;
    --focus-button-color: #29b6f6;
    --focus-button-text: #ffffff;
}


:root[data-theme="arctic-frost"][data-mode="dark"] {
    --primary-color-ext: #4fc3f7;
    --secondary-color-ext: #29b6f6;
    --background-color-ext: #0a2535;
    --card-color-ext: #0f3a5f;
    --text-color-ext: #b3e5fc;
    --subtext-color-ext: #81d4fa;
    --light-gray-border-ext: #0277bd;
    --lighter-gray-ext: #039be5;
    --gray-text-ext: #4fc3f7;
    --border-color-ext: #03a9f4;
    --loading-dots-color-ext: #29b6f6;
    --timeline-timestamp-ext: #4fc3f7;
    --link-color-ext: #29b6f6;
    --link-hover-color-ext: #4fc3f7;
    --svg-main-ext: #b3e5fc;
    --svg-selected-ext: #0a2535;
    --timestamp-color-ext: #29b6f6;
    --timestamp-background-ext: #0f3a5f;
    --focus-button-color: #29b6f6;
    --focus-button-text: #ffffff;
}

/* Main container for both chat and search modes */
.main-box {
    border-radius: 12px;
    background-color: var(--card-color-ext); 
    margin-bottom: 16px;
    margin-top: 16px;  
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); 
    border: none;  
    font-family: 'Roboto', Arial, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 400px;
}

/* Top bar styles for both modes */
.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px; 
    background-color: var(--background-color-ext); 
    border-bottom: 1px solid var(--light-gray-border-ext); 
    color: var(--text-color-ext); 
}

/* Mode buttons */
.mode-buttons {
    display: flex;
    gap: 8px;
    background-color: var(--light-gray-border-ext); 
    padding: 6px; 
    border-radius: 8px;
}

.mode-buttons button {
    padding: 8px 16px; 
    background-color: transparent; 
    color: var(--text-color-ext); 
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease; 
}

.mode-buttons button:hover {
    background-color: var(--lighter-gray-ext); 
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mode-buttons button.active {
    background-color: var(--primary-color-ext);
    color: #ffffff; 
}

.mode-buttons button svg {
    width: 18px;
    height: 18px;
    fill: var(--svg-main-ext); /* Default fill color */
    transition: fill 0.3s ease; /* Smooth transition for color changes */
}

.mode-buttons button.active svg {
    fill: var(--svg-selected-ext); /* Fill color when button is active */
}

/* Clear button SVG */
.clear-btn svg {
    width: 16px;
    height: 16px;
    fill: var(--gray-text-ext); /* Fill color for clear button */
}

.mode-buttons button.active:hover {
    background-color: var(--secondary-color-ext);
}

.mode-buttons button:active { 
    transform: translateY(1px); 
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); 
}


.quota-counter {
    font-size: 14px;
}

.reset-timer {
    font-size: 10px;
    color: var(--subtext-color-ext); 
    margin-top: 2px; /* Adjust this value to control spacing */
}


/* Top bar buttons */
.top-bar .actions {
    display: flex;
    gap: 10px;
}

/* Clear Button */
.clear-btn {
    padding: 8px;
    background-color: transparent; 
    color: var(--gray-text-ext);  
    border: 1px solid var(--border-color-ext); 
    border-radius: 50%;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.clear-btn-btn {
    padding: 2px;
    background-color: transparent; 
    color: var(--gray-text-ext);  
    border: 1px solid var(--border-color-ext); 
    border-radius: 50%;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}
    

.feedback-link {
    padding: 2px;
    background-color: transparent;
    color: var(--gray-text-ext);
    align-items: center;
    justify-content: center;
    align-content: center;


}
    

.clear-btn:hover {
    background-color: var(--lighter-gray-ext);
    transform: scale(1.1); 
    opacity: 0.9; 
}

.clear-btn:active {
    transform: scale(0.95);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}



.clear-btn-btn:hover {
    background-color: var(--lighter-gray-ext);
    transform: scale(1.1); 
    opacity: 0.9; 
}

.clear-btn-btn:active {
    transform: scale(0.95);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}


.clear-btn svg {
    width: 16px;
    height: 16px;
    fill: currentColor; 
}

.clear-btn-btn svg {
    width: 22px;
    height: 22px;
    fill: currentColor; 
}

/* Search Input (hidden by default, adjust as needed) */
.search-input {
    flex: 1;
    padding: 8px 12px;
    margin: 0 8px;
    border: 1px solid var(--border-color-ext); 
    border-radius: 6px;
    background-color: var(--background-color-ext);  
    color: var(--text-color-ext);  
    font-size: 14px;
    height: 10px; 
}

/* Search Button (hidden by default, adjust as needed) */
.search-btn {
    padding: 8px 16px;
    background-color: transparent;  
    color: var(--gray-text-ext);  
    border: 1px solid var(--border-color-ext); 
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;  
    display: flex;
    align-items: center;
    justify-content: center;
}

.search-btn:hover {
    background-color: var(--lighter-gray-ext); 
    transform: scale(1.1); 
    opacity: 0.9; 
}

.search-btn:active { 
    transform: scale(0.95);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); 
}


.search-btn svg {
    width: 18px;
    height: 18px;
    fill: currentColor;  
}

/* Chat Window */
.chat-window,
.results { 
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background-color: var(--background-color-ext); 
    border-top: 1px solid var(--light-gray-border-ext); 
    min-height: 200px;
    max-height: 500px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.chat-window-content,
.results-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    overflow-y: auto;
    max-height: 100%; 
}

/* Chat Messages */
.chat-message {
    margin: 10px 0; 
    padding: 12px 16px;
    border-radius: 8px; 
    font-size: 14px;
    line-height: 1.5;
    max-width: 80%;
    word-wrap: break-word;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); 
}

.chat-message .message-header {
    font-weight: bold;
    margin-bottom: 4px;
    color: var(--subtext-color-ext); 
}

.chat-message .message-content {
    color: var(--text-color-ext);  
}

.chat-message .message-timestamp { /* Increase specificity here */
    font-size: 14px;
    color: var(--timestamp-color-ext);
    padding: 3px 2px;
    background-color: var(--timestamp-background-ext);
    border-radius: 8px;
    text-decoration: none; 
} 

.chat-message.user {
    background-color: var(--light-gray-border-ext); 
    align-self: flex-end;
}

.chat-message.assistant {
    background-color: var(--light-gray-border-ext); 
    align-self: flex-start;
}

/* Bottom Bar */
.bottom-bar {
    display: flex;
    padding: 12px 16px;  
    background-color: var(--background-color-ext); 
    border-top: 1px solid var(--light-gray-border-ext); 
}

.bottom-bar input {
    flex: 1;
    padding: 10px;
    border: 1px solid var(--border-color-ext);  
    border-radius: 6px;
    background-color: var(--background-color-ext); 
    color: var(--text-color-ext); 
    font-size: 14px;
}

.bottom-bar button {
    padding: 10px 20px;  
    background-color: var(--primary-color-ext); 
    color: #ffffff;
    border: none;  
    border-radius: 6px;
    margin-left: 10px;
    cursor: pointer;
    transition: all 0.3s ease;  
}

.bottom-bar button:hover {
    background-color: var(--link-hover-color-ext); 
    transform: translateY(-2px); 
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); 
}

.bottom-bar button:active { 
    transform: translateY(1px); 
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); 
}


/* Toggle visibility based on mode */
.main-box-chat,
.main-box-search,
.main-box-timeline,
.main-box-transcript {
    display: none;
}

.chat-mode .main-box-chat {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.search-mode .main-box-search {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.timeline-mode .main-box-timeline {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.transcript-mode .main-box-transcript {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}
    

/* Loading Animation */
.load-wrapp {
  float: left;
  width: 100px;
  height: 100px;
  margin: 0 10px 10px 0;
  padding: 20px 20px 20px;
  text-align: center;
}

.load-wrapp p {
  padding: 0 0 20px;
}

.load-wrapp:last-child {
  margin-right: 0;
}

.line {
  display: inline-block;
  width: 15px;
  height: 15px;
  border-radius: 15px;
  background-color: var(--loading-dots-color-ext);  
}

.load-3 .line:nth-last-child(1) {
  animation: loadingC 0.6s 0.1s linear infinite;
}
.load-3 .line:nth-last-child(2) {
  animation: loadingC 0.6s 0.2s linear infinite;
}
.load-3 .line:nth-last-child(3) {
  animation: loadingC 0.6s 0.3s linear infinite;
}

@keyframes loadingC {
  0 {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(0, 15px);
  }
  100% {
    transform: translate(0, 0);
  }
}


.timeline-mode .main-box-timeline .chat-window {
    display: flex;
    justify-content: center;
    align-items: center; 
    padding: 20px;
    flex-grow: 1; 
}

.timeline-mode .main-box-timeline .generate-timeline {
    background-color: var(--background-color-ext);  
    color: var(--link-color-ext); 
    border: 1px solid var(--border-color-ext); 
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;  
    font-size: 24px;
    padding: 20px 40px; 
    width: 100%;
    height: 100%; 
    box-sizing: border-box; 
}

.timeline-mode .main-box-timeline .generate-timeline:hover {
    background-color: var(--light-gray-border-ext); 
    transform: translateY(-2px); 
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.timeline-mode .main-box-timeline .generate-timeline:active { 
    transform: translateY(1px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); 
}



.transcript-mode .main-box-transcript .chat-window {
    display: flex;
    justify-content: center; 
    align-items: center; 
    padding: 20px; 
    flex-grow: 1; 
}

.transcript-mode .main-box-transcript .generate-transcript {
    background-color: var(--background-color-ext);
    color: var(--link-color-ext); 
    border: 1px solid var(--border-color-ext); 
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease; 
    font-size: 24px;
    padding: 20px 40px;  
    width: 100%;  
    height: 100%; 
    box-sizing: border-box;
}

.transcript-mode .main-box-transcript .generate-transcript:hover {
    background-color: var(--light-gray-border-ext); 
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.transcript-mode .main-box-transcript .generate-transcript:active { 
    transform: translateY(1px); 
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}


.main-box-transcript .chat-window-content {
    overflow-y: auto;
    max-height: 600px; 
    padding: 10px;
}

.main-box-transcript .chat-window-content h1 {
    font-size: 24px;
    margin-bottom: 10px;
    color: var(--text-color-ext); 
}

.main-box-transcript .chat-window-content h2 {
    font-size: 18px;
    color: var(--subtext-color-ext); 
    margin-bottom: 15px;
}

.transcript-segment {
    color: var(--text-color-ext);
    margin-bottom: 5px; 
    font-size: 16px;
    line-height: 1.5; 
}

.timestamp {
    color: var(--timeline-timestamp-ext); 
    margin-right: 10px;
    font-weight: bold;
}


/* Styles for timeline-content */
.timeline-content {
  padding: 20px; 
  color: var(--text-color-ext);
  overflow-y: auto; 
  max-height: 600px; 
  font-size: 16px;
}

.timeline-content h1 {
  font-size: 24px;  
  margin-bottom: 15px; 
  color: var(--text-color-ext); 
}

.timeline-content ul {
  list-style: none;
  padding-left: 0;
}

.timeline-content li {
  margin-bottom: 10px;
  line-height: 1.5;
  font-size: 16px;
  display: flex;
  align-items: center; 
}

.timeline-content .timestamp {
  color: var(--timeline-timestamp-ext); 
  margin-right: 15px;
  font-weight: bold;
  flex-shrink: 0; 
}

/* Clickable Timestamps */
.timeline-content a {
  color: var(--link-color-ext);  
  text-decoration: none;
  font-weight: bold; 
}

.timeline-content a:hover {
  text-decoration: underline;  
}

/* Optional: Visual Separation */
.timeline-content li:nth-child(even) {
  background-color: var(--card-color-ext); 
}
    `;


    console.log("igetting theme")
    chrome.storage.sync.get(['theme'], function(data) {
        console.log(`datatheme: ${data.theme}`)
        if (data.theme) {
            console.log("setting theme", data.theme)
            document.documentElement.setAttribute('data-theme', data.theme);
        } else {
            // Default to light theme if no theme is saved
            document.documentElement.setAttribute('data-theme', 'default');
        }
    });
    chrome.storage.sync.get(['mode'], function(data) {
        if (data.mode) {
            document.documentElement.setAttribute('data-mode', data.mode);
        } else {
            document.documentElement.setAttribute('data-mode', 'light');
        }
    });
    


const main_box_for_insert = document.getElementById("voice-search-button");

const buttonContainer = document.createElement("div");
buttonContainer.id = "hide-show-container";
buttonContainer.style.display = "flex";
buttonContainer.style.justifyContent = "flex-start";
buttonContainer.style.alignItems = "center";
buttonContainer.style.marginBottom = "12px";

const focus_button = document.createElement("button");
focus_button.id = "focus-toggle-button";
focus_button.classList.add("custom-button");

focus_button.style.marginRight = "8px";
focus_button.style.padding = "8px 12px"; 
focus_button.style.borderRadius = "16px";  
focus_button.style.cursor = "pointer";
focus_button.style.fontFamily = "'Inter', 'Roboto', system-ui, sans-serif"; 
focus_button.style.fontSize = "12px";  
focus_button.style.fontWeight = "600"; 
focus_button.style.letterSpacing = "0.3px"; 
focus_button.style.transition = "all 0.2s ease";
focus_button.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.15)";
focus_button.style.position = "relative";
focus_button.style.backgroundColor = "var(--background-color-ext)";
focus_button.style.color = "var(--primary-color-ext)";
focus_button.style.border = "1px solid rgba(0, 0, 0, 0.1)"; 
focus_button.style.display = "flex";
focus_button.style.alignItems = "center";
focus_button.style.gap = "6px";  // Space between icon and text

// SVG for down arrow (open state)
const downArrowSVG = `<svg height="14px" width="14px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512.029 512.029" xml:space="preserve" transform="matrix(1, 0, 0, 1, 0, 0)rotate(0)" stroke-width="0.00512029">
    <g id="SVGRepo_iconCarrier">
        <path fill="currentColor" d="M256.014,512.029c-10.453,0-20.906-3.986-28.874-11.954L11.967,284.902c-15.938-15.936-15.938-41.808,0-57.744
            c15.936-15.936,41.808-15.936,57.744,0l187.302,187.302l187.304-187.302c15.936-15.936,41.808-15.936,57.744,0
            c15.938,15.936,15.938,41.808,0,57.744L284.888,500.075C276.92,508.043,266.467,512.029,256.014,512.029z"/>
    </g>
</svg>`;

// SVG for right arrow (closed state)
const rightArrowSVG = `<svg height="14px" width="14px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512.029 512.029" xml:space="preserve" transform="matrix(1, 0, 0, 1, 0, 0)rotate(0)" stroke-width="0.00512029">
    <g id="SVGRepo_iconCarrier">
        <path fill="currentColor" d="M512.029,256.014c0,10.453-3.986,20.906-11.954,28.874L284.902,500.062c-15.936,15.938-41.808,15.938-57.744,0
            c-15.936-15.936-15.936-41.808,0-57.744l187.302-187.302L227.158,67.712c-15.936-15.936-15.936-41.808,0-57.744
            c15.936-15.938,41.808-15.938,57.744,0l215.173,215.173C508.043,233.108,512.029,243.561,512.029,256.014z"/>
    </g>
</svg>`;


focus_button.addEventListener('mouseenter', () => {
    focus_button.style.transform = 'translateY(-1px)';
    focus_button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
});

focus_button.addEventListener('mouseleave', () => {
    focus_button.style.transform = 'translateY(0)';
    focus_button.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
});

/**
 * To toggle the extension box visibility and update the button state.
 * @param {boolean} isOpen - Whether or not the extension box is to be set to open or closed.
 */
function updateButtonState(isOpen) {
    const main_box_for_real = document.getElementById("main-extension-box");
    const buttonText = isOpen ? 'Hide' : 'Show';
    focus_button.innerHTML = `${isOpen ? downArrowSVG : rightArrowSVG}<span style="line-height: 1">${buttonText}</span>`;
    focus_button.classList.toggle("active", !isOpen);
    main_box_for_real.style.display = isOpen ? "block" : "none";
}


focus_button.addEventListener("click", function() {
    chrome.storage.sync.get(['box_open'], function(data) {
        const newState = data.box_open === undefined ? false : !data.box_open;
        chrome.storage.sync.set({box_open: newState}, function() {
            console.log('box_open is set to ' + newState);
            updateButtonState(newState);
        });
    });
});


focus_button.addEventListener("mouseover", function() {
    this.style.transform = "translateY(-1px)";
    this.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
});

focus_button.addEventListener("mouseout", function() {
    this.style.transform = "translateY(0)";
    this.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
});

focus_button.addEventListener("mousedown", function() {
    this.style.transform = "translateY(1px)";
    this.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.2)";
});

focus_button.addEventListener("mouseup", function() {
    this.style.transform = "translateY(-1px)";
    this.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
});


buttonContainer.appendChild(focus_button);


main_box_for_insert.parentNode.insertAdjacentElement('afterend', buttonContainer);


chrome.storage.sync.get(['box_open'], function(data) {
    const isOpen = data.box_open === undefined ? true : data.box_open;
    updateButtonState(isOpen);
});


const style2 = document.createElement('style');
style2.textContent = `
    #focus-toggle-button.active {
        background-color: var(--primary-color-ext);
        color: white;
    }
`;
document.head.appendChild(style2);

    document.head.appendChild(style);
    //console.log("styles added")

    createEventListeners();
    insertFocusButton();
    console.log("inserting focus")

}


/**
 * Clear's the chat window.
 */
function clearChat() {
    const chatWindowContent = document.getElementsByClassName('chat-window-content');
    chatWindowContent[0].innerHTML = '';
}


/**
 * Modified insert box for when there is no transcript.
 */
function insertErrorBox() {
    console.log("inserting error box")
    //console.log(`FETCHED TRIENSTO INSTE NRISTN ESCRIPT EICHINESTEIN: ${g_transcript}`)
    //console.log("creating extension")
    const already_exists = document.getElementById("main-extension-box");
    if (already_exists) {
        return;
    }
    //console.log("looking for expandable metadata")
    const expandable_metadata_div = document.getElementById('panels');
    //console.log(`expandable_metadata_div: ${expandable_metadata_div}`)
    if (!expandable_metadata_div){
        //console.log("notfoundtryingagain")
        setTimeout(function(){
            insertErrorBox()
        }, 200)
        return;
    }
    //console.log("found expandable metadata")
    const extension_box = document.createElement("div");
    extension_box.id = "main-extension-box";
    //console.log("setting inner html")
    
    extension_box.innerHTML = `
    <div class="main-box chat-mode" id="mainBox">
        <div class="main-box-chat">
            <div class="top-bar">
                <div class="mode-buttons">
                    <button id="chatchattoggle" class="active" ><svg height="18px" width="18px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512.029 512.029" xml:space="preserve" transform="matrix(1, 0, 0, 1, 0, 0)rotate(0)" stroke="#000000" stroke-width="0.00512029">

<g id="SVGRepo_bgCarrier" stroke-width="0"/>

<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="3.0721739999999995"/>

<g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M385.039,0H126.991C56.862,0,0.015,56.847,0.015,126.976v130.048C0.015,327.153,56.862,384,126.991,384h22.357v106.667 c0,22.934,31.242,29.714,40.748,8.843c11.135-24.448,29.01-47.631,51.842-69.079c14.665-13.776,30.453-25.985,46.231-36.44 c6.534-4.329,11.999-7.676,16.016-9.99h80.855c70.129,0,126.976-56.847,126.976-126.976V126.976 C512.015,56.847,455.167,0,385.039,0z M469.348,257.024c0,46.565-37.745,84.309-84.309,84.309h-86.357 c-3.45,0-6.849,0.837-9.905,2.439c-5.072,2.659-13.497,7.575-24.176,14.651c-17.668,11.707-35.325,25.362-51.876,40.909 c-7.328,6.884-14.246,13.958-20.71,21.224v-57.89c0-11.782-9.551-21.333-21.333-21.333h-43.691 c-46.565,0-84.309-37.745-84.309-84.309V126.976c0-46.565,37.745-84.309,84.309-84.309h258.048 c46.565,0,84.309,37.745,84.309,84.309V257.024z"/> <path d="M128.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667 c23.573,0,42.667-19.093,42.667-42.667S151.588,149.333,128.015,149.333z"/> <path d="M256.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667s42.667-19.093,42.667-42.667 S279.588,149.333,256.015,149.333z"/> <path d="M384.015,149.333c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667 c23.573,0,42.667-19.093,42.667-42.667S407.588,149.333,384.015,149.333z"/> </g> </g> </g> </g>

</svg></button>
                    <button id="chattimelinetoggle"><svg width="18px" height="18px" viewBox="0 0 36 36" version="1.1"  preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <title>timeline-line</title>
	<path d="M10,18c0-1.3-0.8-2.4-2-2.8v-3.4c1.2-0.4,2-1.5,2-2.8c0-1.7-1.3-3-3-3S4,7.3,4,9c0,1.3,0.8,2.4,2,2.8v3.4
			c-1.2,0.4-2,1.5-2,2.8s0.8,2.4,2,2.8v3.4c-1.2,0.4-2,1.5-2,2.8c0,1.7,1.3,3,3,3s3-1.3,3-3c0-1.3-0.8-2.4-2-2.8v-3.4
			C9.2,20.4,10,19.3,10,18z"/>
	<path d="M31,10H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,10,31,10z"/>
	<path d="M31,19H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,19,31,19z"/>
	<path d="M31,28H15c-0.6,0-1-0.4-1-1s0.4-1,1-1h16c0.6,0,1,0.4,1,1S31.6,28,31,28z"/>
    <rect width="36" height="36" fill-opacity="0"/>
</svg></button>
                    <button id="chattranscripttoggle"><svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <title>close-caption</title>
    <g id="Layer_2" data-name="Layer 2">
      <g id="invisible_box" data-name="invisible box">
        <rect width="48" height="48" fill="none"/>
      </g>
      <g id="icons_Q2" data-name="icons Q2">
        <g>
          <path d="M14,31h6a2.9,2.9,0,0,0,3-3V26H19v1H15V21h4v1h4V20a2.9,2.9,0,0,0-3-3H14a2.9,2.9,0,0,0-3,3v8A2.9,2.9,0,0,0,14,31Z"/>
          <path d="M28,31h6a2.9,2.9,0,0,0,3-3V26H33v1H29V21h4v1h4V20a2.9,2.9,0,0,0-3-3H28a2.9,2.9,0,0,0-3,3v8A2.9,2.9,0,0,0,28,31Z"/>
          <path d="M44,9H4a2,2,0,0,0-2,2V37a2,2,0,0,0,2,2H44a2,2,0,0,0,2-2V11A2,2,0,0,0,44,9ZM42,35H6V13H42Z"/>
        </g>
      </g>
    </g>
  </svg></button>
                    <!--<button id="chatsearchtoggle" ">Search</button>-->
                </div>
                <div class="actions">
                <button id="chat-copy-button" class="clear-btn">
                        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M21 8C21 6.34315 19.6569 5 18 5H10C8.34315 5 7 6.34315 7 8V20C7 21.6569 8.34315 23 10 23H18C19.6569 23 21 21.6569 21 20V8ZM19 8C19 7.44772 18.5523 7 18 7H10C9.44772 7 9 7.44772 9 8V20C9 20.5523 9.44772 21 10 21H18C18.5523 21 19 20.5523 19 20V8Z" />
<path d="M6 3H16C16.5523 3 17 2.55228 17 2C17 1.44772 16.5523 1 16 1H6C4.34315 1 3 2.34315 3 4V18C3 18.5523 3.44772 19 4 19C4.55228 19 5 18.5523 5 18V4C5 3.44772 5.44772 3 6 3Z" />
</svg>
                    </button>
                    <button id="chatreload" class="clear-btn">
                        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.39502 12.0014C4.39544 12.4156 4.73156 12.751 5.14577 12.7506C5.55998 12.7502 5.89544 12.4141 5.89502 11.9999L4.39502 12.0014ZM6.28902 8.1116L6.91916 8.51834L6.91952 8.51777L6.28902 8.1116ZM9.33502 5.5336L9.0396 4.84424L9.03866 4.84464L9.33502 5.5336ZM13.256 5.1336L13.4085 4.39927L13.4062 4.39878L13.256 5.1336ZM16.73 7.0506L16.1901 7.57114L16.1907 7.57175L16.73 7.0506ZM17.7142 10.2078C17.8286 10.6059 18.2441 10.8358 18.6422 10.7214C19.0403 10.607 19.2703 10.1915 19.1558 9.79342L17.7142 10.2078ZM17.7091 9.81196C17.6049 10.2129 17.8455 10.6223 18.2464 10.7265C18.6473 10.8307 19.0567 10.5901 19.1609 10.1892L17.7091 9.81196ZM19.8709 7.45725C19.9751 7.05635 19.7346 6.6469 19.3337 6.54272C18.9328 6.43853 18.5233 6.67906 18.4191 7.07996L19.8709 7.45725ZM18.2353 10.7235C18.6345 10.8338 19.0476 10.5996 19.1579 10.2004C19.2683 9.80111 19.034 9.38802 18.6348 9.2777L18.2353 10.7235ZM15.9858 8.5457C15.5865 8.43537 15.1734 8.66959 15.0631 9.06884C14.9528 9.46809 15.187 9.88119 15.5863 9.99151L15.9858 8.5457ZM19.895 11.9999C19.8946 11.5856 19.5585 11.2502 19.1443 11.2506C18.7301 11.251 18.3946 11.5871 18.395 12.0014L19.895 11.9999ZM18.001 15.8896L17.3709 15.4829L17.3705 15.4834L18.001 15.8896ZM14.955 18.4676L15.2505 19.157L15.2514 19.1566L14.955 18.4676ZM11.034 18.8676L10.8815 19.6019L10.8839 19.6024L11.034 18.8676ZM7.56002 16.9506L8.09997 16.4301L8.09938 16.4295L7.56002 16.9506ZM6.57584 13.7934C6.46141 13.3953 6.04593 13.1654 5.64784 13.2798C5.24974 13.3942 5.01978 13.8097 5.13421 14.2078L6.57584 13.7934ZM6.58091 14.1892C6.6851 13.7884 6.44457 13.3789 6.04367 13.2747C5.64277 13.1705 5.23332 13.4111 5.12914 13.812L6.58091 14.1892ZM4.41914 16.544C4.31495 16.9449 4.55548 17.3543 4.95638 17.4585C5.35727 17.5627 5.76672 17.3221 5.87091 16.9212L4.41914 16.544ZM6.05478 13.2777C5.65553 13.1674 5.24244 13.4016 5.13212 13.8008C5.02179 14.2001 5.25601 14.6132 5.65526 14.7235L6.05478 13.2777ZM8.30426 15.4555C8.70351 15.5658 9.11661 15.3316 9.22693 14.9324C9.33726 14.5331 9.10304 14.12 8.70378 14.0097L8.30426 15.4555ZM5.89502 11.9999C5.89379 10.7649 6.24943 9.55591 6.91916 8.51834L5.65889 7.70487C4.83239 8.98532 4.3935 10.4773 4.39502 12.0014L5.89502 11.9999ZM6.91952 8.51777C7.57513 7.50005 8.51931 6.70094 9.63139 6.22256L9.03866 4.84464C7.65253 5.4409 6.47568 6.43693 5.65852 7.70544L6.91952 8.51777ZM9.63045 6.22297C10.7258 5.75356 11.9383 5.62986 13.1059 5.86842L13.4062 4.39878C11.9392 4.09906 10.4158 4.25448 9.0396 4.84424L9.63045 6.22297ZM13.1035 5.86793C14.2803 6.11232 15.3559 6.7059 16.1901 7.57114L17.27 6.53006C16.2264 5.44761 14.8807 4.70502 13.4085 4.39927L13.1035 5.86793ZM16.1907 7.57175C16.9065 8.31258 17.4296 9.21772 17.7142 10.2078L19.1558 9.79342C18.8035 8.5675 18.1557 7.44675 17.2694 6.52945L16.1907 7.57175ZM19.1609 10.1892L19.8709 7.45725L18.4191 7.07996L17.7091 9.81196L19.1609 10.1892ZM18.6348 9.2777L15.9858 8.5457L15.5863 9.99151L18.2353 10.7235L18.6348 9.2777ZM18.395 12.0014C18.3963 13.2363 18.0406 14.4453 17.3709 15.4829L18.6312 16.2963C19.4577 15.0159 19.8965 13.5239 19.895 11.9999L18.395 12.0014ZM17.3705 15.4834C16.7149 16.5012 15.7707 17.3003 14.6587 17.7786L15.2514 19.1566C16.6375 18.5603 17.8144 17.5643 18.6315 16.2958L17.3705 15.4834ZM14.6596 17.7782C13.5643 18.2476 12.3517 18.3713 11.1842 18.1328L10.8839 19.6024C12.3508 19.9021 13.8743 19.7467 15.2505 19.157L14.6596 17.7782ZM11.1865 18.1333C10.0098 17.8889 8.93411 17.2953 8.09997 16.4301L7.02008 17.4711C8.06363 18.5536 9.40936 19.2962 10.8815 19.6019L11.1865 18.1333ZM8.09938 16.4295C7.38355 15.6886 6.86042 14.7835 6.57584 13.7934L5.13421 14.2078C5.48658 15.4337 6.13433 16.5545 7.02067 17.4718L8.09938 16.4295ZM5.12914 13.812L4.41914 16.544L5.87091 16.9212L6.58091 14.1892L5.12914 13.812ZM5.65526 14.7235L8.30426 15.4555L8.70378 14.0097L6.05478 13.2777L5.65526 14.7235Z" />
</svg>
                    </button>
                    
                </div>
            </div>
            <div class="chat-window">
                <div class="chat-window-content">
                    <div class="error-wrap">
                        There was an error fetching the transcript. Please ensure this video has a transcript. If it does, reload the page.
                    </div>
                </div>
            </div>
            <div class="bottom-bar">
                <button id="reload-page" id="reload-page">Reload</button>
            </div>
        </div>
    </div> 
    `;
    
    expandable_metadata_div.parentNode.insertBefore(extension_box, expandable_metadata_div.nextSibling);
    //console.log("inserted extension box")
    //console.log("setting styles")
    const style = document.createElement("style");
    style.textContent = `
        :root {
        --primary-color-ext: #0072ff; 
        --secondary-color-ext: #0062cc; 
        --background-color-ext: #ffffff;
        --card-color-ext: #f8f9fa;
        --text-color-ext: #212529; 
        --subtext-color-ext: #495057; 
        --light-gray-border-ext: #e9ecef;
        --lighter-gray-ext: #f1f3f5; 
        --gray-text-ext: #6c757d; 
        --border-color-ext: #ced4da; 
        --loading-dots-color-ext: #007bff; 
        --timeline-timestamp-ext: #6c757d;
        --link-color-ext: #007bff; 
        --link-hover-color-ext: #0069d9; 
        --svg-main-ext: #000000;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #065fd4;
        --timestamp-background-ext: #f9fcff;
        --focus-button-color: #0052cc;
        --focus-button-text: #ffffff;
    }
    
    :root[data-theme="default"][data-mode="light"] {
        --primary-color-ext: #0072ff; 
        --secondary-color-ext: #0062cc; 
        --background-color-ext: #ffffff;
        --card-color-ext: #f8f9fa;
        --text-color-ext: #212529; 
        --subtext-color-ext: #495057; 
        --light-gray-border-ext: #e9ecef;
        --lighter-gray-ext: #f1f3f5; 
        --gray-text-ext: #6c757d; 
        --border-color-ext: #ced4da; 
        --loading-dots-color-ext: #007bff; 
        --timeline-timestamp-ext: #6c757d;
        --link-color-ext: #007bff; 
        --link-hover-color-ext: #0069d9; 
        --svg-main-ext: #000000;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #065fd4;
        --timestamp-background-ext: #f9fcff;
        --focus-button-color: #0052cc;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="default"][data-mode="dark"] {
        --primary-color-ext: #0072ff;
        --secondary-color-ext: #0052cc; 
        --background-color-ext: #0f1724;
        --card-color-ext: #1c2b41; 
        --text-color-ext: #ffffff;
        --subtext-color-ext: #B0B0B0; 
        --light-gray-border-ext: #374151;
        --lighter-gray-ext: #4b5563; 
        --gray-text-ext: #9ca3af; 
        --border-color-ext: #6b7280; 
        --loading-dots-color-ext: #4c9aff; 
        --timeline-timestamp-ext: #9ca3af;
        --link-color-ext: #4c9aff; 
        --link-hover-color-ext: #79b8ff; 
        --svg-main-ext: #ffffff;
        --svg-selected-ext: #FFFFFF;
        --timestamp-color-ext: #065fd4;
        --timestamp-background-ext: #f9fcff;
        --focus-button-color: #4c9aff;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="forest"][data-mode="light"] {
        --primary-color-ext: #2ecc71;
        --secondary-color-ext: #27ae60; 
        --background-color-ext: #f1f8e9;
        --card-color-ext: #e8f5e9; 
        --text-color-ext: #1b5e20;
        --subtext-color-ext: #33691e; 
        --light-gray-border-ext: #c8e6c9;
        --lighter-gray-ext: #dcedc8; 
        --gray-text-ext: #558b2f; 
        --border-color-ext: #81c784; 
        --loading-dots-color-ext: #4caf50; 
        --timeline-timestamp-ext: #689f38;
        --link-color-ext: #43a047; 
        --link-hover-color-ext: #2e7d32; 
        --svg-main-ext: #1b5e20;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #33691e;
        --timestamp-background-ext: #e8f5e9;
        --focus-button-color: #43a047;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="forest"][data-mode="dark"] {
        --primary-color-ext: #2ecc71;
        --secondary-color-ext: #27ae60; 
        --background-color-ext: #1b2a1b;
        --card-color-ext: #2c3e2c; 
        --text-color-ext: #a5d6a7;
        --subtext-color-ext: #81c784; 
        --light-gray-border-ext: #3e4f3e;
        --lighter-gray-ext: #4c5f4c; 
        --gray-text-ext: #81c784; 
        --border-color-ext: #4caf50; 
        --loading-dots-color-ext: #66bb6a; 
        --timeline-timestamp-ext: #81c784;
        --link-color-ext: #4caf50; 
        --link-hover-color-ext: #66bb6a; 
        --svg-main-ext: #a5d6a7;
        --svg-selected-ext: #1b2a1b;
        --timestamp-color-ext: #66bb6a;
        --timestamp-background-ext: #2c3e2c;
        --focus-button-color: #4caf50;
        --focus-button-text: #1b2a1b;
    }

    :root[data-theme="ocean"][data-mode="light"] {
        --primary-color-ext: #03a9f4;
        --secondary-color-ext: #0288d1; 
        --background-color-ext: #e3f2fd;
        --card-color-ext: #bbdefb; 
        --text-color-ext: #01579b;
        --subtext-color-ext: #0277bd; 
        --light-gray-border-ext: #90caf9;
        --lighter-gray-ext: #e1f5fe; 
        --gray-text-ext: #0288d1; 
        --border-color-ext: #64b5f6; 
        --loading-dots-color-ext: #29b6f6; 
        --timeline-timestamp-ext: #0277bd;
        --link-color-ext: #0288d1; 
        --link-hover-color-ext: #01579b; 
        --svg-main-ext: #01579b;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #0277bd;
        --timestamp-background-ext: #e1f5fe;
        --focus-button-color: #0288d1;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="ocean"][data-mode="dark"] {
        --primary-color-ext: #03a9f4;
        --secondary-color-ext: #0288d1; 
        --background-color-ext: #0a2435;
        --card-color-ext: #0f3a5f; 
        --text-color-ext: #b3e5fc;
        --subtext-color-ext: #81d4fa; 
        --light-gray-border-ext: #1565c0;
        --lighter-gray-ext: #1976d2; 
        --gray-text-ext: #4fc3f7; 
        --border-color-ext: #1e88e5; 
        --loading-dots-color-ext: #29b6f6; 
        --timeline-timestamp-ext: #4fc3f7;
        --link-color-ext: #29b6f6; 
        --link-hover-color-ext: #4fc3f7; 
        --svg-main-ext: #b3e5fc;
        --svg-selected-ext: #0a2435;
        --timestamp-color-ext: #29b6f6;
        --timestamp-background-ext: #0f3a5f;
        --focus-button-color: #0288d1;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="sunset"][data-mode="light"] {
        --primary-color-ext: #ff7043;
        --secondary-color-ext: #f4511e; 
        --background-color-ext: #fff3e0;
        --card-color-ext: #ffe0b2; 
        --text-color-ext: #bf360c;
        --subtext-color-ext: #d84315; 
        --light-gray-border-ext: #ffcc80;
        --lighter-gray-ext: #fff8e1; 
        --gray-text-ext: #ef6c00; 
        --border-color-ext: #ffb74d; 
        --loading-dots-color-ext: #ff9800; 
        --timeline-timestamp-ext: #e65100;
        --link-color-ext: #f57c00; 
        --link-hover-color-ext: #e65100; 
        --svg-main-ext: #bf360c;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #d84315;
        --timestamp-background-ext: #fff8e1;
        --focus-button-color: #f57c00;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="sunset"][data-mode="dark"] {
        --primary-color-ext: #ff7043;
        --secondary-color-ext: #f4511e; 
        --background-color-ext: #3e2723;
        --card-color-ext: #4e342e; 
        --text-color-ext: #ffccbc;
        --subtext-color-ext: #ffab91; 
        --light-gray-border-ext: #6d4c41;
        --lighter-gray-ext: #795548; 
        --gray-text-ext: #ff8a65; 
        --border-color-ext: #d84315; 
        --loading-dots-color-ext: #ff5722; 
        --timeline-timestamp-ext: #ff8a65;
        --link-color-ext: #ff5722; 
        --link-hover-color-ext: #ff7043; 
        --svg-main-ext: #ffccbc;
        --svg-selected-ext: #3e2723;
        --timestamp-color-ext: #ff5722;
        --timestamp-background-ext: #4e342e;
        --focus-button-color: #f4511e;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="palo"][data-mode="light"] {
        --primary-color-ext: #4a90e2;
        --secondary-color-ext: #3a7bd5; 
        --background-color-ext: #f0f8ff;
        --card-color-ext: #e6f2ff; 
        --text-color-ext: #2c3e50;
        --subtext-color-ext: #34495e; 
        --light-gray-border-ext: #d4e6f7;
        --lighter-gray-ext: #ecf5fe; 
        --gray-text-ext: #7f8c8d; 
        --border-color-ext: #bdd9f2; 
        --loading-dots-color-ext: #5fa8f5; 
        --timeline-timestamp-ext: #6a89ad;
        --link-color-ext: #3498db; 
        --link-hover-color-ext: #2980b9; 
        --svg-main-ext: #2c3e50;
        --svg-selected-ext: #ffffff;
        --timestamp-color-ext: #3a7bd5;
        --timestamp-background-ext: #f0f8ff;
        --focus-button-color: #4a90e2;
        --focus-button-text: #ffffff;
    }

    :root[data-theme="palo"][data-mode="dark"] {
        --primary-color-ext: #4a90e2;
        --secondary-color-ext: #3a7bd5; 
        --background-color-ext: #1c2331;
        --card-color-ext: #2c3e50; 
        --text-color-ext: #ecf0f1;
        --subtext-color-ext: #bdc3c7; 
        --light-gray-border-ext: #34495e;
        --lighter-gray-ext: #445566; 
        --gray-text-ext: #95a5a6; 
        --border-color-ext: #3498db; 
        --loading-dots-color-ext: #5fa8f5; 
        --timeline-timestamp-ext: #7f8c8d;
        --link-color-ext: #3498db; 
        --link-hover-color-ext: #5fa8f5; 
        --svg-main-ext: #ecf0f1;
        --svg-selected-ext: #1c2331;
        --timestamp-color-ext: #3a7bd5;
        --timestamp-background-ext: #2c3e50;
        --focus-button-color: #4a90e2;
        --focus-button-text: #ffffff;
    }   


    /* Lavender Dreams Theme */
:root[data-theme="lavender-dreams"][data-mode="light"] {
    --primary-color-ext: #9b59b6;
    --secondary-color-ext: #8e44ad;
    --background-color-ext: #f3e5f5;
    --card-color-ext: #e1bee7;
    --text-color-ext: #4a148c;
    --subtext-color-ext: #6a1b9a;
    --light-gray-border-ext: #ce93d8;
    --lighter-gray-ext: #f8e8ff;
    --gray-text-ext: #7b1fa2;
    --border-color-ext: #ba68c8;
    --loading-dots-color-ext: #ab47bc;
    --timeline-timestamp-ext: #8e24aa;
    --link-color-ext: #8e44ad;
    --link-hover-color-ext: #6a1b9a;
    --svg-main-ext: #4a148c;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #6a1b9a;
    --timestamp-background-ext: #f8e8ff;
    --focus-button-color: #8e44ad;
    --focus-button-text: #ffffff;
}

:root[data-theme="lavender-dreams"][data-mode="dark"] {
    --primary-color-ext: #9b59b6;
    --secondary-color-ext: #8e44ad;
    --background-color-ext: #2c0a37;
    --card-color-ext: #4a1259;
    --text-color-ext: #e1bee7;
    --subtext-color-ext: #ce93d8;
    --light-gray-border-ext: #6a1b9a;
    --lighter-gray-ext: #7b1fa2;
    --gray-text-ext: #ba68c8;
    --border-color-ext: #9c27b0;
    --loading-dots-color-ext: #ab47bc;
    --timeline-timestamp-ext: #ba68c8;
    --link-color-ext: #ab47bc;
    --link-hover-color-ext: #ce93d8;
    --svg-main-ext: #e1bee7;
    --svg-selected-ext: #2c0a37;
    --timestamp-color-ext: #ab47bc;
    --timestamp-background-ext: #4a1259;
    --focus-button-color: #8e44ad;
    --focus-button-text: #ffffff;
}

/* Mint Breeze Theme */
:root[data-theme="mint-breeze"][data-mode="light"] {
    --primary-color-ext: #00bfa5;
    --secondary-color-ext: #00897b;
    --background-color-ext: #e0f2f1;
    --card-color-ext: #b2dfdb;
    --text-color-ext: #004d40;
    --subtext-color-ext: #00695c;
    --light-gray-border-ext: #80cbc4;
    --lighter-gray-ext: #e8f5f3;
    --gray-text-ext: #00796b;
    --border-color-ext: #4db6ac;
    --loading-dots-color-ext: #26a69a;
    --timeline-timestamp-ext: #00897b;
    --link-color-ext: #00897b;
    --link-hover-color-ext: #00695c;
    --svg-main-ext: #004d40;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #00695c;
    --timestamp-background-ext: #e8f5f3;
    --focus-button-color: #00897b;
    --focus-button-text: #ffffff;
}

:root[data-theme="mint-breeze"][data-mode="dark"] {
    --primary-color-ext: #00bfa5;
    --secondary-color-ext: #00897b;
    --background-color-ext: #0a2724;
    --card-color-ext: #1c3f3a;
    --text-color-ext: #b2dfdb;
    --subtext-color-ext: #80cbc4;
    --light-gray-border-ext: #00695c;
    --lighter-gray-ext: #00796b;
    --gray-text-ext: #4db6ac;
    --border-color-ext: #009688;
    --loading-dots-color-ext: #26a69a;
    --timeline-timestamp-ext: #4db6ac;
    --link-color-ext: #26a69a;
    --link-hover-color-ext: #4db6ac;
    --svg-main-ext: #b2dfdb;
    --svg-selected-ext: #0a2724;
    --timestamp-color-ext: #26a69a;
    --timestamp-background-ext: #1c3f3a;
    --focus-button-color: #00897b;
    --focus-button-text: #ffffff;
}

/* Golden Sands Theme */
:root[data-theme="golden-sands"][data-mode="light"] {
    --primary-color-ext: #ffa000;
    --secondary-color-ext: #ff8f00;
    --background-color-ext: #fff8e1;
    --card-color-ext: #ffecb3;
    --text-color-ext: #ff6f00;
    --subtext-color-ext: #f57c00;
    --light-gray-border-ext: #ffe082;
    --lighter-gray-ext: #fffbef;
    --gray-text-ext: #ff8f00;
    --border-color-ext: #ffd54f;
    --loading-dots-color-ext: #ffc107;
    --timeline-timestamp-ext: #ff9800;
    --link-color-ext: #ff8f00;
    --link-hover-color-ext: #f57c00;
    --svg-main-ext: #ff6f00;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #f57c00;
    --timestamp-background-ext: #fffbef;
    --focus-button-color: #ff8f00;
    --focus-button-text: #ffffff;
}

:root[data-theme="golden-sands"][data-mode="dark"] {
    --primary-color-ext: #ffa000;
    --secondary-color-ext: #ff8f00;
    --background-color-ext: #332800;
    --card-color-ext: #4d3b00;
    --text-color-ext: #ffe082;
    --subtext-color-ext: #ffd54f;
    --light-gray-border-ext: #ff8f00;
    --lighter-gray-ext: #ffa000;
    --gray-text-ext: #ffca28;
    --border-color-ext: #ffc107;
    --loading-dots-color-ext: #ffb300;
    --timeline-timestamp-ext: #ffca28;
    --link-color-ext: #ffb300;
    --link-hover-color-ext: #ffca28;
    --svg-main-ext: #ffe082;
    --svg-selected-ext: #332800;
    --timestamp-color-ext: #ffb300;
    --timestamp-background-ext: #4d3b00;
    --focus-button-color: #ff8f00;
    --focus-button-text: #ffffff;
}

/* Cherry Blossom Theme */
:root[data-theme="cherry-blossom"][data-mode="light"] {
    --primary-color-ext: #ec407a;
    --secondary-color-ext: #d81b60;
    --background-color-ext: #fce4ec;
    --card-color-ext: #f8bbd0;
    --text-color-ext: #880e4f;
    --subtext-color-ext: #ad1457;
    --light-gray-border-ext: #f48fb1;
    --lighter-gray-ext: #fff0f6;
    --gray-text-ext: #c2185b;
    --border-color-ext: #f06292;
    --loading-dots-color-ext: #e91e63;
    --timeline-timestamp-ext: #d81b60;
    --link-color-ext: #d81b60;
    --link-hover-color-ext: #ad1457;
    --svg-main-ext: #880e4f;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #ad1457;
    --timestamp-background-ext: #fff0f6;
    --focus-button-color: #d81b60;
    --focus-button-text: #ffffff;
}

:root[data-theme="cherry-blossom"][data-mode="dark"] {
    --primary-color-ext: #ec407a;
    --secondary-color-ext: #d81b60;
    --background-color-ext: #2b0a1a;
    --card-color-ext: #4a1132;
    --text-color-ext: #f8bbd0;
    --subtext-color-ext: #f48fb1;
    --light-gray-border-ext: #ad1457;
    --lighter-gray-ext: #c2185b;
    --gray-text-ext: #f06292;
    --border-color-ext: #e91e63;
    --loading-dots-color-ext: #ec407a;
    --timeline-timestamp-ext: #f06292;
    --link-color-ext: #ec407a;
    --link-hover-color-ext: #f48fb1;
    --svg-main-ext: #f8bbd0;
    --svg-selected-ext: #2b0a1a;
    --timestamp-color-ext: #ec407a;
    --timestamp-background-ext: #4a1132;
    --focus-button-color: #d81b60;
    --focus-button-text: #ffffff;
}

/* Emerald City Theme */
:root[data-theme="emerald-city"][data-mode="light"] {
    --primary-color-ext: #00c853;
    --secondary-color-ext: #00a040;
    --background-color-ext: #e8f5e9;
    --card-color-ext: #c8e6c9;
    --text-color-ext: #1b5e20;
    --subtext-color-ext: #2e7d32;
    --light-gray-border-ext: #a5d6a7;
    --lighter-gray-ext: #f1f8e9;
    --gray-text-ext: #388e3c;
    --border-color-ext: #81c784;
    --loading-dots-color-ext: #4caf50;
    --timeline-timestamp-ext: #43a047;
    --link-color-ext: #00a040;
    --link-hover-color-ext: #2e7d32;
    --svg-main-ext: #1b5e20;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #2e7d32;
    --timestamp-background-ext: #f1f8e9;
    --focus-button-color: #00a040;
    --focus-button-text: #ffffff;
}

:root[data-theme="emerald-city"][data-mode="dark"] {
    --primary-color-ext: #00c853;
    --secondary-color-ext: #00a040;
    --background-color-ext: #0d2a0d;
    --card-color-ext: #1e4620;
    --text-color-ext: #c8e6c9;
    --subtext-color-ext: #a5d6a7;
    --light-gray-border-ext: #2e7d32;
    --lighter-gray-ext: #388e3c;
    --gray-text-ext: #81c784;
    --border-color-ext: #4caf50;
    --loading-dots-color-ext: #00e676;
    --timeline-timestamp-ext: #81c784;
    --link-color-ext: #00e676;
    --link-hover-color-ext: #69f0ae;
    --svg-main-ext: #c8e6c9;
    --svg-selected-ext: #0d2a0d;
    --timestamp-color-ext: #00e676;
    --timestamp-background-ext: #1e4620;
    --focus-button-color: #00a040;
    --focus-button-text: #ffffff;
}

/* Arctic Frost Theme */
:root[data-theme="arctic-frost"][data-mode="light"] {
    --primary-color-ext: #4fc3f7;
    --secondary-color-ext: #29b6f6;
    --background-color-ext: #e1f5fe;
    --card-color-ext: #b3e5fc;
    --text-color-ext: #01579b;
    --subtext-color-ext: #0277bd;
    --light-gray-border-ext: #81d4fa;
    --lighter-gray-ext: #f0f9ff;
    --gray-text-ext: #039be5;
    --border-color-ext: #4fc3f7;
    --loading-dots-color-ext: #03a9f4;
    --timeline-timestamp-ext: #0288d1;
    --link-color-ext: #29b6f6;
    --link-hover-color-ext: #0277bd;
    --svg-main-ext: #01579b;
    --svg-selected-ext: #ffffff;
    --timestamp-color-ext: #0277bd;
    --timestamp-background-ext: #f0f9ff;
    --focus-button-color: #29b6f6;
    --focus-button-text: #ffffff;
}


:root[data-theme="arctic-frost"][data-mode="dark"] {
    --primary-color-ext: #4fc3f7;
    --secondary-color-ext: #29b6f6;
    --background-color-ext: #0a2535;
    --card-color-ext: #0f3a5f;
    --text-color-ext: #b3e5fc;
    --subtext-color-ext: #81d4fa;
    --light-gray-border-ext: #0277bd;
    --lighter-gray-ext: #039be5;
    --gray-text-ext: #4fc3f7;
    --border-color-ext: #03a9f4;
    --loading-dots-color-ext: #29b6f6;
    --timeline-timestamp-ext: #4fc3f7;
    --link-color-ext: #29b6f6;
    --link-hover-color-ext: #4fc3f7;
    --svg-main-ext: #b3e5fc;
    --svg-selected-ext: #0a2535;
    --timestamp-color-ext: #29b6f6;
    --timestamp-background-ext: #0f3a5f;
    --focus-button-color: #29b6f6;
    --focus-button-text: #ffffff;
}


.error-wrap {
    background-color: #fdd; /* Light red background */
    border: 1px solid #faa; /* Slightly darker red border */
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    font-weight: bold;
    font-size: 24px;
    color: #a00; /* Dark red text */
    margin: 20px auto; /* Center horizontally with margin */
    max-width: 80%; /* Limit width for readability */
}

/* Reload Button */
#reload-page { 
    padding: 10px 20px;
    background-color: var(--primary-color-ext); 
    color: #ffffff;
    border: none; 
    border-radius: 6px;
    margin: 10px auto; /* Center horizontally with margin */
    cursor: pointer;
    transition: all 0.3s ease;
}

/* Main container for both chat and search modes */
.main-box {
    border-radius: 12px;
    background-color: var(--card-color-ext); 
    margin-bottom: 16px;
    margin-top: 16px;  
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); 
    border: none;  
    font-family: 'Roboto', Arial, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 400px;
}

/* Top bar styles for both modes */
.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px; 
    background-color: var(--background-color-ext); 
    border-bottom: 1px solid var(--light-gray-border-ext); 
    color: var(--text-color-ext); 
}

/* Mode buttons */
.mode-buttons {
    display: flex;
    gap: 8px;
    background-color: var(--light-gray-border-ext); 
    padding: 6px; 
    border-radius: 8px;
}

.mode-buttons button {
    padding: 8px 16px; 
    background-color: transparent; 
    color: var(--text-color-ext); 
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease; 
}

.mode-buttons button:hover {
    background-color: var(--lighter-gray-ext); 
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mode-buttons button.active {
    background-color: var(--primary-color-ext);
    color: #ffffff; 
}

.mode-buttons button svg {
    width: 18px;
    height: 18px;
    fill: var(--svg-main-ext); /* Default fill color */
    transition: fill 0.3s ease; /* Smooth transition for color changes */
}

.mode-buttons button.active svg {
    fill: var(--svg-selected-ext); /* Fill color when button is active */
}

/* Clear button SVG */
.clear-btn svg {
    width: 16px;
    height: 16px;
    fill: var(--gray-text-ext); /* Fill color for clear button */
}

.mode-buttons button.active:hover {
    background-color: var(--secondary-color-ext);
}

.mode-buttons button:active { 
    transform: translateY(1px); 
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); 
}


/* Top bar buttons */
.top-bar .actions {
    display: flex;
    gap: 10px;
}

/* Clear Button */
.clear-btn {
    padding: 8px;
    background-color: transparent; 
    color: var(--gray-text-ext);  
    border: 1px solid var(--border-color-ext); 
    border-radius: 50%;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}
    

.clear-btn:hover {
    background-color: var(--lighter-gray-ext);
    transform: scale(1.1); 
    opacity: 0.9; 
}

.clear-btn:active {
    transform: scale(0.95);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}


.clear-btn svg {
    width: 16px;
    height: 16px;
    fill: currentColor; 
}

/* Search Input (hidden by default, adjust as needed) */
.search-input {
    flex: 1;
    padding: 8px 12px;
    margin: 0 8px;
    border: 1px solid var(--border-color-ext); 
    border-radius: 6px;
    background-color: var(--background-color-ext);  
    color: var(--text-color-ext);  
    font-size: 14px;
    height: 10px; 
}

/* Search Button (hidden by default, adjust as needed) */
.search-btn {
    padding: 8px 16px;
    background-color: transparent;  
    color: var(--gray-text-ext);  
    border: 1px solid var(--border-color-ext); 
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;  
    display: flex;
    align-items: center;
    justify-content: center;
}

.search-btn:hover {
    background-color: var(--lighter-gray-ext); 
    transform: scale(1.1); 
    opacity: 0.9; 
}

.search-btn:active { 
    transform: scale(0.95);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); 
}


.search-btn svg {
    width: 18px;
    height: 18px;
    fill: currentColor;  
}

/* Chat Window */
.chat-window,
.results { 
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background-color: var(--background-color-ext); 
    border-top: 1px solid var(--light-gray-border-ext); 
    min-height: 200px;
    max-height: 700px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.chat-window-content,
.results-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    overflow-y: auto;
    max-height: 100%; 
}

/* Chat Messages */
.chat-message {
    margin: 10px 0; 
    padding: 12px 16px;
    border-radius: 8px; 
    font-size: 14px;
    line-height: 1.5;
    max-width: 80%;
    word-wrap: break-word;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); 
}

.chat-message .message-header {
    font-weight: bold;
    margin-bottom: 4px;
    color: var(--subtext-color-ext); 
}

.chat-message .message-content {
    color: var(--text-color-ext);  
}

.chat-message .message-timestamp { /* Increase specificity here */
    font-size: 14px;
    color: var(--timestamp-color-ext);
    padding: 3px 2px;
    background-color: var(--timestamp-background-ext);
    border-radius: 8px;
    text-decoration: none; 
} 

.chat-message.user {
    background-color: var(--light-gray-border-ext); 
    align-self: flex-end;
}

.chat-message.assistant {
    background-color: var(--light-gray-border-ext); 
    align-self: flex-start;
}

/* Bottom Bar */
.bottom-bar {
    display: flex;
    padding: 12px 16px;  
    background-color: var(--background-color-ext); 
    border-top: 1px solid var(--light-gray-border-ext); 
}

.bottom-bar input {
    flex: 1;
    padding: 10px;
    border: 1px solid var(--border-color-ext);  
    border-radius: 6px;
    background-color: var(--background-color-ext); 
    color: var(--text-color-ext); 
    font-size: 14px;
}

.bottom-bar button {
    padding: 10px 20px;  
    background-color: var(--primary-color-ext); 
    color: #ffffff;
    border: none;  
    border-radius: 6px;
    margin-left: 10px;
    cursor: pointer;
    transition: all 0.3s ease;  
}

.bottom-bar button:hover {
    background-color: var(--link-hover-color-ext); 
    transform: translateY(-2px); 
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); 
}

.bottom-bar button:active { 
    transform: translateY(1px); 
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); 
}


/* Toggle visibility based on mode */
.main-box-chat,
.main-box-search,
.main-box-timeline,
.main-box-transcript {
    display: none;
}

.chat-mode .main-box-chat {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.search-mode .main-box-search {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.timeline-mode .main-box-timeline {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.transcript-mode .main-box-transcript {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}
    

/* Loading Animation */
.load-wrapp {
  float: left;
  width: 100px;
  height: 100px;
  margin: 0 10px 10px 0;
  padding: 20px 20px 20px;
  text-align: center;
}

.load-wrapp p {
  padding: 0 0 20px;
}

.load-wrapp:last-child {
  margin-right: 0;
}

.line {
  display: inline-block;
  width: 15px;
  height: 15px;
  border-radius: 15px;
  background-color: var(--loading-dots-color-ext);  
}

.load-3 .line:nth-last-child(1) {
  animation: loadingC 0.6s 0.1s linear infinite;
}
.load-3 .line:nth-last-child(2) {
  animation: loadingC 0.6s 0.2s linear infinite;
}
.load-3 .line:nth-last-child(3) {
  animation: loadingC 0.6s 0.3s linear infinite;
}

@keyframes loadingC {
  0 {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(0, 15px);
  }
  100% {
    transform: translate(0, 0);
  }
}


.timeline-mode .main-box-timeline .chat-window {
    display: flex;
    justify-content: center;
    align-items: center; 
    padding: 20px;
    flex-grow: 1; 
}

.timeline-mode .main-box-timeline .generate-timeline {
    background-color: var(--background-color-ext);  
    color: var(--link-color-ext); 
    border: 1px solid var(--border-color-ext); 
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;  
    font-size: 24px;
    padding: 20px 40px; 
    width: 100%;
    height: 100%; 
    box-sizing: border-box; 
}

.timeline-mode .main-box-timeline .generate-timeline:hover {
    background-color: var(--light-gray-border-ext); 
    transform: translateY(-2px); 
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.timeline-mode .main-box-timeline .generate-timeline:active { 
    transform: translateY(1px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); 
}



.transcript-mode .main-box-transcript .chat-window {
    display: flex;
    justify-content: center; 
    align-items: center; 
    padding: 20px; 
    flex-grow: 1; 
}

.transcript-mode .main-box-transcript .generate-transcript {
    background-color: var(--background-color-ext);
    color: var(--link-color-ext); 
    border: 1px solid var(--border-color-ext); 
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease; 
    font-size: 24px;
    padding: 20px 40px;  
    width: 100%;  
    height: 100%; 
    box-sizing: border-box;
}

.transcript-mode .main-box-transcript .generate-transcript:hover {
    background-color: var(--light-gray-border-ext); 
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.transcript-mode .main-box-transcript .generate-transcript:active { 
    transform: translateY(1px); 
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}


.main-box-transcript .chat-window-content {
    overflow-y: auto;
    max-height: 600px; 
    padding: 10px;
}

.main-box-transcript .chat-window-content h1 {
    font-size: 24px;
    margin-bottom: 10px;
    color: var(--text-color-ext); 
}

.main-box-transcript .chat-window-content h2 {
    font-size: 18px;
    color: var(--subtext-color-ext); 
    margin-bottom: 15px;
}

.transcript-segment {
    color: var(--text-color-ext);
    margin-bottom: 5px; 
    font-size: 16px;
    line-height: 1.5; 
}

.timestamp {
    color: var(--timeline-timestamp-ext); 
    margin-right: 10px;
    font-weight: bold;
}


/* Styles for timeline-content */
.timeline-content {
  padding: 20px; 
  color: var(--text-color-ext);
  overflow-y: auto; 
  max-height: 600px; 
  font-size: 16px;
}

.timeline-content h1 {
  font-size: 24px;  
  margin-bottom: 15px; 
  color: var(--text-color-ext); 
}

.timeline-content ul {
  list-style: none;
  padding-left: 0;
}

.timeline-content li {
  margin-bottom: 10px;
  line-height: 1.5;
  font-size: 16px;
  display: flex;
  align-items: center; 
}

.timeline-content .timestamp {
  color: var(--timeline-timestamp-ext); 
  margin-right: 15px;
  font-weight: bold;
  flex-shrink: 0; 
}

/* Clickable Timestamps */
.timeline-content a {
  color: var(--link-color-ext);  
  text-decoration: none;
  font-weight: bold; 
}

.timeline-content a:hover {
  text-decoration: underline;  
}

/* Optional: Visual Separation */
.timeline-content li:nth-child(even) {
  background-color: var(--card-color-ext); 
}
    `;

    const reloadButton = document.getElementById('reload-page');
    reloadButton.addEventListener('click', () => {
        window.location.reload(); 
    });
    chrome.storage.sync.get(['theme'], function(data) {
        if (data.theme) {
            document.documentElement.setAttribute('data-theme', data.theme);
        } else {
            // Default to light theme if no theme is saved
            document.documentElement.setAttribute('data-theme', 'default');
        }
    });
    chrome.storage.sync.get(['mode'], function(data) {
        if (data.mode) {
            document.documentElement.setAttribute('data-mode', data.mode);
        } else {
            document.documentElement.setAttribute('data-mode', 'light');
        }
    });
    document.head.appendChild(style);
}

/**
 * Creates the majority of the event listeners for the extension box.
 */
function createEventListeners() {
    const chatchatToggle = document.getElementById('chatchattoggle');
    const chattimelinetoggle = document.getElementById('chattimelinetoggle');
    const chattranscripttoggle = document.getElementById('chattranscripttoggle');

    //chatsearchToggle.addEventListener('click', () => {toggleMode('search')});
    chatchatToggle.addEventListener('click', () => {toggleMode('chat-mode','chat-mode')});
    chattimelinetoggle.addEventListener('click', () => {toggleMode('chat-mode','timeline-mode')});
    chattranscripttoggle.addEventListener('click', () => {toggleMode('chat-mode','transcript-mode')});


    const timechatToggle = document.getElementById('timechattoggle');
    const timetimelinetoggle = document.getElementById('timetimelinetoggle');
    const timetranscripttoggle = document.getElementById('timetranscripttoggle');

    //chatsearchToggle.addEventListener('click', () => {toggleMode('search')});
    timechatToggle.addEventListener('click', () => {toggleMode('timeline-mode','chat-mode')});
    timetimelinetoggle.addEventListener('click', () => {toggleMode('timeline-mode','timeline-mode')});
    timetranscripttoggle.addEventListener('click', () => {toggleMode('timeline-mode','transcript-mode')});

    const transcriptchatToggle = document.getElementById('transcriptchattoggle');
    const transcripttimelinetoggle = document.getElementById('transcripttimelinetoggle');
    const transcripttranscripttoggle = document.getElementById('transcripttranscripttoggle');

    //chatsearchToggle.addEventListener('click', () => {toggleMode('search')});
    transcriptchatToggle.addEventListener('click', () => {toggleMode('transcript-mode','chat-mode')});
    transcripttimelinetoggle.addEventListener('click', () => {toggleMode('transcript-mode','timeline-mode')});
    transcripttranscripttoggle.addEventListener('click', () => {toggleMode('transcript-mode','transcript-mode')});

    const chatSendButton = document.getElementById('chatSendButton');
    const chatInput = document.getElementById('chatinput');

    const clearButton = document.getElementById('clearbutton');
    clearButton.addEventListener('click', () => {buttonClearChat()});
    

    const chatCopyButton = document.getElementById('chat-copy-button');
    const timelineCopyButton = document.getElementById('timeline-copy-button');
    const transcriptCopyButton = document.getElementById('transcript-copy-button');
    const transcriptDownlaodButton = document.getElementById('transcript-download-button');

    /**
     * Downloads the transcript to the user's device.
     */
    function downloadTranscript() {
        const transcriptContent = document.getElementById('transcript-content');
        if (!transcriptContent) {
            console.error('Transcript content element not found');
            return;
        }
        
        const transcriptText = transcriptContent.textContent;
        const blob = new Blob([transcriptText], { type: "text/plain;charset=utf-8" });
        
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "transcript.txt";
        
        document.body.appendChild(downloadLink);
        
        downloadLink.click();
        
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }


    transcriptDownlaodButton.addEventListener('click', () => downloadTranscript());


    if (chatCopyButton) chatCopyButton.addEventListener('click', () => copyToClipboard('chat'));
    if (timelineCopyButton) timelineCopyButton.addEventListener('click', () => copyToClipboard('timeline'));
    if (transcriptCopyButton) transcriptCopyButton.addEventListener('click', () => copyToClipboard('transcript'));

    /**
     * Copies text input to user's clipboard.
     * @param {string} text - The text to copy.
     */
    function ctc(text) {
        const tempTextArea = document.createElement('textarea');
        
        tempTextArea.value = text;
        
        document.body.appendChild(tempTextArea);
        
        tempTextArea.select();
        
        document.execCommand('copy');
        
        document.body.removeChild(tempTextArea);
    }

    /**
     * Based on the mode copies the content of the extension to the user's clipboard.
     * @param {string} mode - The current mode the extension is in.
     */
    function copyToClipboard(mode) {
        chrome.runtime.sendMessage({ action: "trackEvent", eventName: "copy_to_clipboard" });
        console.log(`Copying ${mode} to clipboard`);
        if (mode === 'chat') {
            let chatHistory = [];

            const chatWindowContent = document.getElementsByClassName('chat-window-content');
            const chatMessages = chatWindowContent[0].getElementsByClassName('chat-message');
            for (let i = 0; i < chatMessages.length; i++) {
                const sender = chatMessages[i].getElementsByClassName('message-header')[0].textContent.trim().slice(0, -1);
                const content = chatMessages[i].getElementsByClassName('message-content')[0].textContent;
                chatHistory.push({ sender: sender, message: content });
            }
            let formatted_chat_history = '';
            for (let i = 0; i < chatHistory.length; i++) {
                formatted_chat_history += `${chatHistory[i].sender}: ${chatHistory[i].message}\n`;
            }
            //copy chat history to clipboard
            console.log('Chat history:', formatted_chat_history);
            ctc(formatted_chat_history);
        }
        else if (mode === 'timeline') {
            const timelineContent = document.getElementById('timeline-content');
            //copy timeline content to clipboard
            console.log('Timeline content:', timelineContent.textContent);
            ctc(timelineContent.textContent);
        } else if (mode === 'transcript') {
            const transcriptContent = document.getElementById('transcript-content');
            //copy transcript content to clipboard
            console.log('Transcript content:', transcriptContent.textContent);
            ctc(transcriptContent.textContent);
        }
    }
    const chatReload = document.getElementById('chatreload');
    chatReload.addEventListener('click', () => {hello_store = ''; addHelloMessage()});
    const timeReload = document.getElementById('timelinereload');
    timeReload.addEventListener('click', () => {timeline_store = ''; addTimeline()});

    /**
     * Clears the chat window content.
     */
    function buttonClearChat() {
        const chatWindowContent = document.getElementsByClassName('chat-window-content');
        chatWindowContent[0].innerHTML = '';
    
        
    }

    /*
    *Who knows
    */
    function request(req){
        chatInput.value = req;
        chatSend();
    }

    /**
     * Chat message sent on chat window. The message is sent through Gemini and then formatted response is added to window.
     */
    async function chatSend() {
        chrome.runtime.sendMessage({ action: "trackEvent", eventName: "chat_send" });
        let quota = undefined;
        chrome.runtime.sendMessage({ action: "fetchQuota" }, function(response) {
            quota = response.quota;
            if (quota <= 0) {
                console.log('Quota limit reached');
                return;
            }
        });

        //console.log(`transcript? please ${g_transcript}`)
        if (!chatInput.value || g_thinking) {
            return;
        }
        g_thinking = true;
        const summarizeButton = document.getElementById('ext-summarize');
        const timelineButton = document.getElementById('ext-timeline');
        if (summarizeButton || timelineButton) {
            clearChat();
        }
        //console.log(`user message: ${chatInput.value}`)
        const user_message = chatInput.value;
        chatInput.value = '';
        //add user message to chat window
        const chatWindowContent = document.getElementsByClassName('chat-window-content');
        //get chat history
        let chatHistory = [];
        const chatMessages = chatWindowContent[0].getElementsByClassName('chat-message');
        for (let i = 0; i < chatMessages.length; i++) {
            const sender = chatMessages[i].getElementsByClassName('message-header')[0].textContent.trim().slice(0, -1);
            const content = chatMessages[i].getElementsByClassName('message-content')[0].textContent;
            chatHistory.push({ sender: sender, message: content });
        }
        //console.log('Chat history:', chatHistory);
        const userMessageElement = document.createElement('div');
        userMessageElement.classList.add('chat-message');
        userMessageElement.classList.add('user');
        userMessageElement.innerHTML = `<div class="message-header">User:</div><div class="message-content">${user_message}</div>`;
        chatWindowContent[0].appendChild(userMessageElement);
        //show thinking response
        const thinkingElement = document.createElement('div');
        thinkingElement.classList.add('chat-message');
        thinkingElement.classList.add('assistant');
        thinkingElement.innerHTML = `<div class="message-header">Assistant:</div><div class="message-content"><div class="load-wrapp">
      <div class="load-3">
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
      </div>
    </div></div>`;
        chatWindowContent[0].appendChild(thinkingElement);
        chatWindowContent[0].scrollTop = chatWindowContent[0].scrollHeight;
        //format transcript
        let formatted_transcript = 'I love cats. My favorite fact about cats is that they have 3 paws.'; 
        //console.log(g_transcript);
        let tran = g_transcript.transcript.events;
        let full_transcript = '';

        for (let i = 0; i < tran.length; i++) {
            let text = '';
            if (tran[i].segs && Array.isArray(tran[i].segs)) {
                for (let j = 0; j < tran[i].segs.length; j++) {
                    if (tran[i].segs[j].utf8) {
                        text += tran[i].segs[j].utf8;
                    }
                }
            }
            
            let startMinutes = Math.floor(tran[i].tStartMs / 1000 / 60);
            let startSeconds = Math.trunc((tran[i].tStartMs / 1000) % 60);
            let duration = (tran[i].dDurationMs / 1000).toFixed(2);
            
            full_transcript += `Start: {${startMinutes}m ${startSeconds}s} Duration: {${duration}s} text: { ${text}}. `;
        }

        //console.log("Full transcript: " + full_transcript);
        //form prompt
        let formatted_chat_history = '';
        for (let i = 0; i < chatHistory.length; i++) {
            formatted_chat_history += `${chatHistory[i].sender}: ${chatHistory[i].message}\n`;
            formatted_chat_history +="\n\n";
        }
        //console.log(`formatted chat history: ${formatted_chat_history}`)
        let format_prompt = `
        <system_prompt>You are a Youtube Assistant. Palo, an AI Youtube Assistant. You are always happy to educate about any topic. You were created with the goal to help users with their questions and provide information about the video they are currently viewing.</system_prompt>
        <output_style>You are to output in a friendly conversational manner, don't make your responses too long or short unless explicitly asked. Maybe use an emoji here and there but not every time. As for referencing your responses add in some timestamps. Keep your responses short, in a conversational style, maybe a couple sentence max except for special cases. Also it doesn't just have to be one huge paragraph, you can do new lines for stuff like bullet points but be wary of excess space.</output_style>
        <timestamp_guide>Cite your sources in your response with start timestamps. When outputting a timestampt to make it linkable output with [mm:ss]. Please output in markdown, except for the time stamps, ensure the have the following format [mm:ss]. Examples of time formatting [00:23] or [03:43].</timestamp_guide>
        <timestamp_formatting>[mm:ss]. When outputting a time make sure its in that format. Although, you should rarely do this, avoid time ranges, just do single times. If you want to do a time range, do not change the format, good example: [12:34]-[12:45].</timestamp_formatting>
        <video_metadata>${g_transcript.metadata.title}. By: ${g_transcript.metadata.author}.</video_metadata>
        <video_transcript>${full_transcript}</video_transcript>
        <chat_history>${formatted_chat_history}</chat_history>
        <user_message>${user_message}</user_message>
        `;
        //console.log(`format prompt: ${format_prompt}`)
        //get response from api
        

        const quotaResponse = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "fetchQuota" }, function(response) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });

        let response = '';
        console.log(quotaResponse.quota);
        console.log(chrome.runtime.id);
        if (quotaResponse.quota === 1747){
            const quota_counter = document.getElementById('quota-counter');
            quota_counter.textContent = `❄️: ∞/20`;
            response = await prompt(format_prompt);
        } else if (quotaResponse.quota > 0) {
            chrome.runtime.sendMessage({ action: "decreaseQuota" });
            const quota_counter = document.getElementById('quota-counter');
            quota_counter.textContent = `❄️: ${quotaResponse.quota-1}/20`;
            response = await prompt(format_prompt);
        } else {
            response = `Sorry, you've hit your quota limit for the day. <a href="#" id="upgrade-link">Upgrade to Palo+ for unlimited access!</a>`;
            const quota_counter = document.getElementById('quota-counter');
            quota_counter.textContent = `❄️: ${quotaResponse.quota}/20`;
        }
        if (g_transcript === '1776error'){
            response = "I'm sorry, there was an error fetching this videos transcript, please try reloading the page."
        }
        //console.log(response)
        //responsee formatting
        response = response.replace(/\[(\d+):(\d+)\]/g, (match, minutes, seconds) => {
            const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
            const url = `https://www.youtube.com/watch?v=${getVideoId(window.location.href)}&t=${totalSeconds}s`;
            return `<a href="javascript:void(0)" class="message-timestamp" onclick="(function(e) { e.preventDefault(); console.log('Clicked: ${totalSeconds} seconds'); const vid = document.querySelector('video'); if(vid){vid.currentTime = ${totalSeconds};} else {console.log('anothererror');} return false; })(event)">${match}</a>`;
        });
        
    
        
        response = response
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  
            .replace(/\*(.*?)\*/g, '<em>$1</em>')              
            .replace(/\n/g, '<br>')                          

        //remove thinking response
        thinkingElement.remove();
        //add response to chat window
        const assistantMessageElement = document.createElement('div');
        assistantMessageElement.classList.add('chat-message');
        assistantMessageElement.classList.add('assistant');
        assistantMessageElement.innerHTML = `<div class="message-header">Assistant:</div><div class="message-content">${response}</div>`;
        chatWindowContent[0].appendChild(assistantMessageElement);

        const upgradeLink = assistantMessageElement.querySelector('#upgrade-link');

        if (upgradeLink) {
            upgradeLink.addEventListener('click', (e) => {
                e.preventDefault();
                chrome.runtime.sendMessage({ 
                    action: "openPlansPage"
                });
            });
        }

        //scroll to bottom of chat window
        chatWindowContent[0].scrollTop = chatWindowContent[0].scrollHeight;
        g_thinking = false;
    }

    chatSendButton.addEventListener('click', chatSend);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            chatSend();
        }
    })

    addHelloMessage();
}





/**
 * Skips the video element to the specified time in seconds.
 * @param {int} seconds - The time in seconds to skip to.
 */
function skipToTime(seconds) {
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = seconds;
    } else {
      console.error('Video element not found');
    }
  }

/**
 * Changes mode of extension box.
 * @param {string} from - The current box mode to hide.
 * @param {string} to - The new box mode to show.
*/
function toggleMode(from, to) {
    //console.log(`toggling from ${from} to ${to}`)
    const mainBox = document.getElementById('mainBox');
    //console.log(mainBox.classList)
    mainBox.classList.remove(from);
    mainBox.classList.add(to);
    if (to === 'chat-mode') {
        addHelloMessage();
    }
    if (to === 'timeline-mode') {
        addTimeline();
    }
    if (to === 'transcript-mode') {
        addTranscript();
    }
}

/**
 * Adds timeline to timeline mode when it is activated.
 */
function addTimeline() {
    //console.log("adding timeline")
    //get timeline-content div
    const timelineContent = document.getElementById('timeline-content');

    //clear previous content
    //formtranscripttext and prompt for timeline
    timeline = '';
    let tran = g_transcript.transcript.events;
    let full_transcript = '';

    for (let i = 0; i < tran.length; i++) {
        let text = '';
        if (tran[i].segs && Array.isArray(tran[i].segs)) {
            for (let j = 0; j < tran[i].segs.length; j++) {
                if (tran[i].segs[j].utf8) {
                    text += tran[i].segs[j].utf8;
                }
            }
        }
        
        let startMinutes = Math.floor(tran[i].tStartMs / 1000 / 60);
        let startSeconds = Math.trunc((tran[i].tStartMs / 1000) % 60);
        let duration = (tran[i].dDurationMs / 1000).toFixed(2);
        
        full_transcript += `Start: {${startMinutes}m ${startSeconds}s} Duration: {${duration}s} text: { ${text}}. `;
    }

    //console.log("Full transcript: " + full_transcript);
    //form prompt
    user_message = "Your current objective is to output a Timeline for this video. This timeline should have a title at the top, <h1> title </h1> then new lines and bullet points for each segment of the video. Each bullet point should have a timestamp and a brief description of the content at that time. The timestamps should be in the format [mm:ss]. Max try to limit the bullet points to 15, though aim for about 10";
    let format_prompt = `
    <system_prompt>You are a Youtube Assistant. Palo, an AI Youtube Assistant. You are always happy to educate about any topic. You were created with the goal to help users with their questions and provide information about the video they are currently viewing.</system_prompt>
    <output_style>You are to output in a friendly conversational manner, don't make your responses too long or short unless explicitly asked. Maybe use an emoji here and there but not every time. As for referencing your responses add in some timestamps. Keep your responses short, in a conversational style, maybe a couple sentence max except for special cases. Also it doesn't just have to be one huge paragraph, you can do new lines for stuff like bullet points but be wary of excess space. Use markdown bold to make the key words stand out in your response. Also ensure to use at minimum 1 emoji.</output_style>
    <timestamp_guide>Cite your sources in your response with start timestamps. When outputting a timestampt to make it linkable output with [mm:ss]. Please output in markdown, except for the time stamps, ensure the have the following format [mm:ss]. Examples of time formatting [00:23] or [03:43].</timestamp_guide>
    <timestamp_formatting>[mm:ss]. When outputting a time make sure its in that format. Although, you should rarely do this, avoid time ranges, just do single times. If you want to do a time range, do not change the format, good example: [12:34]-[12:45].</timestamp_formatting>
    <video_metadata>${g_transcript.metadata.title}. By: ${g_transcript.metadata.author}.</video_metadata>
    <video_transcript>${full_transcript}</video_transcript>
    <current_system_request>${user_message}</current_system_request>
    THIS IS NOT A CHAT, OUTPUT THE CORRECTLY FORMATTED TIMELINE AND NOTHING ELSE.
    **make sure to output in markdown, use bold to make the key words stand out. Also ensure to correctly format the timestamps to [mm:ss]. also put an related emoji at the start and end of the title.**
    `;
    //console.log("prompting")
    if (timeline_store !== ''){
        //console.log('not changing timeline')
        timeline = timeline_store;
        //console.log("final timeline:" + timeline)
        timeline = timeline.replace(/\[(\d+):(\d+)\]/g, (match, minutes, seconds) => {
            const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
            const url = `https://www.youtube.com/watch?v=${getVideoId(window.location.href)}&t=${totalSeconds}s`;
            return `<a href="javascript:void(0)" onclick="(function(e) { e.preventDefault(); console.log('Clicked: ${totalSeconds} seconds'); const vid = document.querySelector('video'); if(vid){vid.currentTime = ${totalSeconds};} else {console.log('anothererror');} return false; })(event)">${match}</a>`;
        }); 
        timeline = timeline
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  
            .replace(/\*(.*?)\*/g, '<em>$1</em>')              
            .replace(/\n/g, '<br>')               
        //add timeline to timeline-content div
        timelineContent.innerHTML = timeline;
    } else {
        prompt(format_prompt).then((response) => {
            //console.log("timeline:" + response);
            timeline = response;
            //console.log("final timeline:" + timeline)
            timeline = timeline.replace(/\[(\d+):(\d+)\]/g, (match, minutes, seconds) => {
                const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
                const url = `https://www.youtube.com/watch?v=${getVideoId(window.location.href)}&t=${totalSeconds}s`;
                return `<a href="javascript:void(0)" onclick="(function(e) { e.preventDefault(); console.log('Clicked: ${totalSeconds} seconds'); const vid = document.querySelector('video'); if(vid){vid.currentTime = ${totalSeconds};} else {console.log('anothererror');} return false; })(event)">${match}</a>`;
            }); 
            timeline = timeline
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  
                .replace(/\*(.*?)\*/g, '<em>$1</em>')              
                .replace(/\n/g, '<br>')               
            //add timeline to timeline-content div
            timelineContent.innerHTML = timeline;
            timeline_store = timeline;
        });
    }   
    //console.log("timeline added")

}

/**
 * Adds transcript to transcript mode when it is activated.
 */
function addTranscript() {
    //console.log("adding transcript")
    let video_title = g_transcript.metadata.title;
    let video_author = g_transcript.metadata.author;
    let tran = g_transcript.transcript.events;
    let full_transcript = '';

    for (let i = 0; i < tran.length; i++) {
        let text = '';
        if (tran[i].segs && Array.isArray(tran[i].segs)) {
            for (let j = 0; j < tran[i].segs.length; j++) {
                if (tran[i].segs[j].utf8) {
                    text += tran[i].segs[j].utf8;
                }
            }
        }
        
        let startMinutes = Math.floor(tran[i].tStartMs / 1000 / 60);
        let startSeconds = Math.trunc((tran[i].tStartMs / 1000) % 60);
        let duration = (tran[i].dDurationMs / 1000).toFixed(2);

        // Format each segment with timestamp and text 
        full_transcript += `<p class="transcript-segment">
            <span class="timestamp">[${startMinutes.toString().padStart(2, '0')}:${startSeconds.toString().padStart(2, '0')}]</span> ${text}
        </p>`;
    }

    let segmentCount = 0;
    full_transcript = full_transcript.replace(/\[(\d+):(\d+)\]/g, (match, minutes, seconds) => {
        segmentCount++;
        if (segmentCount % 2 === 0) {
            return ''; // Remove the timestamp completely
        } else {
            const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
            return `<a href="javascript:void(0)" onclick="(function(e) { e.preventDefault(); console.log('Clicked: ${totalSeconds} seconds'); const vid = document.querySelector('video'); if(vid){vid.currentTime = ${totalSeconds};} else {console.log('anothererror');} return false; })(event)">${match}</a>`;
        }
    });
    // Get the transcript content div (you might need to adjust the selector)
    const transcriptContent = document.querySelector('.main-box-transcript .chat-window-content'); 

    // Clear previous content
    transcriptContent.innerHTML = '';

    // Add video title
    const titleElement = document.createElement('h1');
    titleElement.textContent = video_title;
    transcriptContent.appendChild(titleElement);

    // Add video author
    const authorElement = document.createElement('h2');
    authorElement.textContent = video_author;
    transcriptContent.appendChild(authorElement);

    // Add transcript with formatted segments
    transcriptContent.innerHTML += full_transcript; 
}

/**
 * Another clear chat function? I don't know why there are so many.
 */
function buttonClearChat() {
    const chatWindowContent = document.getElementsByClassName('chat-window-content');
    if (!chatWindowContent) {
        console.error('Chat window content not found');
        return;
    }
    chatWindowContent[0].innerHTML = '';

    
}

fetchTranscript();

let lastUrl = location.href;
let lastId = getVideoId(location.href);
new MutationObserver(() => {
    const url = location.href;
    const id = getVideoId(url);
    if (id !== lastId) {
        //console.log("URL changed");
        lastUrl = url;
        lastId = id;
        window.location.reload();
        fetchTranscript();
        createEventListeners();
    }
}).observe(document, {subtree: true, childList: true});

/**
 * On load adds hello message to chat window. Gets a summary from Gemini and then adds it to the chat window.
 */
function addHelloMessage() {
    if (g_transcript){
        hello = '';
        if (hello_store === '') {
        let tran = g_transcript.transcript.events;
        let full_transcript = '';

        for (let i = 0; i < tran.length; i++) {
            let text = '';
            if (tran[i].segs && Array.isArray(tran[i].segs)) {
                for (let j = 0; j < tran[i].segs.length; j++) {
                    if (tran[i].segs[j].utf8) {
                        text += tran[i].segs[j].utf8;
                    }
                }
            }
            
            let startMinutes = Math.floor(tran[i].tStartMs / 1000 / 60);
            let startSeconds = Math.trunc((tran[i].tStartMs / 1000) % 60);
            let duration = (tran[i].dDurationMs / 1000).toFixed(2);
            
            full_transcript += `Start: {${startMinutes}m ${startSeconds}s} Duration: {${duration}s} text: { ${text}}. `;
        }

        //console.log("Full transcript: " + full_transcript);
        //form prompt
        user_message = "Hi, i just landed on this video, please give me a short 1 sentence summary and tell me another sentence with the most interesting part and tag the timestamp."
        let format_prompt = `
        <system_prompt>You are a Youtube Assistant. Palo, an AI Youtube Assistant. You are always happy to educate about any topic. You were created with the goal to help users with their questions and provide information about the video they are currently viewing.</system_prompt>
        <output_style>You are to output in a friendly conversational manner, don't make your responses too long or short unless explicitly asked. Maybe use an emoji here and there but not every time. As for referencing your responses add in some timestamps. Keep your responses short, in a conversational style, maybe a couple sentence max except for special cases. Also it doesn't just have to be one huge paragraph, you can do new lines for stuff like bullet points but be wary of excess space. Use markdown bold to make the key words stand out in your response. Also ensure to use at minimum 1 emoji.</output_style>
        <timestamp_guide>Cite your sources in your response with start timestamps. When outputting a timestampt to make it linkable output with [mm:ss]. Please output in markdown, except for the time stamps, ensure the have the following format [mm:ss]. Examples of time formatting [00:23] or [03:43].</timestamp_guide>
        <timestamp_formatting>[mm:ss]. When outputting a time make sure its in that format. Although, you should rarely do this, avoid time ranges, just do single times. If you want to do a time range, do not change the format, good example: [12:34]-[12:45].</timestamp_formatting>
        <video_metadata>${g_transcript.metadata.title}. By: ${g_transcript.metadata.author}.</video_metadata>
        <video_transcript>${full_transcript}</video_transcript>
        <first_request>${user_message}</hello_welcome>
        **make sure you bold the key words in your response.**
        `;
        //console.log("prompting")
        prompt(format_prompt).then((response) => {
            //console.log("hellomessage:" + response);
            hello = response;
            //console.log("hello:" + hello)
            hello = hello.replace(/\[(\d+):(\d+)\]/g, (match, minutes, seconds) => {
                const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
                const url = `https://www.youtube.com/watch?v=${getVideoId(window.location.href)}&t=${totalSeconds}s`;
                return `<a href="javascript:void(0)" class="message-timestamp" onclick="(function(e) { e.preventDefault(); console.log('Clicked: ${totalSeconds} seconds'); const vid = document.querySelector('video'); if(vid){vid.currentTime = ${totalSeconds};} else {console.log('anothererror');} return false; })(event)">${match}</a>`;
            });
            
        

        hello = hello
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  
            .replace(/\*(.*?)\*/g, '<em>$1</em>')              
            .replace(/\n/g, '<br>')        
                              

        const assistantMessageElement = document.createElement('div');

        clearChat();
        assistantMessageElement.classList.add('chat-message');
        assistantMessageElement.classList.add('assistant');
        assistantMessageElement.innerHTML = `<div class="message-header">Assistant:</div><div class="message-content">${hello}</div>`;
        const chatWindowContent = document.getElementsByClassName('chat-window-content');
        chatWindowContent[0].appendChild(assistantMessageElement);
        hello_store = hello;
        });
        } else {
            hello = hello_store;
            const assistantMessageElement = document.createElement('div');

            clearChat();
            assistantMessageElement.classList.add('chat-message');
            assistantMessageElement.classList.add('assistant');
            assistantMessageElement.innerHTML = `<div class="message-header">Assistant:</div><div class="message-content">${hello}</div>`;
            const chatWindowContent = document.getElementsByClassName('chat-window-content');
            chatWindowContent[0].appendChild(assistantMessageElement); 
        } 
    }
}

/**
 * Someone's awesome code, fetches transcript directly from youtube. No api borrowing.
 */
function gapt() {
    //console.log("getandprint")
    const videoId = new URLSearchParams(window.location.search).get('v');
    const YT_INITIAL_PLAYER_RESPONSE_RE =
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/;
    let player = window.ytInitialPlayerResponse;
    if (!player || videoID !== player.videoDetails.videoId) {
      fetch('https://www.youtube.com/watch?v=' + videoId)
        .then(function (response) {
          console.log('response', response);
          return response.text();
        })
        .then(function (body) {
          const playerResponse = body.match(YT_INITIAL_PLAYER_RESPONSE_RE);
          if (!playerResponse) {
            console.warn('Unable to parse playerResponse');
            return;
          }
          let metadata = {};
          player = JSON.parse(playerResponse[1]);
          const playerTitle = player.videoDetails.title;
          if (playerTitle) {
            metadata = {
                title: player.videoDetails.title,
                duration: player.videoDetails.lengthSeconds,
                author: player.videoDetails.author,
                views: player.videoDetails.viewCount,
              };
          } else {
            console.log('Title not found');
            metadata = {
            title: "Title not found",
            duration: player.videoDetails.lengthSeconds,
            author: player.videoDetails.author,
            views: player.videoDetails.viewCount,
          };
        }
          // Get the tracks and sort them by priority
          //console.log(`player: ${player}`);
          //console.log(`captions: ${player.captions}`);
          //console.log(`playerCaptionsTracklistRenderer: ${player.captions.playerCaptionsTracklistRenderer}`);
          //console.log(`captionTracks: ${player.captions.playerCaptionsTracklistRenderer.captionTracks}`);
          try {
            const tracks = player.captions.playerCaptionsTracklistRenderer.captionTracks;
          } catch {
            console.log('Error Fetching Transcript')
            insertErrorBox();
          }
          //console.log(`tracks: ${tracks}`); 
          const tracks = player.captions.playerCaptionsTracklistRenderer.captionTracks;
          //console.log('TRACKS', tracks);
          tracks.sort(compareTracks);
  
          // Get the transcript
          fetch(tracks[0].baseUrl + '&fmt=json3')
            .then(function (response) {
              return response.json();
            })
            .then(function (transcript) {
              //console.log('TRANSCRIPT', transcript);
              const result = { transcript: transcript, metadata: metadata };
              //console.log('RESULT', result);
              //console.log("setting transcript to result")
              g_transcript = result; 
              createExtensionBox();
            });
        });
    }
  }
  
/**
 * Helper function from gapt. 
 * @param track1 - Used to sort by language code and kind.
 * @param track2 - Used to sort by language code and kind.
 */
function compareTracks(track1, track2) {
    const langCode1 = track1.languageCode;
    const langCode2 = track2.languageCode;
  
    if (langCode1 === 'en' && langCode2 !== 'en') {
      return -1; // English comes first
    } else if (langCode1 !== 'en' && langCode2 === 'en') {
      return 1; // English comes first
    } else if (track1.kind !== 'asr' && track2.kind === 'asr') {
      return -1; // Non-ASR comes first
    } else if (track1.kind === 'asr' && track2.kind !== 'asr') {
      return 1; // Non-ASR comes first
    }
  
    return 0; // Preserve order if both have same priority
}
  

/**
 * Insert separate focus button. Hides unimportant youtube elements.
 */
function insertFocusButton() {
    console.log('insert within insert focus button');
    let already_exists = document.getElementById('focus-button-container');
    console.log('already exists:', already_exists);
    if (already_exists) {
        return;
    }
    console.log("inserting focus button");
    const button_container = document.querySelector('ytd-menu-renderer.style-scope.ytd-watch-metadata[menu-active]');

    // Create styles
    const style = document.createElement('style');
    style.textContent = `
        #focus-button-container {
            margin-left: auto; /* Aligns to the right */
            margin-right: 8px;
            display: flex;
            align-items: center;
        }
        #focus-button {
            background: var(--primary-color-ext);
            color: var(--focus-button-text);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 18px;
            padding: 10px 20px;
            cursor: pointer;
            font-family: 'Roboto', sans-serif;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            position: relative;
            overflow: hidden;
        }
        #focus-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
            transition: opacity 0.3s ease;
        }
        #focus-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        #focus-button:hover::before {
            opacity: 0.6;
        }
        #focus-button:active {
            transform: translateY(1px);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
    `;
    chrome.storage.sync.get(['theme'], function(data) {
        if (data.theme) {
            document.documentElement.setAttribute('data-theme', data.theme);
        } else {
            // Default to light theme if no theme is saved
            document.documentElement.setAttribute('data-theme', 'default');
        }
    });
    chrome.storage.sync.get(['mode'], function(data) {
        if (data.mode) {
            document.documentElement.setAttribute('data-mode', data.mode);
        } else {
            document.documentElement.setAttribute('data-mode', 'light');
        }
    });
    console.log('theme fetched');
    document.head.appendChild(style);

    // Create button container and HTML content
    const buttonWrapper = document.createElement('div');
    buttonWrapper.id = 'focus-button-container';

    buttonWrapper.innerHTML = `
        <button id="focus-button" class="yt-spec-button-shape-next yt-spec-button-shape-next--filled">
            <div class="yt-spec-button-shape-next__button-text-content">
                <span>Focus</span>
            </div>
        </button>
    `;

    console.log('inserting buttton')
    // Insert at beginning of container
    button_container.insertBefore(buttonWrapper, button_container.firstChild);
    function toggleFocus() {
        const contents = document.getElementById('related');
        console.log(contents);
        console.log(contents.firstChild)
        const elements_to_toggle = [
            document.getElementById('chips'),
            contents,
            document.getElementById('sections'),
            document.getElementById('companion'),
            document.getElementById('items'),
            document.getElementById('start'),
            document.getElementById('panels'),
            document.getElementById('buttons')
        ];
     
        elements_to_toggle.forEach(element => {
            if (!element) {
                console.log(`Element not found: ${element.id}`);
                return;
            }
     
            if (element.style.display === 'none') {
                // Show element
                element.style.display = element.dataset.originalDisplay || 'block';
            } else {
                // Store original display value before hiding
                element.dataset.originalDisplay = window.getComputedStyle(element).display;
                // Hide element
                element.style.display = 'none';
            }
        });
     }

    // Add event listener
    const focusButton = document.getElementById('focus-button');
    focusButton.addEventListener('click', () => {
        console.log("focus button clicked");
        toggleFocus();
    });

    console.log("focus button added");
    insertSpeedToggleButton();
}

/**
 * Fetch speed key. Prompts gemini kinda iffy on accuracy.
 */
async function fetchSpeedKey() {
    let tran = g_transcript.transcript.events;
    let full_transcript = '';

    for (let i = 0; i < tran.length; i++) {
        let text = '';
        if (tran[i].segs && Array.isArray(tran[i].segs)) {
            for (let j = 0; j < tran[i].segs.length; j++) {
                if (tran[i].segs[j].utf8) {
                    text += tran[i].segs[j].utf8;
                }
            }
        }
        
        let startSeconds = Math.trunc((tran[i].tStartMs / 1000));
        let duration = (tran[i].dDurationMs / 1000).toFixed(2);
        
        full_transcript += `Start: { ${startSeconds}s} Duration: {${duration}s} text: { ${text}}. `;
    }
    
    let request = `let format_prompt = 
        <system_prompt>You are a Youtube Analysis Assistant and love to assist users in educating their curious brains. You are currently a smart speed outputter so you are to only output in the requested format.</system_prompt>
        <smart_speed_info>Smart speed relies on your response matching the following format so that the video can automatically speed up(1.5x unimportant parts or lengthy sections) and 1x for important or key parts. You are to not change the speed too often as this would be jarring for the viewer. Speed through useless parts like make sure to like and subscribe, but regular speed for key points the user came to this video to see or learn.</smart_speed_info>
        <output_style>An array of arrays, single line, \"[[time in seconds, speed], [next change], [next change]\". An example output would be [[5,2],[15,1],[30,2],[35,1]]. Important notes should be regular speed. Extra info should be sped up unless its very important.</output_style>
        <IMPORTANT>DONT JUST SWITCH ON A SPECIFIC INTERVAL, REALLY PAY ATTENTION TO THE CONTEXT, UNIMPORTANT LENGTHY OR GENERIC PARTS SHOULD BE SPED UP and IMPORTANT PARTS SHOULD BE NORMAL SPEED. EXAMPLES OF SPED UP GOOD: HELLO, SUBSCRIBE, surrounding sections. EXAMPLES OF GOOD REGULAR SPEED: Key terms, key points in the video. ADD SOME REGULAR SPEED BUFFER TIME AROUND KEY IDEAS to make the viewing experience more seamless and enjoyable.</IMPORTANT>
        <video_metadata>${g_transcript.metadata.title}. By: ${g_transcript.metadata.author}.</video_metadata>
        <video_transcript>${full_transcript}</video_transcript>
        <output_request>Output the smart speed key for this video with the above context. Simply output the single array, nothing else. Please try to output an array for accurate speed ramping of the entire video. Time in seconds do not have to be flat numbers</output_request>
        `;

        let response = await prompt(request);
        console.log('Response:', response);
        
        // Clean up the response and account for spaces
        let parsedArray = response
            .replace(/\[\[|\]\]/g, '') // remove outer brackets
            .split('],[') // split into individual pairs
            .map(pair => pair.split(',').map(num => Number(num.trim()))); // split each pair, trim spaces, and convert to numbers
        
        console.log(parsedArray);
        

    return parsedArray;
}

/**
 * Inserts speed toggle based on speed key.
 */
function insertSpeedToggleButton() {
    let already_exists = document.getElementById('speed-toggle-container');
    if (already_exists) {
        return;
    }
    console.log("inserting speed toggle button");
    const playlist_container = document.getElementById('chips');
    
    // Create styles
    const style = document.createElement('style');
    style.textContent = `
        #speed-toggle-container {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            margin-bottom: 8px;
        }
        .custom-button {
            margin-right: 8px;
            fill: var(--gray-text-ext); 
            padding: 10px 20px;
            border-radius: 18px;
            cursor: pointer;
            font-family: 'Roboto', sans-serif;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            position: relative;
        }
        #smart-speed-button {
            background-color: var(--background-color-ext);
            padding: 10px 20px;
            margin: 4px;
            color: var(--primary-color-ext);
            border: #00ff00;
        }
        #smart-speed-button.active {
            background-color: var(--primary-color-ext);
            color: white;
        }
        .custom-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        .custom-button:active {
            transform: translateY(1px);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        .loading-spinner {
            display: none;
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 15px;
            height: 15px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #0072ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: translateY(-50%) rotate(0deg); }
            100% { transform: translateY(-50%) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Create button container and HTML content
    const buttonWrapper = document.createElement('div');
    buttonWrapper.id = 'speed-toggle-container';
    buttonWrapper.innerHTML = `
        <button id="smart-speed-button" class="custom-button">
            <span>Smart Speed: Off</span>
            <div class="loading-spinner"></div>
        </button>
    `;
    
    // Insert before the playlist container
    playlist_container.parentNode.insertBefore(buttonWrapper, playlist_container);
    
    // Add event listener
    const smartSpeedButton = document.getElementById('smart-speed-button');
    const loadingSpinner = smartSpeedButton.querySelector('.loading-spinner');
    let smartSpeedActive = false;
    let speedKey = [];
    let currentKeyIndex = 0;
    let speedInterval;

    smartSpeedButton.addEventListener('click', async () => {
        if (smartSpeedActive) {
            // Turn off smart speed
            smartSpeedActive = false;
            console.log("Smart Speed: Off");
            smartSpeedButton.classList.remove('active');
            smartSpeedButton.querySelector('span').textContent = 'Smart Speed: Off';
            if (speedInterval) {
                clearInterval(speedInterval);
            }
            const video = document.querySelector('video');
            video.playbackRate = 1; // Reset to normal speed when turned off
        } else {
            // Turn on smart speed
            loadingSpinner.style.display = 'block';
            smartSpeedButton.disabled = true;
            
            try {
                speedKey = await fetchSpeedKey();
                smartSpeedActive = true;
                console.log("Smart Speed: On");
                smartSpeedButton.classList.add('active');
                smartSpeedButton.querySelector('span').textContent = 'Smart Speed: On';
                
                currentKeyIndex = 0;
                const video = document.querySelector('video');

                speedInterval = setInterval(() => {
                    if (currentKeyIndex < speedKey.length) {
                        const currentTime = Math.floor(video.currentTime);
                        const [targetTime, targetSpeed] = speedKey[currentKeyIndex];

                        if (currentTime >= targetTime) {
                            video.playbackRate = targetSpeed;
                            console.log(`Setting playback speed to ${targetSpeed} at ${currentTime} seconds`);
                            currentKeyIndex++;
                        }
                    } else {
                        clearInterval(speedInterval);
                    }
                }, 1000); // Check every second
            } catch (error) {
                console.error("Error fetching speed key:", error);
                alert("Failed to fetch speed key. Please try again later.");
            } finally {
                loadingSpinner.style.display = 'none';
                smartSpeedButton.disabled = false;
            }
        }
    });
    
    console.log("Speed toggle button added");
}