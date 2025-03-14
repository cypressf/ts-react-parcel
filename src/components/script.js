let videoContainer = null;
let fullscreenButton = null;
let playpauseButton = null;
let nextButton = null;
let previousButton = null;
let controls = null;
let playPauseIcon = null;
let fullscreenIcon = null;
let muteIcon = null;
let input = null;
let tagsDatalist = null;
let generalTagsList = null;
let characterTagsList = null;
let artistTagsList = null;
let copyrightTagsList = null;
let muteButton = null;
const tagsToExclude = ["animated", "artist_unknown", "presumed"];

const PREVIOUS = 0;
const CURRENT = 1;
const NEXT = 2;
const PLAYING = 1;
const GENERAL = 0;
const ARTIST = 1;
const COPYRIGHT = 3;
const CHARACTER = 4;

let videos;
let videoPlayers;
const videoData = [null, null, null];
const videoIndexes = [null, null, null];

let tagsByName = new Map();
let playlist = [];
let currentTag = null;
let skipNextPlayPause = false;
let musicPlayer;
let muted = true;

let controlsHovered;


Array.prototype.rotate = function (n) {
    while (this.length && n < 0) n += this.length;
    this.push.apply(this, this.splice(0, n));
    return this;
}

function playPlaylist(tag, videoId) {
    currentTag = tag;
    var count;
    if (!tag) {
        count = 50000;
    } else {
        count = tagsByName.get(tag).count;
        saveTagToUrl(currentTag);
    }
    playlist = shuffle(Array.from(Array(count).keys())
        .map(n => ++n));

    videoIndexes[NEXT] = 0;

    const videoDataPromise = videoId ? fetchVideoDataById(videoId) : fetchVideoData(videoIndexes[NEXT], 1);
    videoDataPromise
        .then(data => {
            videoIndexes[NEXT] = data.index;
            preloadVideo(data.video, NEXT);
        })
        .then(playNextPreloadedVideo);
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function shiftIndex(index, offset) {
    // increase or decrease index with wraparound
    return (index + offset + playlist.length) % playlist.length;
}

async function fetchVideoData(index, direction) {
    var url = '/api/post.json?limit=1&page=' + playlist[index];
    if (currentTag) {
        url = url + '&tags=' + useUnderscores(currentTag);
    }

    return fetchNextValidVideoData(url, index, direction);
}

async function fetchVideoDataById(videoId) {
    var url = '/api/post.json?tags=id:' + videoId;
    return fetchNextValidVideoData(url, 1, 1);
}

async function fetchNextValidVideoData(url, index, direction) {
    const response = await fetch(url);
    const videos = await response.json();
    const video = videos[0];

    if (videoIsValid(video)) {
        return { video: video, index: index };
    } else {
        return fetchVideoData(shiftIndex(index, direction), direction);
    }
}

function videoIsValid(video) {
    return video
        && video.file_url
        && (video.file_ext === "mp4" || video.file_ext === "webm")
        && video.id;
}

function tagIsValid(tag) {
    return tagsByName.has(tag)
}

function showPauseIcon() {
    playPauseIcon.innerHTML = "pause";
}

function showPlayIcon() {
    playPauseIcon.innerHTML = "play_arrow";
}

function toggleControlsOnTouch(event) {
    toggleControls();
    if (event.target === videoPlayers[CURRENT]) {
        event.preventDefault();
    }
}

function toggleMute() {
    muted = !muted;
    if (muted) {
        musicPlayer.pauseVideo();
        muteIcon.innerHTML = 'volume_off';
    } else {
        musicPlayer.playVideo();
        muteIcon.innerHTML = 'volume_up';
    }
}

function togglePause() {
    if (skipNextPlayPause) {
        skipNextPlayPause = false;
        return;
    }
    if (videoPlayers[CURRENT].paused || videoPlayers[CURRENT].ended) {
        videoPlayers[CURRENT].play();
        if (!muted) {
            musicPlayer.playVideo();
        }
    } else {
        videoPlayers[CURRENT].pause();
        musicPlayer.pauseVideo();
    }
}

function playNextPreloadedVideo() {
    playPreloadedVideo(1);
}

function playPreviousPreloadedVideo() {
    playPreloadedVideo(-1);
}

function playPreloadedVideo(direction) {
    const nextVideoIndexToPreload = CURRENT + direction;
    const previouslyPlayingVideo = videoPlayers[CURRENT];

    if (videoData[nextVideoIndexToPreload] === null) {
        return;
    }
    videoData.rotate(direction);
    videoPlayers.rotate(direction);
    videoIndexes.rotate(direction);

    videoData[nextVideoIndexToPreload] = null;
    videoIndexes[nextVideoIndexToPreload] = shiftIndex(videoIndexes[CURRENT], direction);

    removeVideoEventListeners(previouslyPlayingVideo);
    addVideoEventListeners(videoPlayers[CURRENT]);

    removeClass(previouslyPlayingVideo, "active");
    addClass(videoPlayers[CURRENT], "active");

    previouslyPlayingVideo.pause();
    previouslyPlayingVideo.currentTime = 0;
    playVideo();
    fetchVideoData(videoIndexes[nextVideoIndexToPreload], direction).then(data => {
        videoIndexes[nextVideoIndexToPreload] = data.index;
        preloadVideo(data.video, nextVideoIndexToPreload);
    });
}

function removeClass(element, cssClass) {
    if (element.classList.contains(cssClass)) {
        element.classList.remove(cssClass);
    }
}

function addClass(element, cssClass) {
    if (!element.classList.contains(cssClass)) {
        element.classList.add(cssClass);
    }
}

function preloadVideo(video, index) {
    videoData[index] = video;
    videoPlayers[index].src = video.file_url;
}

function playVideo() {
    addVideoTagsToUi(videoData[CURRENT].tags.split(" "));
    saveVideoIdToUrl(videoData[CURRENT]);
    videoPlayers[CURRENT].play();
}

function addVideoTagsToUi(tags) {
    var tags = tags.map(makeReadable);

    const artistTags = tags.filter(isTagType(ARTIST));
    const generalTags = tags.filter(isTagType(GENERAL));
    const copyrightTags = tags.filter(isTagType(COPYRIGHT));
    const characterTags = tags.filter(isTagType(CHARACTER));

    generalTagsList.innerHTML = generateTagsHtml(generalTags);
    artistTagsList.innerHTML = generateTagsHtml(artistTags);
    copyrightTagsList.innerHTML = generateTagsHtml(copyrightTags);
    characterTagsList.innerHTML = generateTagsHtml(characterTags);
}

function generateTagsHtml(tags) {
    var tagsHtml = "";

    for (let tag of tags) {
        if (tagIsValid(tag)) {
            tagsHtml = tagsHtml + "<li><a ";
            if (currentTag === tag) {
                tagsHtml = tagsHtml + "class=\"current-tag\" ";
            }
            tagsHtml = tagsHtml + "href=\"?tag=" + tag + "\">" + tag + "</a></li>"
        }
    }
    return tagsHtml
}

function isTagType(tagType) {
    return (tagName) => {
        const tag = tagsByName.get(tagName);
        return tag && tag.type === tagType;
    }
}

var isFullScreen = function () {
    return !!(document.fullScreen || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement || document.fullscreenElement);
}
var setFullscreenData = function (state) {
    videoContainer.setAttribute('data-fullscreen', !!state);
    fullscreenIcon.innerHTML = state ? 'fullscreen_exit' : 'fullscreen';
}
var handleFullscreen = function () {
    if (isFullScreen()) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
        setFullscreenData(false);
    }
    else {
        if (videoContainer.requestFullscreen) videoContainer.requestFullscreen();
        else if (videoContainer.mozRequestFullScreen) videoContainer.mozRequestFullScreen();
        else if (videoContainer.webkitRequestFullScreen) videoContainer.webkitRequestFullScreen();
        else if (videoContainer.msRequestFullscreen) videoContainer.msRequestFullscreen();
        setFullscreenData(true);
    }
}

function tagClicked(event) {
    const node = event.target
    if (node.tagName === "A") {
        event.preventDefault();
        const tag = parseTagFromQueryParams(node.getAttribute("href"));
        if (currentTag !== tag) {
            setCurrentTag(tag);
        } else {
            clearCurrentTag();
        }
    }
}

function removeVideoEventListeners(videoElement) {
    videoElement.removeEventListener('touchstart', toggleControlsOnTouch);
    videoElement.removeEventListener('click', togglePause);
    videoElement.removeEventListener('mousedown', preventNextPlayPause);
    videoElement.removeEventListener('ended', playNextPreloadedVideo);
    videoElement.removeEventListener('play', showPauseIcon);
    videoElement.removeEventListener('pause', showPlayIcon);
}

function addVideoEventListeners(videoElement) {
    videoElement.addEventListener('touchstart', toggleControlsOnTouch);
    videoElement.addEventListener('click', togglePause);
    videoElement.addEventListener('mousedown', preventNextPlayPause);
    videoElement.addEventListener('ended', playNextPreloadedVideo);
    videoElement.addEventListener('play', showPauseIcon);
    videoElement.addEventListener('pause', showPlayIcon);
}

function tagSearchActive() {
    return document.activeElement === input;
}

function hideControlsTimeout() {
    return controlsHovered ? 3500 : 500;
}

async function getTags() {
    const response = await fetch('/api/tag.json?limit=1500&order=count');
    return await response.json();
}

function putTagsInForm(tags) {
    var innerString = '';
    for (let tag of tags) {
        innerString = innerString + "<option>" + tag + "</option>";
    }
    tagsDatalist.innerHTML = innerString;
}

function preventNextPlayPause() {
    if (tagSearchActive()) {
        skipNextPlayPause = true;
    }
}

function setCurrentTag(tag) {
    if (tag && tag !== currentTag) {
        playPlaylist(tag, null);
    }
}

function clearCurrentTag() {
    if (currentTag) {
        playPlaylist(null, null);
    }
}

function toggleControls() {
    if (controlsHidden()) {
        showControls();
    } else {
        hideControls();
    }
}

function controlsHidden() {
    return videoContainer.classList.contains('fade-out');
}

function showControls() {
    if (controlsHidden()) {
        videoContainer.classList.remove('fade-out');
    }
}

function hideControls() {
    if (!controlsHidden()) {
        videoContainer.classList.add('fade-out');
    }
}

function useUnderscores(tag) {
    return tag.split(" ").join("_");
}

function makeReadable(tag) {
    return tag.split("_").join(" ");
}

function saveTagToUrl(tag) {
    if (tag !== parseTagFromUrl()) {
        history.pushState({ tag: tag }, tag + " videos", "?tag=" + encodeURIComponent(useUnderscores(tag)))
    }
}

function saveVideoIdToUrl(video) {
    const tag = new URLSearchParams(window.location.search).get("tag");
    var queryParams = "?video=" + video.id;
    if (tag) {
        queryParams += "&tag=" + tag;
    }
    history.replaceState(history.state, tag + " videos", queryParams);
}

function parseTagFromUrl() {
    return parseTagFromQueryParams(window.location.search);
}

function parseTagFromQueryParams(queryParams) {
    const encodedTag = new URLSearchParams(queryParams).get("tag");
    if (encodedTag) {
        return makeReadable(decodeURIComponent(encodedTag));
    } else {
        return null;
    }
}

function parseVideoIdFromUrl() {
    const videoId = new URLSearchParams(window.location.search).get("video");
    return videoId ? videoId : null;
}

function putTagsInUi(tags) {
    tagsByName = new Map(tags
        .filter(shouldIncludeTag)
        .map(tag => [makeReadable(tag.name), tag]));
    putTagsInForm(tagsByName.keys());
}

function shouldIncludeTag(tag) {
    return !tagsToExclude.includes(tag.name);
}

function setupMusic() {
    var youtubeScriptTag = document.createElement('script');
    youtubeScriptTag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(youtubeScriptTag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => {
        musicPlayer = new YT.Player('youtube-player');
    }
}

export function startPage() {
    setupMusic();
    videoContainer = document.querySelector('#videocontainer');
    fullscreenButton = document.querySelector('#fullscreen');
    playpauseButton = document.querySelector('#playpause');
    nextButton = document.querySelector('#next');
    previousButton = document.querySelector('#previous');
    controls = document.querySelector('#controls');
    playPauseIcon = document.querySelector('#playpause i');
    fullscreenIcon = document.querySelector('#fullscreen i');
    muteIcon = document.querySelector('#mute i');
    input = document.querySelector('input');
    tagsDatalist = document.querySelector('#tags');
    generalTagsList = document.querySelector('#general-tags');
    characterTagsList = document.querySelector('#character-tags');
    artistTagsList = document.querySelector('#artist-tags');
    copyrightTagsList = document.querySelector('#copyright-tags');
    muteButton = document.querySelector('#mute');
    videos = document.querySelectorAll('video');
    videoPlayers = [videos[PREVIOUS], videos[CURRENT], videos[NEXT]];
    musicPlayer = musicPlayer;

    addClass(videoPlayers[CURRENT], "active");
    addVideoEventListeners(videoPlayers[CURRENT]);
    const tag = parseTagFromUrl();
    const videoId = parseVideoIdFromUrl();

    document.addEventListener('fullscreenchange', (e) =>
        setFullscreenData(!!(document.fullScreen || document.fullscreenElement))
    );
    document.addEventListener('webkitfullscreenchange', () =>
        setFullscreenData(!!document.webkitIsFullScreen)
    );
    document.addEventListener('mozfullscreenchange', () =>
        setFullscreenData(!!document.mozFullScreen)
    );
    document.addEventListener('msfullscreenchange', () =>
        setFullscreenData(!!document.msFullscreenElement)
    );
    fullscreenButton.addEventListener('click', handleFullscreen);
    playpauseButton.addEventListener('click', togglePause);
    nextButton.addEventListener('click', playNextPreloadedVideo);
    previousButton.addEventListener('click', playPreviousPreloadedVideo);
    muteButton.addEventListener('click', toggleMute);
    generalTagsList.addEventListener('click', tagClicked);
    artistTagsList.addEventListener('click', tagClicked);
    copyrightTagsList.addEventListener('click', tagClicked);
    characterTagsList.addEventListener('click', tagClicked);

    let fullScreenEnabled = !!(document.fullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled || document.webkitSupportsFullscreen || document.webkitFullscreenEnabled || document.createElement('video').webkitRequestFullScreen);
    let userActivity;
    let inactivityTimeout
    if (!fullScreenEnabled) {
        fullscreenButton.style.display = 'none';
    }

    videoContainer.addEventListener('mousemove', event => userActivity = true);
    controls.addEventListener('click', event => userActivity = true);
    setInterval(() => {
        if (userActivity) {
            userActivity = false;
            showControls();

            // Clear any existing inactivity timeout to start the timer over
            clearTimeout(inactivityTimeout);

            // In X seconds, if no more activity has occurred 
            // the user will be considered inactive
            inactivityTimeout = setTimeout(() => {
                // Protect against the case where the inactivity timeout can trigger
                // before the next user activity is picked up  by the 
                // activityCheck loop.
                if (!userActivity && !tagSearchActive()) {
                    hideControls();
                }
            }, hideControlsTimeout());
        }
    }, 250);

    controls.addEventListener('mouseenter', () => {
        controlsHovered = true;
    });

    controls.addEventListener('mouseleave', () => {
        controlsHovered = false;
    })

    input.addEventListener('input', () => {
        const tag = input.value;
        if (tagIsValid(tag)) {
            playPlaylist(tag, null);
        }
    });
    input.addEventListener("keyup", event => {
        if (event.key === "Enter") {
            input.blur();
        }
    });
    input.addEventListener("blur", event => {
        hideControls();
        input.value = "";
    });

    window.addEventListener("keyup", event => {
        if (event.target === input) {
            return;
        }
        if (event.key === "ArrowRight") {
            playNextPreloadedVideo();
        }
        if (event.key === "ArrowLeft") {
            playPreviousPreloadedVideo();
        }
        if (event.key === " ") {
            togglePause();
        }
    });
    window.addEventListener("popstate", event => {
        setCurrentTag(event.state.tag);
    });

    if (tag) {
        history.replaceState({ tag: tag }, null);
    }
    const tagsSavedFuture = getTags().then(tags => {
        localStorage.setItem("tags", JSON.stringify(tags));
        putTagsInUi(tags);
    });
    const cachedTags = JSON.parse(localStorage.getItem("tags"));
    if (cachedTags) {
        putTagsInUi(cachedTags);
        playPlaylist(tag, videoId);
    } else {
        tagsSavedFuture.then(() => playPlaylist(tag, videoId));
    }
}