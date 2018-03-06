class WeekPlanner{
	constructor(){
		// A variable to store the currently selected room
		var selectedRoom;
		// The currently selected/shown week
		var week = getWorkWeekDates(moment().startOf('isoweek'));

		// Start loadingprocess by loading the room
		loadRoom();
		// Call function that places all eventlisteners for week-planner
		createEventListeners();

		function loadRoom(roomName){
			// Default to Rum 1
			if(!roomName){
				roomName = 'Auditorium 1';
			}
			setSelectedRoom(roomName, loadWeek);
		}

		function loadWeek(){
			$('.seats').text(selectedRoom.seats);
  			$('.projector').text(selectedRoom.projector);
			createWeek();
		}

		// createWeek uses the currently selected week and creates an
		// array of objects containing information we want to pass on
		// to the template.  
		function createWeek(){
			var thisWeek = week;
			var resultWeek = [];
		  	var dayArr = ['.','Mo', 'Tu', 'We', 'Th', 'Fr'];
		  	var monthArr = ['Jan', 'Feb', 'Mar', 'Apr', 
		  					'May', 'Jun', 'Jul', 'Aug', 
		  					'Sep', 'Oct', 'Nov', 'Dec'];

		  	for(let i = 0; i < 5; i++){
		  		var date = thisWeek[i];
		  		findBookings(date, function(returnObj){
		  			// Prepare the found bookings with some additional
		  			// props not stored in database
		  			returnObj.bookings.forEach(function(booking){
		  				let timeFromHour = moment(booking.timeFrom).hours(),
		  					timeToHour = moment(booking.timeTo).hours();

		  				// Calc the col length of the booking and then
		  				// add a value to convert it to columns length for use with bootstrap grid
		  				booking.hours = (timeToHour - timeFromHour);
		  				booking.hours = booking.hours > 4 ? booking.hours = booking.hours + 2 : booking.hours + 1; 

		  				// If booking is for afternoon, add a large or small offset
		  				// depending on if a morning booking exists
		  				if(timeFromHour > 12){
		  					if(returnObj.bookings.length < 2){
		  						booking.offset = 6;
		  					}
		  					else{
		  						booking.offset = 1;
		  					}
		  				}
		  			});

		  			// Sort the bookings with earliest in the day first
		  			returnObj.bookings.sort(function(a,b){
		  				let aTime = moment(a.timeFrom);
		  				let bTime = moment(b.timeFrom);

		  				if (aTime < bTime) {
							return -1;
						}
						if (aTime > bTime) {
						    return 1;
						}
						return 0;
		  			});

		  			// Push one date with all its info to the resultWeek array
			  		resultWeek.push({
			  			timestamp: returnObj.date.format('x'),
			  			date: returnObj.date.date(),
			  			day: dayArr[returnObj.date.day()],
			  			weekNum: returnObj.date.week(),
			  			month: monthArr[returnObj.date.month()],
			  			bookings: returnObj.bookings
			  		});
			  		if(resultWeek.length === 5){
			  			resultWeek.sort(function(a,b){
			  				return a.timestamp - b.timestamp;
			  			});
			  			createTemplate(resultWeek);
			  		}
		  		});
		  	}
		}

		// Get the next workingweek dates from a given weekstart. 
		function getWorkWeekDates(start){
			let returnWeek = [];

			for(let i = 0; i < 5; i++){
				returnWeek.push(start.clone().add(i,'day'));
			}
			return returnWeek;
		}

		// Adds or subtracts 1 week to the variable week.
		function changeWeek(direction){

			if(direction === 'next'){
				let start = week[0].add(1, 'weeks');
				week = getWorkWeekDates(start);
			}
			else{
				let start = week[0].subtract(1, 'weeks');
				week = getWorkWeekDates(start);
			}
		}

		// Finds all bookings made for the currently selected room on a given date
		// executes callback passing a returnObj containing the results and the passed
		// date
		function findBookings(date, callback){

			Booking.find(`find/{ $and: [
				{ room: "` + selectedRoom._id + `" },
				{ date: ` + date.format('x') +  ` }]}`
			,function(data,err){

				var returnObj = {
					date: date,
					bookings: data
				};

				callback(returnObj);
			});
		}

		// Set the variable selectedRoom
		function setSelectedRoom(roomName, callback){
			Room.find('find/{name:"' + roomName + '"}', function(data,err){
  				selectedRoom = data[0];
  				callback();	
  			});
		}

		// Create a week-planner template passing thisWeek, which contains information
		// about the weeks days and their bookings. 
	  	function createTemplate(thisWeek){
	  		$('.week-planner-container').empty();
			$('.week-planner-container').template('week-planner',{
				week : thisWeek
			});
		}

		// Create a new booking with the arguments passed. 
		function createBooking(room, course, date, timeFrom, timeTo, type) {
            Booking.create({
                room: room._id,
                course: course,
                date: date.format('x'),
                timeFrom: timeFrom,
                timeTo: timeTo,
                bookedBy: user.username,
                type: type
            }, (booking)=> {
            	// Add the new booking to the rooms bookings array
            	selectedRoom.bookings.push(booking._id);
            	// Then save
            	Room.update(selectedRoom._id, {
            		bookings: selectedRoom.bookings
            	});
            	// reload the week display
                loadWeek();
            });
        }

        // Set up the booking modal and 
        function prepareModal(date, clickedRow){
			let thisDate = moment(date),
				thisDateFormatted = thisDate.format('LL');

			// Populate courses and the callback createModal
			populateCourses(user.courses, thisDate, clickedRow,thisDateFormatted, createModal);
		}

		// Create the bookingModal with given data and show it
		function createModal(thisDate, clickedRow, thisDateFormatted, courses){

			new BookingModal(selectedRoom, thisDateFormatted, courses);
			let bookings = clickedRow.find('.booking');

			// If any bookings already exist, disable wholeday
			if(bookings.length > 0){
				$('#timeSelect').find('option[value="wholeday"]').prop('disabled', true);
			}

			// Further possible disables
			bookings.each(function(booking){
				let timeFrom = moment($(this).data('time-from')),
					timeTo = moment($(this).data('time-to')),
					hours = timeTo.hours() - timeFrom.hours();

				// if any booking is for a whole day, disable the all choices
				if(hours > 4){
					$('#timeSelect').find('option[value="morning"]').prop('disabled', true);
					$('#timeSelect').find('option[value="afternoon"]').prop('disabled', true);
				}

				if(timeFrom.hours() === 8){
					$('#timeSelect').find('option[value="morning"]').prop('disabled', true);
				}
				else{
					$('#timeSelect').find('option[value="afternoon"]').prop('disabled', true);
				}
			});

			$('#bookingModal').find('.modal-body').find('.date').data('dateObj', thisDate);
			$('#bookingModal').modal('show');
		}

		// Populate courses
		function populateCourses(courses, thisDate, clickedRow, thisDateFormatted, callback) {
            let coursesIds = courses.map(course => '"' + course + '"');
            let queryString = 'find/{ _id: { $in: [' + coursesIds + '] } }';

            Course.find(queryString, (courses, err) => {
                 callback(thisDate, clickedRow,thisDateFormatted, courses);
            });
        }

		// Set up all the eventlisteners for the page. 
		function createEventListeners(){

	  		$('.page-content').on('click', '#prev', function(e){
	  			e.preventDefault();
	  			e.stopPropagation();
	  			
	  			changeWeek('prev');
	  			createWeek();
	  		});

	  		$('.page-content').on('click', '#next', function(e){
	  			e.preventDefault();
	  			e.stopPropagation();
	  			
	  			changeWeek('next');
	  			createWeek();
	  		});

	  		$('.page-content').on('change', '#roomSelect', function(){
	  			var roomName = $(this).val();
	  			setSelectedRoom(roomName, loadWeek);
	  			createWeek();
	  		});

	  		$('.page-content').on('click', '.booking', function(e){
	  			e.stopPropagation();

	  			let clickedBookingId = $(this).attr('data-booking-id');
	  			new BookingInfoModal(clickedBookingId, waitForModalLoad);
	  		});

	  		$('body').on('click', '.delete-button', function(){
	  			let clickedBookingId = $(this).closest('.modal-content').attr('data-booking-id');
	  			Booking.delete(clickedBookingId, function(){
	  				loadWeek();
	  			});
	  		});

	  		function waitForModalLoad(){
	  			$('#bookingInfoModal').modal('show');
	  		}

	  		$('.page-content').on('click', '#bookingInfoModal' , function(e){
	  			e.stopPropagation();
	  			alert('hej');
	  			$('#bookingInfoModal').hide();
				$('body').removeClass('modal-open');
				$('.modal-backdrop').remove();
	  		});

	  		$('.page-content').on('click', '.book-button', function(){

	  			let selectedCourseId = $('#courseSelect option:selected').attr('data-course-id');

	  			if( $('#courseSelect option:selected').is(':disabled')){
					$('#courseSelect').closest('.form-group').toggleClass('has-error');
					return;
				}

				if( $('#timeSelect option:selected').is(':disabled')){
					$('#timeSelect').closest('.form-group').toggleClass('has-error');
					return;
				}

				Course.find(selectedCourseId, function(data,err){
					let course = data,
						date = $('#bookingModal').find('.modal-body').find('.date').data('dateObj'),
						timeSpan = $('#timeSelect').val(),
						type = $('#typeSelect').val(),
						timeFrom,
						timeTo;

					// Set the timespan according to users choice
					if(timeSpan === 'morning'){
						timeFrom = date.clone().hours(8);
						timeTo = date.clone().hours(12);
					}
					else if(timeSpan === 'afternoon'){
						timeFrom = date.clone().hours(13);
						timeTo = date.clone().hours(17);
					}
					else{
						timeFrom = date.clone().hours(8);
						timeTo = date.clone().hours(17);
					}

					createBooking(selectedRoom,
								 course, 
								 date,
								 timeFrom,
								 timeTo,
								 type);
				});
				$('#bookingModal').hide();
				$('body').removeClass('modal-open');
				$('.modal-backdrop').remove();
			});

	  		// Bring up the booking modal when clicking a row
	  		$('.page-content').on('click', '.week-schedule-row', function(e){
	  			e.stopPropagation();

		  		// If the alert is open, close it by removing it when clicking anything. 
		  		$(document).on('click', 'body', onBodyClick);

	  			let clickedRow = $(this),
	  				clickedDate = clickedRow.data('timestamp'),
	  				error;

	  			if ( selectedRoom.type === 'classroom' && user.role === 'Student'){
	  				$('.alert > .close').trigger('click');
	  				$('.week-planner').append(
	  				'<div class="alert alert-danger alert-dismissible" role="alert">' + 
						'<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
						'Students are only authorized to book group rooms' +
					'</div>'
					);
	  			}
	  			else{
	  				prepareModal(clickedDate, clickedRow);
	  			}
	  		});

	  		function onBodyClick(e){
	  			e.preventDefault();
	  			e.stopPropagation();

	  			if( $('.alert-danger').length > 0){
	  				$('.alert > .close').trigger('click');
	  			}

		  		$(document).off('click', 'body', onBodyClick);
		  	}
	  	}
	}
}