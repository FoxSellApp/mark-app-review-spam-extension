const authenticateUsingCookies = () => {
    getAndSetCookies('sessionid', 'smoothCodeSessionId')
    getAndSetCookies('csrftoken', 'smoothCodeCSRFToken')
}

const getAndSetCookies = (cookieKey, localStorageKey) => {
    chrome.cookies.get({'url': 'https://hacks.smoothcode.io/reviews/home', 'name': cookieKey}, (cookie) => {
        console.log('cookie')
        if (!cookie){
            chrome.tabs.create({url: 'https://hacks.smoothcode.io/reviews/login'})
        } else {
            chrome.storage.sync.set({[localStorageKey]: cookie.value}, () => {
                console.log(`Cookie: ${localStorageKey} set successfully in storage!`)
            })
        }
    })
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message === 'authenticate') {
        authenticateUsingCookies()
        sendResponse(true)
    }
})
