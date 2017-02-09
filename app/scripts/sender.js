(function() {
  'use strict';

  var HomeCastSender = function (appId, namespace)
  {
    this.namespace = namespace;
    this.appId = appId;

    this.session = null;
    this.currentMedia = null;
    //this.currentTime = 0;
    this.timer = null;
  };

  // funcion para inicializar el API de Google Cast
  HomeCastSender.prototype.Init = function()
  {
    var that = this;

    window.onload = function() {

      // cuando la api de Google Cast se termina de cargar
      // inicializamos el API de Google Cast.
      window['__onGCastApiAvailable'] = function(loaded, errorInfo) {
        if (loaded) {
          // solicitamos una sesion utilizando el Application ID
          var sessionRequest = new chrome.cast.SessionRequest(that.appId);

          // indicamos el listener de la session y del receiver
          // al crear una instancia de ApiConfig
          var apiConfig = new chrome.cast.ApiConfig(sessionRequest, that.sessionListener.bind(that), that.receiverListener.bind(that));

          // inicializamos el API de Google Cast usando los listener anteriores y la sesion
          // indicando los manejadores en caso de exito y error.
          chrome.cast.initialize(apiConfig, that.onInitSuccess.bind(that), that.onError.bind(that));
        } else {
          console.log(errorInfo);
        }
      }

    };
  };

  // on init success callback
  HomeCastSender.prototype.onInitSuccess = function()
  {
    console.log("Init Success");
  };

  // on error callback
  HomeCastSender.prototype.onError = function()
  {
    console.log("Error");
  };

  HomeCastSender.prototype.createTimer = function() {
    this.clearTimer();
    this.timer = setInterval(this.updateCurrentTime.bind(this), 1000);
  };

  HomeCastSender.prototype.updateCurrentTime = function() {
    //console.log("updateCurrentTime");

    if (!this.currentMedia || !this.session) {
      return;
    }

    if (this.currentMedia.media && this.currentMedia.media.duration != null) {
      document.getElementById("progress").value = parseInt(100 * this.currentMedia.getEstimatedTime() / this.currentMedia.media.duration);
    } else {
      document.getElementById("progress").value = 0;
      clearTimer();
    }

  };

  HomeCastSender.prototype.clearTimer = function() {
  	console.log("clearTimer");
  	if (this.timer) {
  	  clearInterval(this.timer);
  	}
  };

  /**
   * seek media position
   * @param {Number} pos A number to indicate percent
   */
   HomeCastSender.prototype.seekMedia = function(pos) {
    console.log('Seeking ' + this.currentMedia.sessionId + ':' + this.currentMedia.mediaSessionId + ' to ' + pos + "%");
    //progressFlag = 0;
    var request = new chrome.cast.media.SeekRequest();
    request.currentTime = pos * this.currentMedia.media.duration / 100;
    this.currentMedia.seek(request, this.onSeekSuccess.bind(this, 'media seek done'), function(){
      console.log("seek error");
    });

    this.createTimer();
  };

  /**
   * callback on success for media commands
   * @param {string} info A message string
   * @param {Object} e A non-null media object
   */
   HomeCastSender.prototype.onSeekSuccess = function(info) {
    console.log(info);
    //appendMessage(info);
    //setTimeout(function(){progressFlag = 1},1500);
  }

  HomeCastSender.prototype.sessionListener = function(e)
  {
    this.session = e;

    if (this.session.media.length != 0) {
      this.onMediaDiscovered('ActiveSession', this.session.media[0]);
    }
  };

  // manejador de lista de receivers disponibles (lista de cast)
  HomeCastSender.prototype.receiverListener = function(e) {
    if (e === chrome.cast.ReceiverAvailability.AVAILABLE) {
      console.log("Receiver Found :)");
    } else {
      console.log("Receiver List is Empty");
    }
  };

  // obtenemos una session en la aplicación del chromecast
  // Si la aplicacion no está funcionando, se inicia la aplicación
  // y una session
  HomeCastSender.prototype.LaunchApp = function() {
    console.log("Launching app...");
    chrome.cast.requestSession(this.onRequestSessionSuccess.bind(this), this.onLaunchError.bind(this));
  }

  // manejador de la nueva session
  HomeCastSender.prototype.onRequestSessionSuccess = function(e) {
    console.log("session success: " + e.sessionId);
    console.log(JSON.stringify(e));
    this.session = e;
  }

  // cuando la session no es obtenida
  HomeCastSender.prototype.onLaunchError = function() {
    console.log("launch error");
  }

  // enviamos un mensaje al chromecast para mostrar un medio
  // ya sea una imagen, video o audio
  HomeCastSender.prototype.LoadMedia = function(mediaInfo) {

    // si no existe una session no realizamos ninguna accion
    if (!this.session || !mediaInfo) {
      console.log("session don't exist");
      return;
    }

    // creamos un LoadRequest con el mediainfo, el cual se enviará al chromecast
    var request = new chrome.cast.media.LoadRequest(mediaInfo);

    // cargamos un Media usando el LoadRequest
    this.session.loadMedia(request, this.onMediaDiscovered.bind(this, 'LoadMedia'), this.GenericError.bind(this));
  };

  HomeCastSender.prototype.CreateMediaInfo = function(file) {
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

   HomeCastSender.prototype.onMediaDiscovered = function(how, media)
   {
    console.log("Discovered from: " + how);
    console.log(JSON.stringify(media));
    this.currentMedia = media;
    //this.currentTime = this.currentMedia.getEstimatedTime();

    this.createTimer();

    media.addUpdateListener(this.onMediaStatusUpdate.bind(this));

    if (this.currentMedia.media.tracks && this.currentMedia.media.tracks.length > 0) {
      var track = this.currentMedia.media.tracks[0];
      this.currentMedia.editTracksInfo(new chrome.cast.media.EditTracksInfoRequest([track.trackId]),
        this.onEditTrackInfoSuccess.bind(this, track),
        function() {
          console.log("error during subtitle enabled process... :(");
        });
    }

  };

  HomeCastSender.prototype.onEditTrackInfoSuccess = function(track) {
    console.log("subtitle " + track.name + " enabled");
  };

  HomeCastSender.prototype.onMediaStatusUpdate = function(isAlive)
  {
    console.log(this.currentMedia.playerState);
  };

  HomeCastSender.prototype.Play = function()
  {
    this.currentMedia.play(null, this.GenericSuccess.bind(this), this.GenericError.bind(this));
  };

  HomeCastSender.prototype.Pause = function()
  {
    this.currentMedia.pause(null, this.GenericSuccess.bind(this), this.GenericError.bind(this));
  };

  HomeCastSender.prototype.Stop = function()
  {
    this.currentMedia.stop(null, this.GenericSuccess.bind(this), this.GenericError.bind(this));
  };

  HomeCastSender.prototype.GenericSuccess = function()
  {
    console.log("Success :)");
  };

  HomeCastSender.prototype.GenericError = function(err)
  {
    console.log("Error :(");
    console.log(JSON.stringify(err));
  };

  HomeCastSender.prototype.StopApp = function()
  {
    this.session.stop(this.GenericSuccess.bind(this), this.GenericError.bind(this));
  };

  window.HomeCastSender = HomeCastSender;
})();
