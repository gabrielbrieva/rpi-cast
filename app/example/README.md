# CastVideosPlaylist-chrome
===============================

This Google Cast demo app shows how to cast a video playlist from a Chrome browser using Cast Chrome Sender SDK. The app uses custom data and a custom namespace channel to add videos to a playlist. The receiver will keep playing videos from the playlist.

## Setup Instructions

# Pre-requisites
1. Get a Chromecast device
2. Install appropriate Chrome browser
3. Install appropriate Chrome Cast extension

See the developer guide and release notes at https://developers.google.com/cast/ for more details.
 
# Steps:
1. Put all the files on your own server
2. Change YOUR_APP_ID to your own in playlist_sender.js
3. Open a browser and point to your page at http://[YOUR_SERVER_LOCATION]/player_playlist_sender.html
4. Click on the "Launch app" button to select a Cast device
5. Click on the "Load media" button to load the first item (Big Buck Bunny) + a playlist with 2 items
6. Click on the "Play" button to start the first video
7. Click on the "Add media to playlist" to add the currently selected media item to the playlist (at the bottom)

##Documentation
* Cast APIs: http://developers.google.com/cast/docs/chrome_sender

## References and How to report bugs
* Cast APIs: http://developers.google.com/cast/docs/reference/chrome
* Design Checklist (http://developers.google.com/cast/docs/design_checklist)
* If you find any issues, please open a bug here on GitHub

How to make contributions?
Please read and follow the steps in the CONTRIBUTING.md

License
See LICENSE.md
