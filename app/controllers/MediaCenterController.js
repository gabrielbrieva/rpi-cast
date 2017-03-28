angular.module('MediaCenter')
    .config(function($mdThemingProvider) {
        $mdThemingProvider.definePalette('customprimary', {
          '50': 'e9e9e9',
          '100': 'c9c9c9',
          '200': 'a5a5a5',
          '300': '818181',
          '400': '666666',
          '500': '4b4b4b',
          '600': '444444',
          '700': '3b3b3b',
          '800': '333333',
          '900': '232323',
          'A100': 'f18080',
          'A200': 'ec5252',
          'A400': 'ff0c0c',
          'A700': 'f10000',
          'contrastDefaultColor': 'light',
          'contrastDarkColors': [
            '50',
            '100',
            '200',
            '300',
            'A100',
            'A200'
          ],
          'contrastLightColors': [
            '400',
            '500',
            '600',
            '700',
            '800',
            '900',
            'A400',
            'A700'
          ]
        });

       $mdThemingProvider.theme('default')
           .primaryPalette('customprimary');
        
    })
    .controller('MediaCenterController',function ($scope, $timeout, $mdSidenav, $log, srvHomeCastSender) {
        $scope.togglePlaylist = buildDelayedToggler('playlist');
        $scope.isOpenPlaylist = function () {
            return $mdSidenav('playlist').isOpen();
        };

        /**
         * Supplies a function that will continue to operate until the
         * time is up.
         */
        function debounce(func, wait, context) {
            var timer;

            return function debounced() {
                var context = $scope,
                args = Array.prototype.slice.call(arguments);
        
                $timeout.cancel(timer);
                timer = $timeout(function () {
                    timer = undefined;
                    func.apply(context, args);
                }, wait || 10);
            };
        }

        /**
         * Build handler to open/close a SideNav; when animation finishes
         * report completion in console
         */
        function buildDelayedToggler(navID) {
            return debounce(function () {
                // Component lookup should always be available since we are not using `ng-if`
                $mdSidenav(navID)
                        .toggle()
                        .then(function () {
                            $log.debug("toggle " + navID + " is done");
                        });
            }, 200);
        }
        
        $scope.homeCastSender = srvHomeCastSender;
    });

