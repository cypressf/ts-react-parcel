import React, { useEffect, Fragment } from 'react'
import { startPage } from 'animated-gif/utils/setupApp'

export const App = () => {
  useEffect(startPage, [])
  return (
    <Fragment>
      <div id="videocontainer" className="fade-out">
        <video muted={true} preload="auto" />
        <video muted={true} preload="auto" />
        <video muted={true} preload="auto" />
        <div id="controls">
          <input
            list="tags"
            autoComplete="off"
            placeholder="Search for other themes"
          />
          <datalist id="tags" />
          <ul id="copyright-tags" className="video-tags" />
          <ul id="artist-tags" className="video-tags" />
          <ul id="character-tags" className="video-tags" />
          <ul id="general-tags" className="video-tags" />
          <ul id="playback-controls">
            <li>
              <button id="previous" type="button">
                <i className="material-icons md-light md-48">skip_previous</i>
              </button>
            </li>
            <li>
              <button id="playpause" type="button">
                <i className="material-icons md-light md-48">pause</i>
              </button>
            </li>
            <li>
              <button id="next" type="button">
                <i className="material-icons md-light md-48">skip_next</i>
              </button>
            </li>
            <li>
              <button id="mute" type="button">
                <i className="material-icons md-light md-48">volume_off</i>
              </button>
            </li>
            <li>
              <button id="fullscreen" type="button">
                <i className="material-icons md-light md-48">fullscreen</i>
              </button>
            </li>
          </ul>
        </div>
      </div>
      <iframe
        id="youtube-player"
        width="0"
        height="0"
        frameBorder="0"
        src="https://www.youtube.com/embed/hHW1oY26kxQ?enablejsapi=1"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      />
    </Fragment>
  )
}
