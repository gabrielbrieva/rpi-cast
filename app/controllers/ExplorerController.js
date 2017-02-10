var videoExtensions = ["MKV", "AVI", "MOV", "MP4", "OGG", "WEBM"];
var audioExtensions = ["MPGA", "WAV", "MP3"];
var imageExtensions = ["JPEG", "JPG", "GIF", "PNG"];

angular.module('MediaCenter')
    .controller('ExplorerController', ['$scope', '$http', 'srvHomeCastSender', function($scope, $http, srvHomeCastSender) {
        
        srvHomeCastSender.Init();

        $scope.homeCastSender = srvHomeCastSender;
        
        function CastFile(f, loadLocallyCallback) {
            if (srvHomeCastSender.session !== null)
            {
                mediaInfo = srvHomeCastSender.CreateMediaInfo(f);
                srvHomeCastSender.LoadMedia(mediaInfo);
            }
            else if (loadLocallyCallback)
            {
                loadLocallyCallback(f);
            }
        }
        
        $scope.getFiles = function (folder) {
            $http({
                method: 'POST',
                url: '/files',
                headers: {
                  'Content-Type': 'application/json'
                },
                data: folder ? folder : null
            }).then(function success(resp) {
                if (resp && resp.data) {
                    var r = resp.data;
                    
                    r.current.isFolder = r.current.type === "folder";
                    r.current.isRoot = r.current.name === "/";
                    
                    $scope.parents = r.parents;
                    $scope.current = r.current;
                    $scope.files = r.files;
                }
            },
            function err(response) {
                $scope.parents = null;
                $scope.current = null;
                $scope.files = null;
            });
        };
        
        $scope.loadFile = function (file) {
            if (file.extension && videoExtensions.indexOf(file.extension) !== -1) {
                CastFile(file, null/*getVideo*/);
            } else if (file.extension && audioExtensions.indexOf(file.extension) !== -1) {
                //CastFile(file, getAudio);
            } else if (file.extension && imageExtensions.indexOf(file.extension) !== -1) {
                //CastFile(file, getImage);
            }
        };
        
        $scope.parents = null;
        $scope.current = null;
        $scope.files = null;
        
        $scope.getFiles();
        
    }]);