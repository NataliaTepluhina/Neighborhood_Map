window.onload = function() {

function ViewModel () {
    var self = this;
    var map,
        infowindow,
        bounds;

    // Set values from getDayOfWeek function and string in GooglePlaces'
    // open hours.
    var dateMap = {
        0: 'Monday',
        1: 'Tuesday',
        2: 'Wednesday',
        3: 'Thursday',
        4: 'Friday',
        5: 'Saturday',
        6: 'Sunday',
    };


     // Creates the map with the center in given coordinates (Budva, Montenegro by default).  Then gets popular
     // restaurants/bars/cafe in the area.

    function initMap() {
        city = {lat: 42.288056, lng: 18.8425};
        map = new google.maps.Map(document.getElementById('map'), {
            center: city,
            zoom: 15
        });

        getAllPlaces();
    }

    // Makes a request to Google for popular restaurants and hotels in a given place.
    // Executes a callback function with the response data from Google.

    self.allPlaces = ko.observableArray([]);

    function getAllPlaces() {
        self.allPlaces([]);
        var request = {
            location: city,
            radius: 2000,
            types: ['restaurant', 'cafe', 'bar', 'food']
        };
        infowindow = new google.maps.InfoWindow();
        service = new google.maps.places.PlacesService(map);
        service.nearbySearch(request, getAllPlacesCallback);
    }


     // Takes resulting places from getAllPlaces function, adds additional
     // properties to the places and adds them to the allPlaces array.

     
    function getAllPlacesCallback(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Create new bounds for the map updated with each new
            // location.  This will be used to make sure all markers are
            // visible on the map after the search.
            bounds = new google.maps.LatLngBounds();
            results.forEach(function (place) {
                place.marker = createMarker(place);                
                place.isInFilteredList = ko.observable(true);
                self.allPlaces.push(place);
                bounds.extend(new google.maps.LatLng(
                    place.geometry.location.lat(),
                    place.geometry.location.lng()));
            });
            map.fitBounds(bounds);
        }
    }

     
    // Takes a PlaceResult object and puts a marker on the map at its location.

    function createMarker(place) {
        var marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location,
        });

        // When a marker is clicked scroll the corresponding list view element
        // into view and click it.
        google.maps.event.addListener(marker, 'click', function () {
            document.getElementById(place.id).scrollIntoView();
            $('#' + place.id).trigger('click');
        });
        return marker;
    }


     // Takes place address from Google Places and returns only street.

    function getStreet(address) {
        var firstComma = address.indexOf(',');
        var street = address.slice(0, firstComma) + '.';
        return street;
    }

    // Takes place address from Google Places and returns city and state.

    function getCityState(address) {
        var firstComma = address.indexOf(',');
        var cityState = address.slice(firstComma + 1);
        return cityState;
    }


     // Converts numeric value from Date() to match values
     // used in the PlaceResult object opening_hours property.


    function getDayofWeek() {
        var date = new Date();
        var today = date.getDay();
        if (today === 0) {
            today = 6;
        } else {
            today -= 1;
        }
        return today;
    }

    // Array derived from allPlaces.  Contains each place that met the search
    // criteria.
    self.filteredPlaces = ko.computed(function () {
        return self.allPlaces().filter(function (place) {
            return place.isInFilteredList();
        });
    });

    // Currently selected location.
    self.chosenPlace = ko.observable();

    // Value associated with user input from search bar used to filter results.
    self.query = ko.observable('');

    // Break the user's search query into separate words and make them lowercase
    // for comparison between the places in allPlaces.
    self.searchTerms = ko.computed(function () {
        return self.query().toLowerCase().split(' ');
    });


     // Takes user's input in search bar and compares each word against the name
     // of each place in allPlaces.  Also compares against the place's type
     // (bar, restaurant, cafe etc.).  All places are initially removed from the
     // filteredPlaces array then added back if the comparison between name or
     // type returns true.
     
    self.search = function () {
        self.chosenPlace(null);
        infowindow.setMap(null);
        self.allPlaces().forEach(function (place) {
            place.isInFilteredList(false);
            place.marker.setMap(null);
        });
        self.searchTerms().forEach(function (word) {
            self.allPlaces().forEach(function (place) {
                // If search term is in the place's name or if the search term
                // is one of the place's types, that is a match.
                if (place.name.toLowerCase().indexOf(word) !== -1 ||
                    place.types.indexOf(word) !== -1) {
                    place.isInFilteredList(true);
                    place.marker.setMap(map);
                }
            });
        });
    };

    //Checks if our place matches chosenPlace. If yes, calls a function to show info in Google Maps infowindow, if not
    // stops all markers animation, sets a chosenPlace() to place and start its marker to bounce
    self.selectPlace = function (place) {
        if (place === self.chosenPlace()) {
            self.displayInfo(place);
        } else {
            self.filteredPlaces().forEach(function (result) {
                result.marker.setAnimation(null);
            });
            self.chosenPlace(place);
                 place.marker.setAnimation(google.maps.Animation.BOUNCE);
            self.displayInfo(place);
        }
    };

    self.displayingList = ko.observable(true);


    //Formats and shows informaton in Google infowindow on selected marker
    self.displayInfo = function (place) {
        var request = {
            placeId: place.place_id
        };
        service.getDetails(request, function (details, status) {
            // Default values to display if getDetails fails.
            var locName = '<h4>' + place.name + '</h4>';
            var locStreet = '';
            var locCityState = '';
            var locPhone = '';
            var locOpenHours = '';
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                if (details.website) {
                    // Add a link to the location's website in the place's name.
                    locName = '<h4><a target="_blank" href=' + details.website +
                        '>' + place.name + '</a></h4>';
                }
                if (details.formatted_phone_number) {
                    locPhone = '<p>' + details.formatted_phone_number + '</p>';
                }
                if (details.formatted_address) {
                    locStreet = '<p>' + getStreet(
                        details.formatted_address) + '</p>';
                    locCityState = '<p>' + getCityState(
                        details.formatted_address) + '<p>';
                }
                var today = getDayofWeek();
                if (details.opening_hours &&
                    details.opening_hours.weekday_text) {
                    openHours = details.opening_hours.weekday_text[today];
                    openHours = openHours.replace(dateMap[today] + ':',
                        "Today's Hours:");
                    locOpenHours = '<p>' + openHours + '</p>';
                }
            }
            var content = '<div class="infowindow">' + locName + locStreet +
                locCityState + locPhone + locOpenHours + '</div>';
            infowindow.setContent(content);
            infowindow.open(map, place.marker);
            self.getFoursquareData(place.name);
            map.panTo(place.marker.position);
        });
    };




    //Performs 2 ajax requests to FourSquare. First request is a simple search to find venue's FourSquare ID
    //Second request gets detailed venue information and photos with this ID
    self.fsName = ko.observable();
    self.fsImg = ko.observable();
    self.fsUrl = ko.observable();
    self.fsFacebook = ko.observable();
    self.fsRating = ko.observable();

    self.getFoursquareData = function(name) {
        var fsBaseUrl = 'https://api.foursquare.com/v2/venues/';
        var fsAuth = 'client_id=GNDUKRESL01WXW3BOFZS23GPCCRPC1VMQT4C4V3ROV51SRVR' +
            '&client_secret=3IH1BPNQD1TA50CBYQ4XGSN20WYFOFF3YPW5F4GIW5EQ1TOA&';
        var fsID;
        self.fsUrl('');
        self.fsImg('');
        self.fsFacebook('');
        self.fsRating('');
        var foursquareURL = fsBaseUrl + 'search?ll=42.288056,18.8425&query=' + name + '&' + fsAuth +'v=20160810';
            //Getting FourSquareID and url of the venue
            $.ajax({
                url: foursquareURL,

                success: function(data) {
                    if (data.response.venues.length > 0) {
                        fsID = data.response.venues[0].id;
                        if (data.response.venues[0].url) {
                            self.fsUrl(data.response.venues[0].url);
                        }

                        foursquareURL = fsBaseUrl + fsID + '?' + fsAuth +'v=20160810';

                        //Getting venue image, Facebook link and rating (if present in foursquare info)
                        $.ajax({
                            url: foursquareURL,
                            success: function(data) {
                                self.fsName(data.response.venue.name);

                                if (data.response.venue.bestPhoto) {
                                    self.fsImg(data.response.venue.bestPhoto.prefix + 'width300' + 
                                    data.response.venue.bestPhoto.suffix);
                                }

                                if (data.response.venue.contact.facebook) {
                                    self.fsFacebook('https://www.facebook.com/' + data.response.venue.contact.facebook);
                                }

                                if (data.response.venue.rating) {
                                    self.fsRating(data.response.venue.rating);
                                }
                            },

                            error: function(data) {
                                alert("Error occured while retrieving data from " +
                                    "FourSquare. Please try again later.");
                            }
                        });
                    }
                    else {
                        self.fsName('No such venue in FourSquare');
                    }
                },

                error: function(data) {
                    alert("Error occured while retrieving data from " +
                        "FourSquare. Please try again later.");
                }
            });
    };

    initMap();

}

ko.applyBindings(new ViewModel());

};