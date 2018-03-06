class AdminFilter {

	constructor(dbType) {
		this.dbType = dbType;
		this.resetLimit();
	}

	admin(input, callback) {
		return [
			() => { this.queryWrapper('Admin', `find/{ _limit: ` + this.limit + `, username: { $regex: /.*` + input + `.*/, $options: "i" } }`, callback); }
		];
	}

	course(input, callback) {
		return [
			() => { this.queryWrapper('Course', `find/{ _limit: ` + this.limit + `, $or: [
				{ name: { $regex: /.*` + input + `.*/, $options: "i" } },
				{ description: { $regex: /.*` + input + `.*/, $options: "i" } }
			]}`, callback); },
			() => { this.queryWrapperPopulated('Student', 'courses', this._TeacherAndStudent(input), callback); },
			() => { this.queryWrapperPopulated('Teacher', 'courses', this._TeacherAndStudent(input), callback); },
			() => { this.queryWrapperPopulated('Education', 'courses', `find/{ _limit: ` + this.limit + `, name: { $regex: /.*` + input + `.*/, $options: "i" } }`, callback); }
		];
	}

	student(input, callback) {
		return [
			() => { this.queryWrapper('Student', this._TeacherAndStudent(input), callback); },
			() => { this.queryWrapperPopulated('Course', 'students', `find/{ _limit: ` + this.limit + `, name: { $regex: /.*` + input + `.*/, $options: "i" } }`, callback); }
		];
	}

	teacher(input, callback) {
		return [
			() => { this.queryWrapper('Teacher', this._TeacherAndStudent(input), callback); },
			() => { this.queryWrapperPopulated('Course', 'teachers', `find/{ _limit: ` + this.limit + `, name: { $regex: /.*` + input + `.*/, $options: "i" } }`, callback); }
		];
	}

	announcement(input, callback) {
		return [
			() => { this.queryWrapper('Announcement', `find/{ _limit: ` + this.limit + `, $or: [
				{ message: { $regex: /.*` + input + `.*/, $options: "i" } }
				]}`, callback); }
		];
	}

	_TeacherAndStudent(input) {
		let inputAsArray = input.trim().replace(/\s{2,}/g, ' ').split(' ');
		let result = '';

		if (inputAsArray.length == 1 && inputAsArray[0].length) {
			result = `find/{ _limit: ` + this.limit + `, $or: [
				{ username: { $regex: /.*` + input + `.*/, $options: "i" } },
				{ firstname: { $regex: /.*` + input + `.*/, $options: "i" } },
				{ lastname: { $regex: /.*` + input + `.*/, $options: "i" } },
				{ phonenumber: { $regex: /.*` + input + `.*/, $options: "i" } }
			] }`;
		} else if (inputAsArray.length > 1) {
			result = `find/{ _limit: ` + this.limit + `, $and: [
				{ firstname: { $regex: /.*` + inputAsArray[0] + `.*/, $options: "i" } },
				{ lastname: { $regex: /.*` + inputAsArray[1] + `.*/, $options: "i" } }
			] }`;
		}

		return result;
	}

	// Internal functions

	run(input, callback, adminSearch) {
		let queries = [];
		adminSearchHashMap = [];
		adminSearchHashMapPopulated = [];
		let dbName = this.dbType[0].toUpperCase() + this.dbType.substr(1);

		if (!input.length) {
			queries.push(() => { this.queryWrapper(dbName, `find/{ _limit: ` + this.limit + ` }`, whenDone); });
		} else {
			queries = this[this.dbType].call(this, input, whenDone);
		}

		let numQueries = queries.length;

		queries.forEach((doQueryFunc) => {
			doQueryFunc();
		});

		function whenDone() {
			if (--numQueries === 0) {
				callback(adminSearch);
			}
		}
	}

	queryWrapper(dbSchema, query, callback) {
		let completeQuery = `` + query;

		window[dbSchema].find(completeQuery, (items) => {
			if (items.hasOwnProperty('_error')) {
				console.log('error', items._error);
			} else if (items.length) {
				items.forEach(item => adminSearchHashMap[item._id] = item);

				// adminSearchHashMap = items;
			}
			callback();
		});
	}

	queryWrapperPopulated(dbSchema, populationName, query, callback) {
		window[dbSchema].find(query, (items) => {
			if (items.hasOwnProperty('_error')) {
				console.log('error', items._error);
			} else if (items.length) {
				items = items[0];

				if (!items[populationName]) {
					console.log('Error queryWrapperPopulated:', populationName, 'not found in', dbSchema);
				} else if (items[populationName].length){
					adminSearchHashMapPopulated[getDbTypeAsPlural(dbSchema)] = {
						name: items.name || items.username,
						items: items[populationName]
					};
				}
			}
			callback();
		});
	}

	resetLimit() {
		this.limit = 5;
	}

	increaseLimit() {
		this.limit += 5;
	}

	toNumber(input) {
		var result = Number.parseInt(input);

		return isNaN(result) ? '' : result;
	}
}
