function WordFreq() {
	this.dictionary = {};
	this.stopwords = [];
	this.ewma = 1;
	this.ewma_timer = null;
	this.remove_threshold = 0;

	this.cb = {};
	this.cb.newWord = []; // callback( newWord )
	this.cb.updatedWord = []; // callback( updatedWord, newCount )
	this.cb.removedWord = []; // callback( removedWord )
	this.cb.tick = []; // callback( reduction_function )
}

var dispatch_callback = function (/* cb array, arguments, … */) {
	// Prepare the argument array
	var args = [];
	for( var i=1; i<arguments.length; i++ ) {
		args.push(arguments[i]);
	}

	// Call all callback functions with the arguments
	for( var i in arguments[0] ) {
		arguments[0][i].apply(window, args);
	}
};

WordFreq.prototype.addWords = function (words) {  
	if( typeof(words) == 'string' ) words = [ words ];
	for(var i in words) {
		var word = words[i];
		if( $.inArray(word.toLowerCase(), this.stopwords) > -1 ) continue;

		var old = this.dictionary[word.toLowerCase()];
		if( old == undefined ) { // New word, init empty
			old = {count: 0, active:1, caps: {}};
			dispatch_callback( this.cb.newWord, word.toLowerCase() );
		}
		if( old.caps[word] == undefined ) old.caps[word] = 0;

		old.count++;
		old.caps[word]++;

		this.dictionary[word.toLowerCase()] = old;
		
		dispatch_callback( this.cb.updatedWord, word.toLowerCase(), old.count );
	}
	
	this.sortDictionary();
	this.updateList();
	this.cleanup();
};

WordFreq.prototype.updateList = function() {
  var output = "";
  for(var w in this.dictionary) { 
    output += "<div class='item "+(this.dictionary[w].active==1 ? "active" : "")+"'>";
    output += "<span class='word'>"+w+"</span>";
    output += "<span class='count'>"+this.dictionary[w].count+ " " + this.dictionary[w].cleanup +"</span>";
    output += "</div>";
  };
  
  $('#words_list').html(output);
}

WordFreq.prototype.sortDictionary = function() {
  var keys = this.getSortedWords();
  var key;
  
  var newDictionary = {};
  
  for(var i in keys ) {
    key = keys[i];
    
    if ( i < 10 )  { 
      this.dictionary[key].active = 1;
      this.dictionary[key].cleanup = 0; 
    }
    else if ( this.dictionary[key].active == 1 ) { 
      this.dictionary[key].active = 0; 
      this.dictionary[key].cleanup = 1; 
    }
    
    newDictionary[key] = this.dictionary[key];
  }
  
  this.dictionary = newDictionary;
}

WordFreq.prototype.tick = function () {
	var that = this;
	var reduce = function (input) { return input * that.ewma; };
	$.each(this.dictionary, function (index, value) {
		$.each(value.caps, function(index, value) {
			value = reduce(value);
		});
		value.count = reduce(value.count);
		dispatch_callback( that.cb.updatedWord, index, value.count );
	});
	this.cleanup();
	dispatch_callback( this.cb.tick, reduce );
};

WordFreq.prototype.cleanup = function () {
  
  for(var i in this.dictionary) {
    if ( this.dictionary[i].cleanup == 1 ) {
      dispatch_callback( this.cb.updatedWord, i, 0 );
      this.dictionary[i].cleanup = 0;
    }
  }
  
  this.updateList();
  
  /*
	var that = this;
	$.each(this.dictionary, function (index, value) {
		if( value.count < that.remove_threshold ) {
			delete that.dictionary[index];
			dispatch_callback( this.cb.removedWord, index );
		}
	});
	*/
}

WordFreq.prototype.setEwma = function (halftime) {
	var delta = 0.95; // Allow for performance tuning here
	if( this.ewma_timer != null ) {
		clearTimeout(this.ewma_timer);
		this.ewma_timer = null;
	}
	var ticktime = halftime*1000 / (Math.log(.5)/Math.log(delta));
	this.ewma = delta;

	var that = this; var closure = function () { var that2 = that; that2.tick(); };
	this.ewma_timer = setInterval(closure, ticktime);
};

WordFreq.prototype.addStopWords = function (words) {
	if( typeof(words) == 'string' ) words = [ words ];

	// Add them to the stopword list
	this.stopwords = this.stopwords.concat(words);

	// And remove the new stopwords from the dictionary
	var that = this;
	$.each(words, function (index, value) {
		if( that.dictionary[value] != undefined ) {
			delete that.dictionary[value];
			dispatch_callback( this.cb.removedWord, index );
		}
	});
};

WordFreq.prototype.wipe = function () {
	if( this.cb.removedWord.length > 0 ) {
		$.each(this.dictionary, function(index, value) {
			dispatch_callback( this.cb.removedWord, index );
		});
	}
	this.dictionary = {};
};

WordFreq.prototype.getSortedWords = function () {
	keys = [];
	for(var i in this.dictionary) { keys.push(i); }
	
	var that = this;
	keys.sort(function(a,b){ return that.dictionary[b].count - that.dictionary[a].count; });
	return keys;
}

WordFreq.prototype.getOccurences = function (word) {
	item = this.dictionary[word.toLowerCase()];
	if( item == undefined ) return [0, '', null]
	highscore = 0;
	for(var i in item.caps) {
		if( item.caps[i] > highscore ) {
			word = i;
			highscore = item.caps[i];
		}
	}
	return [item.count, word, item];
};
