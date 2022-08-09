const isUserApp = async (appName) => {
    const headers = await getRequestHeaders()
    return fetch(
        `https://hacks.smoothcode.io/reviews/user-application-check/?app_name=${appName}`, {
            method: 'GET',
            headers: headers
        }
    ).then(r => r.status === 200).catch(reason => console.log(reason))
}

const createSpamReview = async (data) => {
    const headers = await getRequestHeaders(true)

    return fetch(
        'https://hacks.smoothcode.io/reviews/add-spam-review/', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                review_id: data.id,
                review_rating: data.rating,
                review_content: data.content,
                review_shop: data.shop,
                review_posted_on: new Date(data.postedOn).toISOString().split('T')[0],
                app_name: getAppName()
            })
        }
    ).then(r => {
        showToast('Review marked as spam')
    })
}

const getTokenAndSession = async () => {
    let csrfPromise = new Promise((resolve, reject) => {
        chrome.storage.sync.get('smoothCodeCSRFToken', (result) => resolve(result['smoothCodeCSRFToken']))
    })
    let sessionPromise = new Promise((resolve, reject) => {
        chrome.storage.sync.get('smoothCodeSessionId', (result) => resolve(result['smoothCodeSessionId']))
    })

    const csrfToken = await csrfPromise;
    const sessionId = await sessionPromise;

    return {
        csrfToken: csrfToken,
        sessionId: sessionId
    }
}

const getRequestHeaders = async (isPost=false) => {
    const tokens = await getTokenAndSession()

    let headers = {
        "authorization": `csrftoken=${tokens.csrfToken}; sessionid=${tokens.sessionId}`,
        "content-type": 'application/json'
    }
    if (isPost) {
        headers['x-csrftoken'] = tokens.csrfToken
    }

    return headers
}


const getAppName = () => {
    return document.getElementsByClassName('vc-app-listing-hero__heading')[0].textContent.trim()
}

const shouldShowSpamButton = async () => {
    const appName = getAppName()
    return await isUserApp(appName)
}

const getReview = (review) => {
    if (review.childNodes[5].textContent.trim().split('\n')[0] === 'Location'){
        return getLocationReview(review)
    }

    const ratingDiv = review.childNodes[3].textContent.trim().split('\n')

    return {
        id: review.dataset.reviewId,
        shop: review.childNodes[1].textContent.trim(),
        rating: ratingDiv[3].trim()[0],
        postedOn: ratingDiv[ratingDiv.length - 1].trim(),
        content: review.childNodes[5].textContent.trim().split('\n')[0].trim()
    }
}

const getLocationReview = (review) => {
    const ratingDiv = review.childNodes[1].textContent.trim().split('\n')

    return {
        id: review.dataset.reviewId,
        shop: review.childNodes[3].textContent.trim(),
        rating: ratingDiv[0].split(' ')[0],
        postedOn: ratingDiv[ratingDiv.length - 1].trim(),
        content: review.childNodes[7].textContent.trim().split('\n')[0].trim(),
        location: review.childNodes[5].textContent.trim().split('\n')[3].trim()
    }
}

const getReviewById = (reviewId) => {
    const review = document.querySelectorAll(`[data-review-id="${reviewId}"]`)
    return getReview(review[0])
}

const addSpamReview = async (event) => {
    const review = getReviewById(event.target.dataset.shopifyReviewId)
    await createSpamReview(review)
}

const getSpamNode = (footer) => {
    const reviewId = footer.previousElementSibling.dataset['reviewId']

    const spamNode = document.createElement('div')
    const spamButton = document.createElement('button')

    spamNode.classList.add('review-helpfulness')
    spamButton.innerText = '(x) Mark as Spam'
    spamButton.dataset['shopifyReviewId'] = reviewId
    spamButton.addEventListener('click', addSpamReview)

    // CSS
    spamButton.style.color = '#030521'
    spamButton.style.paddingRight = '10px'
    spamButton.style.textDecoration = 'underline'

    spamNode.appendChild(spamButton)

    return spamNode
}

const addSpamButtons = async () => {
    if(await shouldShowSpamButton()){
        const truncatedReviews = document.getElementsByClassName('truncate-content-toggle')
        for (let truncatedReview of truncatedReviews) truncatedReview.click()

        const reviewFooters = document.getElementsByClassName('review-footer')
        for (let footer of reviewFooters) footer.insertBefore(getSpamNode(footer), footer.children[0])
    }
}

const showToast = (message) => {
    const div = document.createElement('div')
    div.id = 'snackbar'
    div.innerText = message
    div.classList.add('show')
    document.body.appendChild(div)

    setTimeout(() => {
        div.remove()
    }, 3000)
}

console.log('SmoothCode is Loaded!')
chrome.runtime.sendMessage('authenticate', async (response) => {
    if (response)
        await addSpamButtons()
})


