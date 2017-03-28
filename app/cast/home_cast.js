'use strict';

/** @const {number} Time in milliseconds for minimal progress update */
var TIMER_STEP = 1000;

/** @const {number} Cast volume upon initial connection */
var DEFAULT_VOLUME = 0.5;

/** @const {number} Height, in pixels, of volume bar */
var FULL_VOLUME_HEIGHT = 100;

/**
 * Constants of states for media playback
 * @enum {string}
 */
var PLAYER_STATE = {
    IDLE: 'IDLE',
    LOADING: 'LOADING',
    LOADED: 'LOADED',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    STOPPED: 'STOPPED',
    ERROR: 'ERROR'
};

var HomeCastSender = function (castAppConfig) {
    this.namespace = castAppConfig.namespace;
    this.appId = castAppConfig.appId;
    
    /** @type {PlayerHandler} Delegation proxy for media playback */
    this.playerHandler = new PlayerHandler(this);
    
    /** @type {PLAYER_STATE} A state for media playback */
    this.playerState = PLAYER_STATE.IDLE;
    
    /* Cast player variables */
    /** @type {cast.framework.RemotePlayer} */
    this.remotePlayer = null;
    /** @type {cast.framework.RemotePlayerController} */
    this.remotePlayerController = null;
    
    /* Current media variables */
    /** @type {number} A number for current media time */
    this.currentMediaTime = 0;
    /** @type {number} A number for current media duration */
    this.currentMediaDuration = -1;
    /** @type {?number} A timer for tracking progress of media */
    this.timer = null;
    
    this.currentMedia = null;
    
    /** @type {function()} */
    this.incrementMediaTimeHandler = this.incrementMediaTime.bind(this);
    
    this.setupLocalPlayer();
};

// funcion para inicializar el API de Google Cast
HomeCastSender.prototype.Init = function () {

    // cuando la api de Google Cast se termina de cargar
    // inicializamos el API de Google Cast.

    var options = {
        receiverApplicationId: this.appId,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    };

    cast.framework.CastContext.getInstance().setOptions(options);
    
    this.remotePlayer = new cast.framework.RemotePlayer();
    this.remotePlayerController = new cast.framework.RemotePlayerController(this.remotePlayer);
    
    this.remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
        this.switchPlayer.bind(this)
    );

//        window['__onGCastApiAvailable'] = function (loaded, errorInfo) {
//            if (loaded) {
//                // solicitamos una sesion utilizando el Application ID
//                var sessionRequest = new chrome.cast.SessionRequest(that.appId);
//
//                // indicamos el listener de la session y del receiver
//                // al crear una instancia de ApiConfig
//                var apiConfig = new chrome.cast.ApiConfig(sessionRequest, that.sessionListener.bind(that), that.receiverListener.bind(that));
//
//                // inicializamos el API de Google Cast usando los listener anteriores y la sesion
//                // indicando los manejadores en caso de exito y error.
//                chrome.cast.initialize(apiConfig, that.onInitSuccess.bind(that), that.onError.bind(that));
//            } else {
//                console.log(errorInfo);
//            }
//        };

    return this;
};

/*
 * PlayerHandler and setup functions
 */

HomeCastSender.prototype.switchPlayer = function() {
    //this.stopProgressTimer();
    //this.resetVolumeSlider();
    this.playerHandler.stop();
    this.playerState = PLAYER_STATE.IDLE;
    
    if (cast && cast.framework) {
        
        console.log("Remote Player connection status: " + (this.remotePlayer.isConnected ? "connected" : "disconnected"));
        
        if (this.remotePlayer.isConnected) {
            this.setupRemotePlayer();
            
            return;
        }
    }
    
    this.setupLocalPlayer();
};

/**
 * PlayerHandler
 *
 * This is a handler through which the application will interact
 * with both the RemotePlayer and LocalPlayer. Combining these two into
 * one interface is one approach to the dual-player nature of a Cast
 * Chrome application. Otherwise, the state of the RemotePlayer can be
 * queried at any time to decide whether to interact with the local
 * or remote players.
 *
 * To set the player used, implement the following methods for a target object
 * and call setTarget(target).
 *
 * Methods to implement:
 *  - play()
 *  - pause()
 *  - stop()
 *  - seekTo(time)
 *  - load(mediaIndex)
 *  - getMediaDuration()
 *  - getCurrentMediaTime()
 *  - setVolume(volumeSliderPosition)
 *  - mute()
 *  - unMute()
 *  - isMuted()
 *  - updateDisplayMessage()
 */
var PlayerHandler = function(castPlayer) {
    this.target = {};

    this.setTarget= function(target) {
        this.target = target;
    };

    this.play = function() {
        if (castPlayer.playerState !== PLAYER_STATE.PLAYING &&
            castPlayer.playerState !== PLAYER_STATE.PAUSED &&
            castPlayer.playerState !== PLAYER_STATE.LOADED) {
            this.load(castPlayer.currentMediaIndex);
            return;
        }

        this.target.play();
        castPlayer.playerState = PLAYER_STATE.PLAYING;
//        document.getElementById('play').style.display = 'none';
//        document.getElementById('pause').style.display = 'block';
        this.updateDisplayMessage();
    };

    this.pause = function() {
        if (castPlayer.playerState !== PLAYER_STATE.PLAYING) {
            return;
        }

        this.target.pause();
        castPlayer.playerState = PLAYER_STATE.PAUSED;
//        document.getElementById('play').style.display = 'block';
//        document.getElementById('pause').style.display = 'none';
        this.updateDisplayMessage();
    };

    this.stop = function() {
        this.pause();
        castPlayer.playerState = PLAYER_STATE.STOPPED;
        this.updateDisplayMessage();
    };

    this.load = function(f) {
        castPlayer.playerState = PLAYER_STATE.LOADING;

//        document.getElementById('media_title').innerHTML = f.name;
//        document.getElementById('media_subtitle').innerHTML = "subtitles....";
//        document.getElementById('media_desc').innerHTML = "desc...";

        this.target.load(f);
        this.updateDisplayMessage();
    };

    this.loaded = function() {
        castPlayer.currentMediaDuration = this.getMediaDuration();
        castPlayer.updateMediaDuration();
        castPlayer.playerState = PLAYER_STATE.LOADED;
        
        if (castPlayer.currentMediaTime > 0) {
            this.seekTo(castPlayer.currentMediaTime);
        }
        
        this.play();
        castPlayer.startProgressTimer();
        this.updateDisplayMessage();
    };

    this.getCurrentMediaTime = function() {
        return this.target.getCurrentMediaTime();
    };

    this.getMediaDuration = function() {
        return this.target.getMediaDuration();
    };

    this.updateDisplayMessage = function () {
        this.target.updateDisplayMessage();
    }
;
    this.setVolume = function(volumeSliderPosition) {
        this.target.setVolume(volumeSliderPosition);
    };

    this.mute = function() {
        this.target.mute();
//        document.getElementById('audio_on').style.display = 'none';
//        document.getElementById('audio_off').style.display = 'block';
    };

    this.unMute = function() {
        this.target.unMute();
//        document.getElementById('audio_on').style.display = 'block';
//        document.getElementById('audio_off').style.display = 'none';
    };

    this.isMuted = function() {
        return this.target.isMuted();
    };

    this.seekTo = function(time) {
        this.target.seekTo(time);
        this.updateDisplayMessage();
    };
};

/**
 * Set the PlayerHandler target to use the video-element player
 */
HomeCastSender.prototype.setupLocalPlayer = function () {
    var localPlayer = document.getElementById('media-video');
    localPlayer.addEventListener('loadeddata', this.onMediaLoadedLocally.bind(this));

    // This object will implement PlayerHandler callbacks with localPlayer
    var playerTarget = {};

    playerTarget.play = function() {
        localPlayer.play();

        /*var vi = document.getElementById('video_image');
        vi.style.display = 'none';*/
        localPlayer.style.display = 'block';
    };

    playerTarget.pause = function () {
        localPlayer.pause();
    };

    playerTarget.stop = function () {
        localPlayer.stop();
    };

    playerTarget.load = function(f) {
        localPlayer.src = "/media?filename=" + f.name + "&parent=" + f.parentPath;
        localPlayer.load();
        this.currentMedia = f;
    }.bind(this);

    playerTarget.getCurrentMediaTime = function() {
        return localPlayer.currentTime;
    };

    playerTarget.getMediaDuration = function() {
        return localPlayer.duration;
    };

    playerTarget.updateDisplayMessage = function () {
        /*document.getElementById('playerstate').style.display = 'none';
        document.getElementById('playerstatebg').style.display = 'none';
        document.getElementById('video_image_overlay').style.display = 'none';*/
    };

    playerTarget.setVolume = function(volumeSliderPosition) {
        localPlayer.volume = volumeSliderPosition < FULL_VOLUME_HEIGHT ? volumeSliderPosition / FULL_VOLUME_HEIGHT : 1;
        /*var p = document.getElementById('audio_bg_level');
        p.style.height = volumeSliderPosition + 'px';
        p.style.marginTop = -volumeSliderPosition + 'px';*/
    };

    playerTarget.mute = function() {
        localPlayer.muted = true;
    };

    playerTarget.unMute = function() {
        localPlayer.muted = false;
    };

    playerTarget.isMuted = function() {
        return localPlayer.muted;
    };

    playerTarget.seekTo = function(time) {
        localPlayer.currentTime = time;
    };

    this.playerHandler.setTarget(playerTarget);

    this.playerHandler.setVolume(DEFAULT_VOLUME * FULL_VOLUME_HEIGHT);

    /*this.showFullscreenButton();*/

    if (this.currentMediaTime > 0) {
        this.playerHandler.play();
    }
};

/**
 * Set the PlayerHandler target to use the remote player
 */
HomeCastSender.prototype.setupRemotePlayer = function () {
    var castSession = cast.framework.CastContext.getInstance().getCurrentSession();

    // Add event listeners for player changes which may occur outside sender app
    this.remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
        function() {
            if (this.remotePlayer.isPaused) {
                this.playerHandler.pause();
            } else {
                this.playerHandler.play();
            }
        }.bind(this)
    );

    this.remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_MUTED_CHANGED,
        function() {
            if (this.remotePlayer.isMuted) {
                this.playerHandler.mute();
            } else {
                this.playerHandler.unMute();
            }
        }.bind(this)
    );

    this.remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED,
        function() {
            var newVolume = this.remotePlayer.volumeLevel * FULL_VOLUME_HEIGHT;
//            var p = document.getElementById('audio_bg_level');
//            p.style.height = newVolume + 'px';
//            p.style.marginTop = -newVolume + 'px';
        }.bind(this)
    );

    // This object will implement PlayerHandler callbacks with
    // remotePlayerController, and makes necessary UI updates specific
    // to remote playback
    var playerTarget = {};

    playerTarget.play = function () {
        if (this.remotePlayer.isPaused) {
            this.remotePlayerController.playOrPause();
        }

//        var vi = document.getElementById('video_image');
//        vi.style.display = 'block';
//        var localPlayer = document.getElementById('video_element');
//        localPlayer.style.display = 'none';
    }.bind(this);

    playerTarget.pause = function () {
        if (!this.remotePlayer.isPaused) {
            this.remotePlayerController.playOrPause();
        }
    }.bind(this);

    playerTarget.stop = function () {
         this.remotePlayerController.stop();
    }.bind(this);

    playerTarget.load = function (f) {
        console.log('Loading...' + f.name);
        
        var mediaInfo = this.CreateMediaInfo(f);
        
        
        /*var mediaInfo = new chrome.cast.media.MediaInfo(
            this.mediaContents[mediaIndex]['sources'][0], 'video/mp4');

        mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
        mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
        mediaInfo.metadata.title = this.mediaContents[mediaIndex]['title'];
        mediaInfo.metadata.images = [
            {'url': MEDIA_SOURCE_ROOT + this.mediaContents[mediaIndex]['thumb']}];*/

        var request = new chrome.cast.media.LoadRequest(mediaInfo);
        castSession.loadMedia(request).then(
            this.playerHandler.loaded.bind(this.playerHandler),
            function (errorCode) {
                this.playerState = PLAYER_STATE.ERROR;
                console.log('Remote media load error: ' + HomeCastSender.getErrorMessage(errorCode));
            }.bind(this));
    }.bind(this);

    playerTarget.getCurrentMediaTime = function() {
        return this.remotePlayer.currentTime;
    }.bind(this);

    playerTarget.getMediaDuration = function() {
        return this.remotePlayer.duration;
    }.bind(this);

    playerTarget.updateDisplayMessage = function () {
//        document.getElementById('playerstate').style.display = 'block';
//        document.getElementById('playerstatebg').style.display = 'block';
//        document.getElementById('video_image_overlay').style.display = 'block';
//        document.getElementById('playerstate').innerHTML =
//            this.mediaContents[ this.currentMediaIndex]['title'] + ' ' +
//            this.playerState + ' on ' + castSession.getCastDevice().friendlyName;
    }.bind(this);

    playerTarget.setVolume = function (volumeSliderPosition) {
        // Add resistance to avoid loud volume
        var currentVolume = this.remotePlayer.volumeLevel;
//        var p = document.getElementById('audio_bg_level');
        if (volumeSliderPosition < FULL_VOLUME_HEIGHT) {
            var vScale =  this.currentVolume * FULL_VOLUME_HEIGHT;
            if (volumeSliderPosition > vScale) {
                volumeSliderPosition = vScale + (pos - vScale) / 2;
            }
//            p.style.height = volumeSliderPosition + 'px';
//            p.style.marginTop = -volumeSliderPosition + 'px';
            currentVolume = volumeSliderPosition / FULL_VOLUME_HEIGHT;
        } else {
            currentVolume = 1;
        }
        this.remotePlayer.volumeLevel = currentVolume;
        this.remotePlayerController.setVolumeLevel();
    }.bind(this);

    playerTarget.mute = function () {
        if (!this.remotePlayer.isMuted) {
            this.remotePlayerController.muteOrUnmute();
        }
    }.bind(this);

    playerTarget.unMute = function () {
        if (this.remotePlayer.isMuted) {
            this.remotePlayerController.muteOrUnmute();
        }
    }.bind(this);

    playerTarget.isMuted = function() {
        return this.remotePlayer.isMuted;
    }.bind(this);

    playerTarget.seekTo = function (time) {
        this.remotePlayer.currentTime = time;
        this.remotePlayerController.seek();
    }.bind(this);

    this.playerHandler.setTarget(playerTarget);

    // Setup remote player volume right on setup
    // The remote player may have had a volume set from previous playback
    if (this.remotePlayer.isMuted) {
        this.playerHandler.mute();
    }
    
    var currentVolume = this.remotePlayer.volumeLevel * FULL_VOLUME_HEIGHT;
//    var p = document.getElementById('audio_bg_level');
//    p.style.height = currentVolume + 'px';
//    p.style.marginTop = -currentVolume + 'px';

    this.hideFullscreenButton();

    this.playerHandler.play();
};

/**
 * Callback when media is loaded in local player
 */
HomeCastSender.prototype.onMediaLoadedLocally = function() {
    var localPlayer = document.getElementById('media-video');
    localPlayer.currentTime = this.currentMediaTime;

    this.playerHandler.loaded();
};

HomeCastSender.prototype.updateMediaDuration = function() {
    //document.getElementById('duration').innerHTML = CastPlayer.getDurationString(this.currentMediaDuration);
};

/**
 * Starts the timer to increment the media progress bar
 */
HomeCastSender.prototype.startProgressTimer = function() {
    this.stopProgressTimer();

    // Start progress timer
    this.timer = setInterval(this.incrementMediaTimeHandler, TIMER_STEP);
};

/**
 * Stops the timer to increment the media progress bar
 */
HomeCastSender.prototype.stopProgressTimer = function() {
    if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
    }
};

HomeCastSender.prototype.CreateMediaInfo = function (file) {
    var mediaInfo = new chrome.cast.media.MediaInfo("/media?filename=" + file.name + "&parent=" + file.parentPath);
    mediaInfo.contentType = file.contentType;
    mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = file.name;
    mediaInfo.customData = null;
    mediaInfo.streamType = chrome.cast.media.StreamType.BUFFERED;

    if (file.subtitle) {
        var subt = new chrome.cast.media.Track(1, chrome.cast.media.TrackType.TEXT);
        subt.trackContentId = "/media?filename=" + file.subtitle + "&parent=" + file.parentPath;
        subt.trackContentType = 'text/vtt';
        subt.subtype = chrome.cast.media.TextTrackType.SUBTITLES;
        subt.name = 'Spanish Subtitles';
        subt.language = 'es';
        subt.customData = null;

        mediaInfo.textTrackStyle = new chrome.cast.media.TextTrackStyle();
        mediaInfo.textTrackStyle.backgroundColor = "#000000DD";
        mediaInfo.textTrackStyle.edgeType = chrome.cast.media.TextTrackEdgeType.NONE;
        mediaInfo.textTrackStyle.fontScale = 1.2;

        mediaInfo.tracks = [subt];
    }

    return mediaInfo;
}

/**
 * Makes human-readable message from chrome.cast.Error
 * @param {chrome.cast.Error} error
 * @return {string} error message
 */
HomeCastSender.getErrorMessage = function(error) {
    switch (error.code) {
        case chrome.cast.ErrorCode.API_NOT_INITIALIZED:
            return 'The API is not initialized.' + (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.CANCEL:
            return 'The operation was canceled by the user' + (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.CHANNEL_ERROR:
            return 'A channel to the receiver is not available.' + (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.EXTENSION_MISSING:
            return 'The Cast extension is not available.' + (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.INVALID_PARAMETER:
            return 'The parameters to the operation were not valid.' + (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.RECEIVER_UNAVAILABLE:
            return 'No receiver was compatible with the session request.' + (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.SESSION_ERROR:
            return 'A session could not be created, or a session was invalid.' + (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.TIMEOUT:
            return 'The operation timed out.' + (error.description ? ' :' + error.description : '');
    }
};

