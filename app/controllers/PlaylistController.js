angular.module('MediaCenter')
    .controller('PlaylistController', function ($scope, $mdSidenav, $log) {
        $scope.close = function () {
            // Component lookup should always be available since we are not using `ng-if`
            $mdSidenav('playlist').close()
                .then(function () {
                    $log.debug("close Playulist is done");
                });

        };
    });

