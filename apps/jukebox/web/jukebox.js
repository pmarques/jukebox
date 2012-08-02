//
//
//
(function(){

    var jukebox = {};
    
    var AppView = Backbone.View.extend({
        render: function() {
            this.$el.html('');
            
            this.headerNavView.render();
            
            this.$el.append(this.$appHeader);
            this.$el.append(this.$appFrames);
            
            this.headerNavView.go('Jukebox');
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.$appHeader = $('<header id="jukeHead"><center>Loading..</center></header>');
            this.$appFrames = $('<div id="frames"></div>');
            
            this.headerNavView = window.jukeboxNav = new HeaderNavView({el:this.$appHeader, "$frames": this.$appFrames});
            self.headerNavView.render();
            this.headerNavView.addView('Player', new MediaPlayerView({el: $('<div id="mediaPlayer"></div>')}));
            this.headerNavView.addView('Library', new LibraryView({el: $('<div id="library"></div>')}));
            require(['houseChat.js'], function(houseChat) {
                var chatApp = window.chat = new houseChat.AppView({el: $('<div id="chat"></div>')});
                self.headerNavView.addView('Chat', chatApp);
                self.headerNavView.addView('Queue', new QueueView({el: $('<div id="queue"></div>'), chat: chatApp}));
            });
        },
        events: {
        }
    });
    
    var HeaderNavView = Backbone.View.extend({
        addView: function(viewName, view) {
            this.views[viewName] = view;
            window["JukeBox"+viewName] = view;
            this.options.$frames.append(view.render().$el);
        },
        render: function() {
            var txt = this.currentView || 'Loading ...';
            this.$el.html('<a class="openNav" title="Menu" href="#"><img src="assets/img/logo-drums.png" /></a><center>'+txt+'</center>');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.views = {};
            this.addView('Jukebox', new NavView({"headerNav": this}));
        },
        events: {
            "click .openNav": "openNav"
        },
        openNav: function(){
            this.go('Jukebox');
            return false;
        },
        go: function(viewName){
            this.currentView = viewName;
            for(var i in this.views) {
                this.views[i].$el.removeAttr('selected');
            }
            this.views[viewName].render();
            //this.views[viewName].$el.show();
            this.views[viewName].$el.attr('selected', true);
            
            this.options.$frames.attr('data-sel', viewName);
            
            this.render();
        }
    });
    
    var NavView = Backbone.View.extend({
        className: 'nav',
        render: function() {
            this.$el.html('');
            
            this.$el.append('<div class="playing"><img src="assets/img/icons/library.png" /> Playing</div>');
            this.$el.append('<div class="library"><img src="assets/img/icons/upload.png" /> Library</div>');
            this.$el.append('<div class="history"><img src="assets/img/icons/queue.png" /> History</div>');
            this.$el.append('<div class="chat"><img src="assets/img/icons/chat.png" /> Chat</div>');
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
            "click .playing": "goPlaying",
            "click .library": "goLibrary",
            "click .history": "goHistory",
            "click .chat": "goChat"
        },
        deselectAll: function() {
            this.$el.children().removeAttr('selected');
        },
        goPlaying: function() {
            var self = this;
            this.options.headerNav.go('Player');
            this.deselectAll();
            this.$el.find('.playing').attr('selected', true);
        },
        goLibrary: function() {
            var self = this;
            this.options.headerNav.go('Library');
            this.deselectAll();
            this.$el.find('.library').attr('selected', true);
        },
        goHistory: function() {
            var self = this;
            this.options.headerNav.go('Queue');
            this.deselectAll();
            this.$el.find('.history').attr('selected', true);
        },
        goChat: function() {
            var self = this;
            this.options.headerNav.go('Chat');
            this.deselectAll();
            this.$el.find('.chat').attr('selected', true);
        }
    });
    
    var QueueView = Backbone.View.extend({
        render: function() {
            this.$el.append(this.$div);
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            var self = this;
            this.$div = $('<div></div>');
            this.$played = $('<ul class="played"></ul>');
            this.$queue = $('<ul class="queue"></ul>');
            this.$div.append(this.$played);
            this.$div.append(this.$queue);
            
            self.queues = {};
            self.plays = {};
            self.songsQueueList;
            
            options.chat.roomsOpenView.roomsOpenListView.on('select', function(room){
                //console.log('update queue with room '+room.get('id'));
                
                self.queues[room.get('id')] = new SongqListView({el: self.$queue, roomId: room.get('id')});
                self.songsQueueList = self.queues[room.get('id')];
                
                // request the room information
                chatSocket.emit('info', room.get('id'), function(roomInfo){
                    //console.log(roomInfo);
                    
                    if(roomInfo.song) {
                    
                        // start playing song and scrub to live based on diff of pAt and new Date()
                        var d = new Date();
                        var pd = new Date(roomInfo.song.pAt);
                        var diff = d.getTime() - pd.getTime();
                        
                        JukeBoxPlayer.loadSong('/api/files/'+roomInfo.song.filename, roomInfo.song, diff);
                    }
                });
                
                self.plays[room.get('id')] = self.songsPlayedList = new SongpListView({el: self.$played, roomId: room.get('id')});
                
                self.queues[room.get('id')].render();
                self.plays[room.get('id')].render();
            });
            
        },
        events: {
        }
    });
    
    //
    
    function parseFile(file, callback){
        //console.log(file);
        var parsed = false;
        setTimeout(function(){
            if(parsed) {
                
            } else {
                callback({});
            }
        }, 1000);
      ID3v2.parseFile(file, function(tags){
          parsed = true;
        //console.log(tags);
        callback(tags);
      });
    }
    
    var UploadFrame = Backbone.View.extend({
        tagName: "span",
        className: "uploadFrame",
        //htmlTemplate: 'Upload Files <iframe src="upload.html"></iframe>', haha, the old way of doing things.
        // mozdirectory webkitdirectory directory aren't really useful?
        htmlTemplate: '<input type="file" multiple onchange="fileChangeListener(this.files)"><div class="uploadFiles"><button class="upload_all" title="Upload All">☁☁☁</button></div>',
        template: function(doc) {
            return $(_.template(this.htmlTemplate, doc));
        },
        render: function() {
            this.$el.append(this.$up);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            window.fileChangeListener = this.inputChange;
            this.$up = $(this.template({}));
        },
        events: {
            "click .upload_all": "uploadAll"
        },
        uploadAll: function() {
            var self = this;
            var i = 0;
            var filesToUpload = $('.uploadFiles button.upload');
            var uploadIt = function() {
                if(filesToUpload.hasOwnProperty(i)) {
                    filesToUpload[i].click();
                    if(i+1 == filesToUpload.length) {
                        return;
                    } else {
                        i++;
                        
                        // TODO get callback when upload progress finishes
                        setTimeout(function(){
                            uploadIt(filesToUpload[i]);
                        }, 2200);
                    }
                }
            }
            uploadIt();
        },
        inputChange: function(files) {
            var self = this;
            
            function canPlay(type){
              var a = document.createElement('audio');
              return !!(a.canPlayType && a.canPlayType(type).replace(/no/, ''));
            }
            function uploadFile(blobOrFile, $row) {
                
                var formData = new FormData();
                var xhr = new XMLHttpRequest();
                             
                var onReady = function(e) {
                 // ready state
                };
                
                var onError = function(err) {
                  // something went wrong with upload
                };
                
                formData.append('files', blobOrFile);
                xhr.open('POST', '/api/files', true);
                xhr.addEventListener('error', onError, false);
                //xhr.addEventListener('progress', onProgress, false);
                xhr.addEventListener('readystatechange', onReady, false);
                
              xhr.onload = function(e) {
                  //console.log('upload complete');
                  var data = JSON.parse(e.target.response);
                  
                  if(data.hasOwnProperty('song')) {
                    window.JukeBoxLibrary.songListView.collection.add(new SongModel(data.song));
                  }
                  
                  $row.remove();
              };
            
              // Listen to the upload progress.
              var progressBar = $row.find('progress');
              xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                  progressBar.val((e.loaded / e.total) * 100);
                  //progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
                }
              };
            
                xhr.send(formData);
            }
              var queue = [];
              var mp3 = true;//canPlay('audio/mpeg;'), ogg = canPlay('audio/ogg; codecs="vorbis"');
              for(var i = 0; i < files.length; i++){
                var file = files[i];
                var path = file.webkitRelativePath || file.mozFullPath || file.name;
                if (path.indexOf('.AppleDouble') != -1) {
                 // Meta-data folder on Apple file systems, skip
                continue;
                }         
                var size = file.size || file.fileSize || 4096;
                if(size < 4095) { 
                // Most probably not a real MP3
                continue;
                }
            
                  queue.push(file);
              }
                                      
                                      //<progress min="0" max="100" value="0">0% complete</progress>
              var process = function(){
                if(queue.length){
                  //console.log(queue);
                  var f = queue.shift();
                  parseFile(f,function(tags){
                      //console.log(tags);
                      
                      // TODO make this a backbone view
                      
                      var $localFile = $('<div class="localFile"></div>');
                      var $actions = $('<span class="actions"></span> ');
                      var $title = $('<span class="title"></span> ');
                      var $artist = $('<span class="artist"></span> ');
                      var $album = $('<span class="album"></span> ');
                      var $year = $('<span class="year"></span> ');
                      var $genre = $('<span class="genre"></span> ');
                      
                      var t2 = guessSong(f.webkitRelativePath || f.mozFullPath || f.name); 
                      //console.log(t2);
                      $actions.html('');
                      
                      var title = tags.Title || t2.Title;
                      $title.html(title);
                      
                      var artist = tags.Artist || t2.Artist;
                      $artist.html(artist);
                      
                      var album = tags.Album || t2.Album;
                      $album.html(album);
                      
                      var year = tags.Year || t2.Year;
                      $year.html(year);
                      
                      var genre = tags.Genre || "";
                      $genre.html(genre);
                      
                      $localFile.append($actions);
                      $localFile.append($title);
                      $localFile.append($artist);
                      $localFile.append($album);
                      $localFile.append($year);
                      $localFile.append($genre);
                      
                      $localFile.append('<progress min="0" max="100" value="0" style="display:none;">0% complete</progress>');
                      
                      var url;
                      if(window.createObjectURL){
                        url = window.createObjectURL(f)
                      }else if(window.createBlobURL){
                        url = window.createBlobURL(f)
                      }else if(window.URL && window.URL.createObjectURL){
                        url = window.URL.createObjectURL(f)
                      }else if(window.webkitURL && window.webkitURL.createObjectURL){
                        url = window.webkitURL.createObjectURL(f)
                      }
                      
                      var $remove = $('<button>x</button>').click(function(){
                          $localFile.remove();
                          return false;
                      });
                      
                      var $playMedia = $('<button>▸</button>').click(function(){
                          mediaPlayer.loadSong(f);
                          return false;
                      });
                      
                      var $uploadMedia = $('<button class="upload" title="upload">☁</button>').click(function(){
                          var $localFile = $(this).parents('.localFile');
                          $localFile.find('progress').show();
                          uploadFile(f, $localFile);
                          $uploadMedia.remove();
                          return false;
                      });
                      $actions.append($remove);
                      $actions.append($playMedia);
                      $actions.append($uploadMedia);
                        $('.uploadFiles').append($localFile);
                    process();
                  })
                  var lq = queue.length;
                  setTimeout(function(){
                    if(queue.length == lq){
                      process();
                    }
                  },300);
                }
              }
              process();
        },
        remove: function() {
          $(this.el).remove();
        }
    });
    
    var LibraryView = Backbone.View.extend({
        className: 'library',
        element: 'div',
        render: function() {
            this.$el.append(this.$div);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.$div = $('<div></div>');
            this.uploadFrame = new UploadFrame({library:this});
            this.songListView = new SongListView({library:this});
            this.searchFrame = new SearchView({library:this});
            this.$div.append(this.searchFrame.render().el);
            this.$div.append(this.uploadFrame.render().el);
            this.$div.append(this.songListView.render().el);
            require(['id3v2.js'], function(){            });
        },
        events: {
            "submit form": "submit"
        }, submit: function() {
            
            return false;
        }
    });
    var formatMsTime = function(ms) {
        var t = ms/1000;
        return Math.floor(t/60) +':'+ pad(Math.floor(t%60));
    }
    var MediaPlayerView = Backbone.View.extend({
        className: 'player',
        element: 'div',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$player); //
            if(this.song && this.song.title) {
                var str = this.song.title+' - '+this.song.artist; //+' on '+this.song.album;
                this.$el.find('.songInfo').html(str);
                window.document.title = str;
                var d = formatMsTime(this.song.duration*1000);
                this.$el.find('.albumName').html(this.song.album);
                this.$el.find('.duration').html(d);
                this.$el.find('.duration').attr('data-duration', this.song.duration);
                this.$el.find('.progress').attr('title', d);
            }
            if(this.songRatingListView) {
                this.$player.find('.ratings').html(this.songRatingListView.render().el);
            }
            this.$player.append(this.$viz);
            this.$player.append(this.$canvas);
            
            this.setElement(this.$el);
            return this;
        },
        renderDuration: function() {
            var p = 0;
            var duration = this.player.duration || (this.song.duration * 1000);
            this.$el.find('.currentTime').html(formatMsTime(this.player.currentTime));
            if(duration) {
                var d = duration / 1000;
                var t = this.player.currentTime / 1000;
                p = (t / d) * 100;
                t = d - t;
                this.$el.find('meter').val(p);
                this.$el.find('.progress').html(' - '+Math.floor(t/60) +':'+ pad(Math.floor(t%60)));
            } else {
                var t = this.player.currentTime / 1000;
                this.$el.find('.progress').html(Math.floor(t/60) +':'+ pad(Math.floor(t%60)));
            }
        },
        renderSongInfo: function() {
            var str = '';
            //console.log(this.metadata);
            
            var title = this.metadata.title || this.metadata.Title || '';
            var artist = this.metadata.artist || this.metadata.Artist || this.metadata["Album Artist"] || '';
            var album = this.metadata.album || this.metadata.Album || '';
            
            this.$el.find('.albumName').html(album);
            
            str += title ? title + ' - ' : '';
            str += artist ? artist : '';
            //str += album ? ' on '+album : '';
            str += this.metadata.year ? ' '+this.metadata.year : '';
            if(str) {
                this.$el.find('.songInfo').html(str);
                window.document.title = str;
                var cover = this.metadata.coverArt || this.metadata["Cover Art"] || '';
                if(cover) {
                    if(!cover.toBlob) cover = cover.data
                    var src = window.webkitURL.createObjectURL(cover.toBlob());
                    $('#vizual').html('<img src="' + src + '" />');
                }
            }
        },
        initialize: function() {
            var self = this;
            this.$player = $('<div><meter min="0.0" max="100.0" value="0.1"></meter>\
<span class="time"><span class="currentTime"></span><span class="duration"></span> <span class="progress"></span></span>\
<button class="mute" title="Mute">♫</button>\
<input class="rating" type="range"  min="0" max="100" title="Rating" value="0" />\
<div class="playerInfo"><span class="loading"></span><span class="songInfo"></span>\
<span class="albumInfo"><span class="albumName"></span></span><span class="ratings"></span></div>\
</div>');
            this.$canvas = $('<canvas id="waveform" />');
            this.$viz = $('<div id="vizual"></div>');
            window.mediaPlayer = this;
            this.preloads = {};
            this.songRatings = {};
        },
        events: {
            "click button.playPause": "playPause"
            , "click button.mute": "mute"
            , "click button.seek": "seek"
            , "mouseup input.rating": "rating"
        },
        rating: function() {
            var self = this;
            //console.log(this.$el.find('.rating').val());
            
            if(!this.songRatings.hasOwnProperty(this.song.id)) {
                this.songRatings[this.song.id] = new SongRatingModel({}, {collection: this.songRatingListView.collection});
                this.songRatings[this.song.id].on("change", function(songr, options){
                    console.log(options);
                    var isnoo = songr.isNew();
                    var s = songr.save(null, {silent: true, wait: true})
                        .done(function(s, typeStr, respStr) {
                            delete songr.changed.at;
                            delete songr.changed.id;
                            delete songr.changed.score;
                            delete songr.changed.user;
                            self.trigger('saved', songr);
                            self.songRatingListView.collection.add(songr);
                            self.songRatings[self.song.id].getView().render();
                            if(isnoo) {
                                self.songRatings[self.song.id].getView().showMsgForm();
                            } else {
                                self.songRatings[self.song.id].getView().hideMsgForm();
                            }
                        });
                });
                var newSongr = {
                    song_id: this.song.id,
                    score: this.$el.find('.rating').val()
                };
                var ts = Math.floor(this.player.currentTime / 1000);
                if(ts) {
                    newSongr.ts = ts;
                }
                this.songRatings[this.song.id].set(newSongr, {wait: true});
            } else {
                this.songRatings[this.song.id].set({score: this.$el.find('.rating').val()}, {wait: true});
                this.songRatings[this.song.id].getView().render();
            }
        },
        mute: function() {
            if(this.player.volume == 0) {
                this.player.volume = 100;
            } else {
                this.player.volume = 0;
            }
        },
        preloadSong: function(song) {
           this.preloads[song.filename] = Player.fromURL('/api/files/'+song.filename);
           this.preloads[song.filename].preload();
           //console.log('preloading');
        },
        loadSong: function(fileName, song, diff) {
            var self = this;
            var volume = 100;
            if(this.currentSong) {
                volume = this.player.volume || volume;
                if(fileName == this.currentSong.filename) return;
                
                var loadAndUpdatePrevSongId = function(prevSongId) {
                
                    JukeBoxQueue.songsQueueList.collection.each(function(songq){
                        if(prevSongId && songq.get('song').id == prevSongId) {
                            var songpJson = songq.attributes;
                            songpJson.qAt = songpJson.at;
                            
                            JukeBoxQueue.songsPlayedList.collection.add(new SongpModel(songpJson));
                            JukeBoxQueue.songsQueueList.collection.remove(songq.id);
                        }
                    });
                    JukeBoxQueue.songsQueueList.collection.reset();
                    JukeBoxQueue.songsQueueList.collection.load(function(){
                    });
                }
                loadAndUpdatePrevSongId(self.currentSong.id);
            }
            
            if(song) {
                this.currentSong = song;
            }
            var player;
            
            self.$el.find('.loading').html('Loading...');
            
            if(typeof fileName == 'string') {
                
                if(this.preloads.hasOwnProperty(fileName)) {
                    player = this.preloads.player;
                } else {
                    player = Player.fromURL(fileName);
                }
            } else {
                
                // preview local file
                player = Player.fromFile(fileName);
                fileName = fileName.fileName;
            }
            
            if(this.hasOwnProperty('player')) {
                this.player.stop();
                delete this.player;
            }
            
            this.player = player;
            this.player.volume = volume;
            if(song) {
                this.song = song;
                this.songRatingListView = new SongRatingListView({song_id:this.song.id});
                this.render();
            }
            //console.log('loadSong: '+fileName);
            
            player.on('error', function(err){
                console.log(err);
            });
            //console.log(player)
            player.on('buffer', function(percent){
            });
            player.on('ready', function(){
                self.$el.find('.loading').html('');
                player.play();
                
                if(diff) {
                    player.device.seek(diff);
                }
            });
            player.on('progress', function(msecs){
                //console.log(self.player.duration);
                //console.log(self.player.currentTime);
                //console.log(msecs);
                //console.log('song played '+msecs);
                self.renderDuration();
            });
            player.on('format', function(format){
                /*
                bitrate: 320000
                channelsPerFrame: 2
                formatID: "mp3"
                sampleRate: 44100
                */
            });
            player.on('metadata', function(metadata){
                self.metadata = metadata;
                if(metadata) {
                    self.renderSongInfo();
                }
                /*album: "Haven"
                albumArtist: "Dark Tranquillity"
                artist: "Dark Tranquillity"
                comments: Object
                genre: "Metal"
                title: "Haven"
                trackNumber: "6"
                year: "2000"*/
            });
            player.on('duration', function(msecs){
                //console.log(arguments);
            });
            
            this.visualizePlayer(player);
            
            if(this.preloads.hasOwnProperty(fileName)) {
                player.play();
            } else {
                player.preload();
            }
        },
        visualizePlayer: function() {
            
            return;
             var
              dancer = new Dancer( player ),
              beat = dancer.createBeat({
                onBeat: function ( mag ) {
                  //console.log('Beat!');
                },
                offBeat: function ( mag ) {
                  //console.log('no beat :(');
                }
              });
            
            // Let's turn this beat on right away
            beat.on();
            
            dancer.onceAt( 10, function() {
              // Let's set up some things once at 10 seconds
            }).between( 10, 60, function() {
              // After 10s, let's do something on every frame for the first minute
            }).after( 60, function() {
              // After 60s, let's get this real and map a frequency to an object's y position
              // Note that the instance of dancer is bound to "this"
              object.y = this.getFrequency( 400 );
            }).onceAt( 120, function() {
              // After 120s, we'll turn the beat off as another object's y position is still being mapped from the previous "after" method
              beat.off();
            });
        },
        next: function() {
        },
        seek: function() {
            this.player.pause();
            this.player.device.seek(60000);
            this.player.play();
            //this.player.device.start();
        },
        playPause: function() {
            this.player.togglePlayback();
        },
        pause: function() {
            this.player.pause();
            this.$el.find('.playPause').html('Play');
        },
        play: function() {
            this.player.play();
            this.$el.find('.playPause').html('Pause');
        }
    });
    
    var SearchView = Backbone.View.extend({
        className: 'search',
        element: 'div',
        render: function() {
            this.$el.html('');
            var $form = $('<form></form>').append(this.$search);
            this.$el.append($form);
            
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            this.$search = $('<input class="search" type="text" name="query" placeholder="search for tunes" autocomplete="off" />');
            this.$songList = options.library.songListView.$el;
        },
        events: {
            "keyup input": "search"
        }, search: function(e){
            var regex = new RegExp(this.$search.val().trim().replace(/\s+/g, '.*'), 'ig');
            for(var i = $('.songList .song'), l = i.length; l--;){
              if(regex.test(i[l].dataset.ss)){
                  $(i[l]).parent().removeClass('hidden');
              }else{
                  $(i[l]).parent().addClass('hidden');
              }
            }
        }
    });
    
    var VisualView = Backbone.View.extend({
        className: 'visual',
        element: 'div',
        render: function() {
            this.$el.html('<canvas />');
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
        },
        events: {
        }
    });
    
    
    SongModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var self = this;
            var viewType = 'SongRow';
            if(options && options.hasOwnProperty('viewType')) {
                viewType = options.viewType;
            }
            if(!this.hasOwnProperty(viewType)) {
                if(!options) options = {};
                options.model = this;
                this[viewType] = new SongRow(options);
                this[viewType].on('queue', function(songModel, roomId){
                    var songqCollection = JukeBoxQueue.songsQueueList.collection;
                    var songq = new SongqModel({}, {collection: songqCollection});
                    songq.on("change", function(songq, options){
                        var s = songq.save(null, {silent: true, wait: true})
                            .done(function(s, typeStr, respStr) {
                                self.trigger('saved', songq);
                                songqCollection.add(songq);
                            });
                    });
                    var newSongq = {
                        song: songModel.attributes,
                        room_id: roomId
                    };
                    songq.set(newSongq, {wait: true});
                });
            }
            return this[viewType];
        }
    });
    
    SongCollection = Backbone.Collection.extend({
        model: SongModel,
        url: '/api/songs',
        initialize: function(docs, options) {
            var self = this;
        }, load: function(callback) {
            var self = this;
            this.reset();
            this.fetch({add:true});
        }, comparator: function(a,b) {
            return a.get('at') > b.get('at');
        }
    });
    
    SongListView = Backbone.View.extend({
        tag: 'div',
        className: 'songList',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            this.$ul = $('<ul class="songs"></ul>');
            var self = this;
            if(!this.collection) {
                this.collection = new SongCollection();
            }
            this.collection.on('add', function(doc, col) {
                var $li = $('<li></li>');
                var view = doc.getView();
                $li.append(view.render().el);
                $li.attr('data-id', doc.get('id'));
                self.$ul.prepend($li);
                
                doc.on('remove', function(){
                    $li.remove();
                    return false;
                });
            });
            this.collection.load();
        },
        events: {
            "click li": "selectLi"
        },
        selectLi: function(el) {
            //var room = this.collection.get($(el.target).attr('data-id'));
            //this.trigger('select', room);
            $(el.target).parent('li').attr('selected', true);
            $(el.target).parent('li').siblings().removeAttr('selected');
        }
    });
    
    SongqModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var viewType = 'SongqRow';
            if(options && options.hasOwnProperty('viewType')) {
                viewType = options.viewType;
            }
            if(!this.hasOwnProperty(viewType)) {
                if(!options) options = {};
                options.model = this;
                this[viewType] = new SongqRow(options);
            }
            return this[viewType];
        }
    });
    
    SongqCollection = Backbone.Collection.extend({
        model: SongqModel,
        url: '/api/songq',
        initialize: function(docs, options) {
            var self = this;
            this.fitler = {};
        }, load: function(callback) {
            var self = this;
            this.reset();
            
            this.dataFilter.sort = 'rank';
            
            var options = {data: this.dataFilter};
            options.add = true;
            
            if(callback) options.success = callback;
            this.fetch(options);
        }, comparator: function(a) {
            return a.get('rank');
        },
        addFilter: function(obj) {
            this.dataFilter = obj;
        }
    });
    
    SongqListView = Backbone.View.extend({
        tag: 'div',
        className: 'songsQueueList',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$ul);
            this.$el.append(this.$skip);
            this.setElement(this.$el);
            return this;
        },
        sort: function() {
            var self = this;
            var prevRank = 0;
            var lis = this.$el.find('li');
            lis.each(function(i,e){
                var $e = $(e);
                var r = parseInt($e.attr('data-rank'), 10);
                if(i == 0) {
                    prevRank = r;
                } else {
                    if(r < prevRank) {
                        $(lis[i-1]).before(e);
                        self.sort();
                    }
                    prevRank = r;
                }
            });
            this.collection.each(function(m,i,c){
                m.getView().render();
            });
        },
        initialize: function(options) {
            this.$ul = $('<ul class="songs"></ul>');
            this.$skip = $('<button class="skip">☣</button>');
            var self = this;
            if(!this.collection) {
                this.collection = new SongqCollection();
                this.collection.list = this;
            }
            this.room_id = options.roomId;
            this.collection.on('reset', function() {
                self.$ul.html('');
                self.render();
            });
            this.collection.on('add', function(doc, col) {
                var $li = $('<li></li>');
                $li.attr('data-rank', doc.get('rank'));
                var view = doc.getView();
                $li.append(view.render().el);
                
                if(self.$ul.children().length === 0) {
                    self.$ul.append($li);
                } else {
                    var inserted = false;
                    self.$ul.find('li').each(function(i,e){
                        if(!inserted && $(e).attr('data-rank') > doc.get('rank')) {
                            $(e).before($li);
                            inserted = true;
                        }
                    });
                    if(!inserted) {
                        self.$ul.append($li);
                    }
                }
                
                doc.on('remove', function(){
                    $li.remove();
                    return false;
                });
            });
            this.collection.addFilter({room_id: options.roomId});
            this.collection.load();
            
            var insertOrUpdateSongQ = function(songq) {
                var model = self.collection.get(songq.id);
                if(!model) {
                    var model = new SongqModel(songq);
                    self.collection.add(model);
                } else {
                    var view = model.getView();
                    model.set(songq, {silent:true});
                    view.render();
                    self.sort();
                }
            }
            chatSocket.on('songq', function(songq) {
                if(_.isArray(songq)) {
                    for(var i in songq) {
                        insertOrUpdateSongQ(songq[i]);
                    }
                } else {
                    if(songq.hasOwnProperty('deleted_id')) {
                        self.collection.remove(songq.deleted_id);
                    } else {
                        insertOrUpdateSongQ(songq);
                    }
                }
            });
        },
        events: {
            "click li": "selectLi",
            "click .skip": "skip"
        },
        selectLi: function(el) {
            //var room = this.collection.get($(el.target).attr('data-id'));
            //this.trigger('select', room);
            $(el.target).parent('li').attr('selected', true);
            $(el.target).parent('li').siblings().removeAttr('selected');
        },
        skip: function() {
            chatSocket.emit('skip', {room_id: this.room_id});
        }
    });
    
    var UserAvatar = Backbone.View.extend({
        tagName: 'span',
        className: 'user',
        render: function() {
            this.$el.html('');
            var $avatar = $('<img src="/jukebox/assets/img/icons/library.png" />');
            if(this.model && this.model.has('avatar')) {
                $avatar.attr('src', '/api/files/'+this.model.get('avatar'));
            }
            this.$el.prepend($avatar);
            this.$el.addClass(this.model.get('name'));
            this.$el.attr('data-id', this.model.get('id'));
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
        },
        events: {
        }
    });
    
    var SongqRow = Backbone.View.extend({
        tagName: 'span',
        className: 'songq',
        render: function() {
            this.$el.html('<span class="dj" title="'+this.model.get('dj').name+'"></span><span class="title">'+this.model.get('song').title+'</span> - <span class="artist">'+this.model.get('song').artist+'</span>');
            this.$actions = $('<div class="actions"></div>');
            this.$actions.append('<button class="upAll" title="Move to top">▲</button>');
            this.$actions.append('<button class="upOne" title="Move up one spot">△</button>');
            this.$actions.append('<button class="downOne" title="Move down one spot">▽</button>');
            this.$actions.append('<button class="downAll" title="Move to bottom">▼</button>');
            this.$actions.append('<button class="remove" title="Remove from queue spot '+this.model.get('rank')+'">x</button>');
            this.$el.append(this.$actions);
            this.$el.attr('title', this.model.get('song').ss);
            this.$el.attr('data-id', this.model.get('id'));
            this.$el.find('.dj').append(this.userAvatar.render().el);
            this.setElement(this.$el);
            this.$el.attr('data-rank', this.model.get('rank'));
            this.$el.parent().attr('data-rank', this.model.get('rank'));
            return this;
        },
        initialize: function() {
            var self = this;
            this.user = window.usersCollection.get(this.model.get('dj').id);
            this.userAvatar = new UserAvatar({model: this.user});
        },
        events: {
            "click .remove": "unqueueSong"
            , "click .upAll": "queueToTop"
            , "click .downAll": "queueToBottom"
            , "click .upOne": "queueUpOne"
            , "click .downOne": "queueDownOne"
        },
        queueToTop: function() {
            var self = this;
            self.model.collection.sort({silent: true});
            var topRank = parseInt(self.model.collection.at(0).get('rank'),10);
            var topModel = self.model.collection.at(0);
            topModel.save({rank: topRank-1}, {wait: true})
                .done(function(s, typeStr, respStr) {
                });
            
            var s = self.model.save({rank: topRank}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
        },
        queueToBottom: function() {
            var self = this;
            self.model.collection.sort({silent: true});
            var bottomRank = this.model.collection.last().get('rank') + 1;
            var s = this.model.save({rank: bottomRank}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
        },
        queueUpOne: function() {
            var self = this;
            self.model.collection.sort({silent: true});
            var r = self.model.get('rank');
            var higherRank = r - 1;
            var sibId = this.$el.parents('li').prev().find('.songq').attr('data-id');
            var swapModel = self.model.collection.get(sibId);
            console.log(swapModel);
            var sm = swapModel.save({rank:r}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
            var s = self.model.save({rank: higherRank}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
        },
        queueDownOne: function() {
            var self = this;
            self.model.collection.sort({silent: true});
            var r = self.model.get('rank');
            var lowerRank = r + 1;
            console.log(self.model.collection)
            console.log({rank: lowerRank})
            var sibId = this.$el.parents('li').next().find('.songq').attr('data-id');
            console.log(this.$el.parents('li'))
            console.log(this.$el.parents('li').next())
            var swapModel = self.model.collection.get(sibId);
            console.log(swapModel);
            var sm = swapModel.save({rank:r}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
            var s = self.model.save({rank: lowerRank}, {wait: true})
                .done(function(s, typeStr, respStr) {
                    self.render();
                    self.model.collection.list.sort();
                });
        },
        unqueueSong: function() {
            this.model.destroy();
        }
    });
    
    
    SongpModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var viewType = 'SongpRow';
            if(options && options.hasOwnProperty('viewType')) {
                viewType = options.viewType;
            }
            if(!this.hasOwnProperty(viewType)) {
                if(!options) options = {};
                options.model = this;
                this[viewType] = new SongpRow(options);
            }
            return this[viewType];
        }
    });
    
    SongpCollection = Backbone.Collection.extend({
        model: SongpModel,
        url: '/api/songp',
        initialize: function(docs, options) {
            var self = this;
            this.fitler = {};
        }, load: function(callback) {
            var self = this;
            this.reset();
            this.dataFilter.limit = 15;
            this.dataFilter.sort = 'pAt-';
            var options = {data: this.dataFilter};
            options.add = true;
            
            if(callback) options.success = callback;
            this.fetch(options);
        }, comparator: function(a,b) {
            return a.get('pAt') < b.get('pAt');
        },
        addFilter: function(obj) {
            this.dataFilter = obj;
        }
    });
    
    SongpListView = Backbone.View.extend({
        tag: 'div',
        className: 'songsPlayedList',
        render: function() {
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            return this;
        },
        initialize: function(options) {
            this.$ul = $('<ul class="songs"></ul>');
            var self = this;
            if(!this.collection) {
                this.collection = new SongpCollection();
            }
            this.room_id = options.roomId;
            this.collection.on('add', function(doc, col) {
                var $li = $('<li></li>');
                var view = doc.getView();
                $li.append(view.render().el);
                $li.attr('data-id', doc.get('id'));
                $li.attr('data-pAt', doc.get('pAt'));
                
                if(self.$ul.children().length === 0) {
                    self.$ul.append($li);
                } else {
                    var inserted = false;
                    self.$ul.find('li').each(function(i,e){
                        if(!inserted && $(e).attr('data-pAt') > doc.get('pAt')) {
                            $(e).before($li);
                            inserted = true;
                        }
                    });
                    if(!inserted) {
                        self.$ul.append($li);
                    }
                }
                
                doc.on('remove', function(){
                    $li.remove();
                    return false;
                });
            });
            this.collection.addFilter({room_id: options.roomId});
            this.collection.load();
        },
        events: {
            "click li": "selectLi"
        },
        selectLi: function(el) {
            //var room = this.collection.get($(el.target).attr('data-id'));
            //this.trigger('select', room);
            $(el.target).parent('li').attr('selected', true);
            $(el.target).parent('li').siblings().removeAttr('selected');
            
            jukeboxNav.go('Queue');
        }
    });
    
    SongpRow = Backbone.View.extend({
        tag: 'span',
        className: 'songp',
        render: function() {
            if(this.model.get('song')) {
                this.$el.html('<span class="dj" title="'+this.model.get('dj').name+'"></span><span class="title">'+this.model.get('song').title+'</span> - <span class="artist">'+this.model.get('song').artist+'</span>');
            }
            if(this.model.has('pAt')) {
                this.$el.append('<span class="pAt" title="'+this.model.get('pAt')+'">'+moment(this.model.get('pAt')).fromNow()+'</span>');
            }
            this.$el.attr('data-id', this.model.get('id'));
            this.$el.find('.dj').append(this.userAvatar.render().el);
            this.setElement(this.$el);
            return this;
        },
        initialize: function() {
            var self = this;
            this.user = window.usersCollection.get(this.model.get('dj').id);
            this.userAvatar = new UserAvatar({model: this.user});
        },
        events: {
        }
    });
    
    var formatSeconds = function(seconds) {
        var str = '';
        str = Math.floor(seconds/60) +':'+ pad(Math.floor(seconds%60));
        return str;
    }
    
    var SongRow = Backbone.View.extend({
        tag: 'span',
        className: 'song',
        render: function() {
            var str = '<span class="title">'+this.model.get('title')+'</span> ';
            if(this.model.has('duration')) {
                str = '<span class="duration">'+formatSeconds(this.model.get('duration'))+'</span> '+str;
            }
            if(this.model.get('album')) {
                str += '<span class="album">'+this.model.get('album')+'</span>';
            }
            if(this.model.get('artist')) {
                str += '<span class="artist">'+this.model.get('artist')+'</span>';
            }
            if(this.model.has('playCount')) {
                str += '<span class="playCount" title="last played '+moment(this.model.get('lastPlayedAt')).fromNow()+'">'+this.model.get('playCount')+' plays</span>';
            }
            if(this.model.has('lastPlayedAt')) {
                str += '<span class="lastPlayedAt" style="display:none;" title="'+this.model.get('lastPlayedAt')+'">'+moment(this.model.get('lastPlayedAt')).fromNow()+'</span>';
            }
            this.$actions = $('<div class="actions"></div>');
            this.$actions.html('<button class="delete" title="Delete Song">x</button><button class="edit" title="Edit Song">/</button><button class="play" title="Preview Song">▸</button><button class="queue" title="Queue Song">❥</button>');
            this.$el.html(str);
            this.$el.append(this.$actions);
            this.$el.attr('data-id', this.model.get('id'));
            this.$el.attr('data-ss', this.model.get('ss'));
            this.setElement(this.$el);
            return this;
        },
        renderForm: function() {
            this.$el.children().hide();
            this.$f = $('<form></form>');
            var $duration = $('<input type="text" placeholder="duration" name="duration" />');
            var $title = $('<input type="text" placeholder="title" name="title" />');
            var $artist = $('<input type="text" placeholder="artist" name="artist" />');
            var $album = $('<input type="text" placeholder="album" name="album" />');
            
            $title.val(this.model.get('title'));
            
            if(this.model.has('duration')) {
                $duration.val(this.model.get('duration'));
            }
            if(this.model.has('artist')) {
                $artist.val(this.model.get('artist'));
            }
            if(this.model.has('album')) {
                $album.val(this.model.get('album'));
            }
            
            this.$f.append($duration);
            this.$f.append($title);
            this.$f.append($artist);
            this.$f.append($album);
            this.$f.append('<input type="submit" value="save" /><button class="cancel">cancel</button>');
            
            this.$el.append(this.$f);
            
            $title.focus();
        },
        removeForm: function() {
            this.$f.remove();
            this.$el.children(':not(button)').show();
        },
        initialize: function() {
            var self = this;
        },
        events: {
            "click .queue": "queueSong"
            , "click .play": "playSong"
            , "click .edit": "editSong"
            , "click .delete": "deleteSong"
            , "submit": "submit"
            , "click .cancel": "cancel"
        },
        cancel: function() {
            this.removeForm();
            return false;
        },
        submit: function() {
            var self = this;
            var newObj = {};
            var sa = this.$f.serializeArray();
            for(var i in sa) {
                var field = sa[i].name;
                newObj[field] = sa[i].value;
            }
            var s = self.model.save(newObj, {silent: true, wait: true})
                .done(function(s, typeStr, respStr) {
                    delete self.model.changed.at;
                    delete self.model.changed.id;
                    delete self.model.changed.user;
                    self.trigger('saved', self.model);
                    self.render();
                });
            self.removeForm();
            
            return false;
        },
        editSong: function() {
            //formInPlace
            this.renderForm();
        },
        deleteSong: function() {
            if(confirm("Are you sure that you want to delete this song?")) {
                this.model.destroy();
            }
        },
        playSong: function() {
            // play song
            mediaPlayer.loadSong('/api/files/'+encodeURIComponent(this.model.get('filename')), this.model);
        },
        queueSong: function() {
            this.$el.attr('data-queue', true);
            this.$el.siblings().removeAttr('data-queue');
            //console.log('queue to room id '+$('.chatroom[selected]').attr('data-id'))
            this.trigger('queue', this.model, $('.chatroom[selected]').attr('data-id'));
        }
    });
    
    var SongRatingModel = Backbone.Model.extend({
        initialize: function() {
            var self = this;
        },
        getView: function(options) {
            var self = this;
            var viewType = 'SongRatingRow';
            if(options && options.hasOwnProperty('viewType')) {
                viewType = options.viewType;
            }
            if(!this.hasOwnProperty(viewType)) {
                if(!options) options = {};
                options.model = this;
                this[viewType] = new SongRatingRow(options);
            }
            return this[viewType];
        }
    });
    
    var SongRatingCollection = Backbone.Collection.extend({
        model: SongRatingModel,
        url: '/api/songr',
        initialize: function(docs, options) {
            var self = this;
        }, load: function(callback) {
            var self = this;
            this.dataFilter.sort = 'at-';
            var options = {data: this.dataFilter, add: true};
            if(callback) options.success = callback;
            this.reset();
            this.fetch(options);
        }, comparator: function(a,b) {
            return a.get('at') > b.get('at');
        },
        addFilter: function(obj) {
            this.dataFilter = obj;
        }
    });
    
    var SongRatingListView = Backbone.View.extend({
        tag: 'div',
        className: 'songRatingList',
        render: function() {
            this.$el.html('');
            this.$el.append(this.$ul);
            this.setElement(this.$el);
            
            return this;
        },
        initialize: function(options) {
            this.$ul = $('<ul class="songs"></ul>');
            var self = this;
            if(!this.collection) {
                this.collection = new SongRatingCollection();
                if(options.song_id) {
                    this.collection.addFilter({song_id:options.song_id});
                }
            }
            this.collection.on('add', function(doc, col) {
                var $li = $('<li></li>');
                var view = doc.getView();
                $li.append(view.render().el);
                $li.attr('data-id', doc.get('id'));
                self.$ul.prepend($li);
                
                doc.on('remove', function(){
                    $li.remove();
                    return false;
                });
            });
            this.collection.load();
            var insertOrUpdateSongRating = function(songr) {
                var r = self.collection.get(songr.id);
                if(!r) {
                    var songRating = new SongRatingModel(songr);
                    self.collection.add(songRating);
                } else {
                    var view = r.getView();
                    if(!view.editing) {
                        r.set(songr, {silent:true});
                        view.render();
                    }
                }
            }
            chatSocket.on('songr', function(songr) {
                if(_.isArray(songr)) {
                    for(var i in songr) {
                        insertOrUpdateSongRating(songr[i]);
                    }
                } else {
                    insertOrUpdateSongRating(songr);
                }
            });
        },
        events: {
            "click li": "selectLi"
        },
        selectLi: function(el) {
            $(el.target).parent('li').attr('selected', true);
            $(el.target).parent('li').siblings().removeAttr('selected');
        }
    });
    
    var SongRatingRow = Backbone.View.extend({
        tag: 'span',
        className: 'songRating',
        render: function() {
            
            if(!this.user && this.model.has('user')) {
                this.user = window.usersCollection.get(this.model.get('user').id);
                this.userAvatar = new UserAvatar({model: this.user});
            }
            var ts = '';
            if(this.model.has('ts')) {
               ts = ' @ '+formatMsTime(this.model.get('ts') * 1000);
            }
            this.$el.html('<span class="user"></span> rating '+this.model.get('score')+'%'+ts);
            if(this.model.has('msg')) {
                this.$el.append('<span class="msg">'+this.model.get('msg')+'</span>');
            }
            this.$el.prepend(this.$f);
            this.$el.attr('data-id', this.model.get('id'));
            if(this.userAvatar) {
                this.$el.find('.user').append(this.userAvatar.render().el);
            }
            this.setElement(this.$el);
            if(this.editing) {
                this.showMsgForm();
            }
            return this;
        },
        initialize: function() {
            var self = this;
            var formStyle = this.editing ? '' : 'display:none';
            this.$f = $('<form style="'+formStyle+'"><input type="text" placeholder="add a comment" name="msg" autocomplete="off" /><input type="submit" value="comment" /></form>');
            this.$msg = this.$f.find('input[name="msg"]');
        },
        events: {
            "submit": "submit"
        },
        submit: function(el) {
            var self = this;
            
            this.model.set({msg: this.$msg.val()}, {wait: true});
            this.hideMsgForm();
            this.render();
            // TODO Chat msg
            
            return false;
        },
        clear: function() {
            this.$msg.val('');
            this.render();
            this.focus();
        },
        focus: function() {
            this.$msg.focus();
        },
        toggleForm: function() {
            if(this.editing) {
                this.hideMsgForm();
            } else {
                this.showMsgForm();
            }
        },
        showMsgForm: function() {
            this.$f.show();
            this.focus();
            this.editing = true;
        },
        hideMsgForm: function() {
            this.$f.hide();
            this.editing = false;
        }
    });
    
    jukebox.init = function($el, callback) {
        var self = this;
        this.initAuth(function(loginStatus){
            
            if($el && loginStatus && loginStatus.has('groups') && loginStatus.get('groups').indexOf('friend') !== -1) {
                var $app = $('<div id="app"></div>');
                $el.append($app);
                require(['aurora.js'], function() {
                    require(['mp3.js'], function() { require(['flac.js'], function() { require(['alac.js'], function() { require(['aac.js'], function() {
                        require(['dancer.js'], function() {
                            require(['moment.min.js'], function(){
                                self.view = new AppView({el: $app});
                                
                                self.view.render();
                                
                                if(callback) callback();
                            });
                        });
                    }); }); }); });
                });
            } else {
                alert('401');
            }
        });
    }
    
    jukebox.initAuth = function(callback) {
        require(['houseAuth.js'], function(auth) {
            auth.get(function(err, loginStatus){
                var $profile = $('<div id="me"></div>');
                $('body').append($profile);
                if(err) {
                    
                } else if(loginStatus) {
                    if(loginStatus && loginStatus.has('user')) {
                        jukebox.user = loginStatus.user;
                        var profileView = loginStatus.getView();
                        $profile.html(profileView.render().el);
                        callback(loginStatus);
                    } else {
                        if(!jukebox.hasOwnProperty('$loginPrompt')) {
                            var $auth = $('<div></div>');
                            jukebox.$loginPrompt = $('<div class="lightbox"></div>');
                            var $close = $('<p class="close"><a href="#" title="close"></a></p>').click(function(){
                                jukebox.$loginPrompt.hide();
                                return false;
                            });
                            jukebox.$loginPrompt.hide();
                            $('body').append(jukebox.$loginPrompt.append($auth).append($close));
                        }
                        
                        var $loginButton = $('<button>login</button>').click(function(){
                            promptLogin();
                        });
                        $profile.html($loginButton);
                        
                        var promptLogin = function() {
                            jukebox.$loginPrompt.show();
                            auth.prompt($auth).authorized(function(loginStatus){
                                jukebox.$loginPrompt.hide();
                                var profileView = loginStatus.getView();
                                $profile.html(profileView.render().el);
                                
                                callback(loginStatus);
                            });
                        }
                    }
                }
            });
        });
    }
    
    if(define) {
        define(function () {
            return jukebox;
        });
    }
    function pad(n){
        return n > 9 ? ''+n : '0'+n;
    }
})();
