FlashWordCloud = function(wordfreq) {
	this.wordfreq = wordfreq;
	
	var that = this;
	this.wordfreq.cb.newWord.push( function(newWord) { that.newWord(newWord); } );
	this.wordfreq.cb.updatedWord.push( function(word, count) { that.updateWord(word,count); } );
	this.wordfreq.cb.removedWord.push( function(word) { that.removeWord(word); } );
	this.wordfreq.cb.tick.push( function(reduce) {
		} );
	this.words = {};
};

FlashWordCloud.prototype.newWord = function (word) {
  console.log( "new: " + word );
};

FlashWordCloud.prototype.updateWord = function (word, count) {
	console.log( "update: " + word + " " + count );
	
	wordcloud.fl_updateWord(word, count);
};

FlashWordCloud.prototype.removeWord = function (word) {
  console.log( "removed: " + word );
}