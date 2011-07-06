function rect_intersect (ax,ay,aw,ah, bx,by,bw,bh) {
	/* Do the rectangles A and B intersect?
	 * Each are specified by their left-top corner {a,b}{x,y}
	 * and their width and hight {a,b}{w,h} (exclusive)
	 * This function returns either false if the rectangles
	 * do not overlap, or a vector [x,y] to move A away from B
	 */
	
	// Make sure {a,b}{w,h} are positive
	if( aw < 0 ) { ax = ax + aw; aw = -aw; }
	if( ah < 0 ) { ay = ay + ah; ah = -ah; }
	if( bw < 0 ) { bx = bx + bw; bw = -bw; }
	if( bh < 0 ) { by = by + bh; bh = -bh; }

	if( ax+aw <= bx /* A left of B */ ) return false;
	if( bx+bw <= ax /* A right of B */ ) return false;
	if( ay+ah <= by /* A above B */ ) return false;
	if( by+bh <= ay /* A below B */ ) return false;

	// OK, they overlap; Move away in this direction
	var mv = [ (ax+aw/2) - (bx+bw/2) , (ay+ah/2) - (by+bh/2) ];
	{
		var length = Math.sqrt( Math.pow(mv[0],2) + Math.pow(mv[1],2) );
		mv[0] /= length; mv[1] /= length;
	}

	{ // Now find the intersection area to scale that vector
		var ix = Math.max(ax,bx);
		var iy = Math.max(ay,by);
		var ix2 = Math.min(ax+aw, bx+bw);
		var iy2 = Math.min(ay+ah, by+bh);
		var iw = ix2-ix;
		var ih = iy2-iy;
		var area = iw*ih;
		area /= aw*ah;
		mv[0] *= area; mv[1] *= area;
	}

	return mv;
}

Math.round_away_from_zero = function (x) { return (x >= 0 ? Math.ceil(x) : Math.floor(x) ); }

WordCloudAnchor = function(jqelement) {
	this.jqe = jqelement;
	this.cache = {};
};
WordCloudAnchor.prototype.width = function() {
	if( this.cache.width == undefined ) {
		this.cache.width = this.jqe.width();
	}
	return this.cache.width;
};
WordCloudAnchor.prototype.height = function() {
	if( this.cache.height == undefined ) {
		this.cache.height = this.jqe.height();
	}
	return this.cache.height;
};
WordCloudAnchor.prototype.flushCache = function() {
	this.cache = {};
};

WordCloudItem = function(jqelement, anchor) {
	this.jqe = jqelement;
	this.anchor = anchor;
	this.hideThreshold = 0.1;
	this.cache = {};
};
WordCloudItem.prototype.destroy = function () {
	this.jqe.remove();
};
WordCloudItem.prototype.x = function() {
	if( this.cache.x == undefined ) {
		var pos = this.jqe.position();
		this.cache.x = pos.left;
		this.cache.y = pos.top; // If we called position() anyway, update y as well
	}
	return this.cache.x;
};
WordCloudItem.prototype.y = function() {
	if( this.cache.y == undefined ) {
		var pos = this.jqe.position();
		this.cache.y = pos.top;
		this.cache.x = pos.left; // If we called position() anyway, update x as well
	}
	return this.cache.y;
};
WordCloudItem.prototype.width = function() {
	if( this.cache.width == undefined ) {
		this.cache.width = this.jqe.width();
	}
	return this.cache.width;
};
WordCloudItem.prototype.height = function() {
	if( this.cache.height == undefined ) {
		this.cache.height = this.jqe.height();
	}
	return this.cache.height;
};
WordCloudItem.prototype.attached = function() {
	if( this.cache.attached == undefined ) {
		this.cache.attached = ( this.jqe.parent().length != 0 );
	}
	return this.cache.attached;
}
WordCloudItem.prototype.flushCache = function() {
	this.cache = {};
};
WordCloudItem.prototype.move = function (newX, newY) {
	this.jqe.css('left', newX + 'px');
	this.jqe.css('top' , newY + 'px');
	delete this.cache.x; // Flush cache
	delete this.cache.y;
};
WordCloudItem.prototype.moveRel = function (deltaX, deltaY) {
	this.jqe.css('left', this.x() + deltaX + 'px')
	        .css('top' , this.y() + deltaY + 'px');
	delete this.cache.x; // Flush cache
	delete this.cache.y;
};
WordCloudItem.prototype.redraw = function () {
	if( this.size < this.hideThreshold ) { // Remove from DOM
		if( this.attached() ) {
			this.jqe.detach();
			delete this.cache.attached;
		}
	} else { // Make sure it's in the DOM
		if( ! this.attached() ) {
			this.move(Math.random()*(this.anchor.width()-100), Math.random()*(this.anchor.height()-50) );
			this.anchor.jqe.append(this.jqe);
			delete this.cache.attached;
		}
	}
	this.jqe.css('font-size', Math.pow(this.size,.5)*100 + '%');
	delete this.cache.width; // Flush cache
	delete this.cache.height;
};
WordCloudItem.prototype.weight = function () {
	if( this.attached() ) return 50 + this.width()*this.height();
	return 0;
}

WordCloud = function(wordfreq, anchor, template) {
	this.wordfreq = wordfreq;
	this.anchor = new WordCloudAnchor(anchor);
	this.template = template;
	this.weight = 0;
	this.hideThreshold = 0.1;

	var that = this;
	this.wordfreq.cb.newWord.push( function(newWord) { that.newWord(newWord); } );
	this.wordfreq.cb.updatedWord.push( function(word, count) { that.updateWord(word,count); } );
	this.words = {};
};

WordCloud.prototype.newWord = function (newWord) {
	var jqitem = this.template.clone().text(newWord);
	this.words[newWord] = new WordCloudItem(jqitem, this.anchor);
};
WordCloud.prototype.updateWord = function (word, count) {
	var wordObj = this.words[ word ];
	this.weight -= wordObj.weight();
	wordObj.size = count;
	wordObj.redraw();
	this.weight += wordObj.weight();
};
WordCloud.prototype.removedWord = function (word) {
	if( this.words[ word ] != undefined ) {
		this.weight -= wordObj.weight();;
		this.words[ word ].destroy(); // manually call destructor FIXME (if possible in JS)
		delete this.words[ word ];
	}
}

WordCloud.prototype.redraw = function() {
	for( var word in this.words ) {
		var wordObj = this.words[ word ];
		if( ! wordObj.attached() ) continue;
		var mvx = 0, mvy = 0;
		{ // Go to center
			var mv = [ this.anchor.width()/2
			                      - (wordObj.x()+wordObj.width()/2),
			           this.anchor.height()/2
			                      - (wordObj.y()+wordObj.height()/2) ];
			var length = Math.sqrt( Math.pow(mv[0],2) + Math.pow(mv[1],2) );
			mv[0] /= length; mv[1] /= length;
			mvx += .5*mv[0]; mvy += .2*mv[1]; // Asymetrical, to compensate for ellipsness
		}
		// repulse from others
		for( var otherWord in this.words ) {
			if( word == otherWord ) continue;
			var otherWordObj = this.words[ otherWord ];
			if( ! otherWordObj.attached() ) continue;
			/* Check if the rectangles overlap */
			var mv = rect_intersect(
			    wordObj.x(), wordObj.y(), wordObj.width(), wordObj.height(),
			    otherWordObj.x(), otherWordObj.y(), otherWordObj.width(), otherWordObj.height()
			    );
			if( mv != false ) { mvx += 10*mv[0]; mvy += 10*mv[1]; }
		}
		wordObj.moveRel( Math.round_away_from_zero(mvx),
		                 Math.round_away_from_zero(mvy) );
	}
	var filled = this.weight/(this.anchor.width()*this.anchor.height());
	if( filled > 0.4 ) {
		this.hideThreshold *= 1.05;
		console.log("Filled for "+filled*100+"%, Increasing backpressure to "+this.hideThreshold+"\n");
		for( var word in this.words ) {
			var wordObj = this.words[ word ];
			wordObj.hideThreshold = this.hideThreshold;
			this.weight -= wordObj.weight();
			wordObj.redraw();
			this.weight += wordObj.weight();
		}
	} else if( filled < 0.15 && this.hideThreshold > 0.1 ) {
		this.hideThreshold /= 1.05;
		console.log("Filled for "+filled*100+"%, Decreasing hide threshold to "+this.hideThreshold+"\n");
		for( var word in this.words ) {
			var wordObj = this.words[ word ];
			wordObj.hideThreshold = this.hideThreshold;
			this.weight -= wordObj.weight();
			wordObj.redraw();
			this.weight += wordObj.weight();
		}
	}
};
