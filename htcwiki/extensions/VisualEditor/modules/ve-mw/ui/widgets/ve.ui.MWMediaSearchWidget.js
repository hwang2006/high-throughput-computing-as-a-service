/*!
 * VisualEditor UserInterface MWMediaSearchWidget class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global mw*/

/**
 * Creates an ve.ui.MWMediaSearchWidget object.
 *
 * @class
 * @extends OO.ui.SearchWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @param {number} [size] Vertical size of thumbnails
 */
ve.ui.MWMediaSearchWidget = function VeUiMWMediaSearchWidget( config ) {
	// Configuration intialization
	config = ve.extendObject( {
		'placeholder': ve.msg( 'visualeditor-media-input-placeholder' ),
		'value': mw.config.get( 'wgTitle' )
	}, config );

	// Parent constructor
	OO.ui.SearchWidget.call( this, config );

	// Properties
	this.sources = {};
	this.size = config.size || 150;
	this.queryTimeout = null;
	this.titles = {};
	this.queryMediaSourcesCallback = ve.bind( this.queryMediaSources, this );

	// Events
	this.$results.on( 'scroll', ve.bind( this.onResultsScroll, this ) );

	// Initialization
	this.$element.addClass( 've-ui-mwMediaSearchWidget' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMediaSearchWidget, OO.ui.SearchWidget );

/* Methods */

/**
 * Set the fileRepo sources for the media search
 * @param {Object} sources The sources object
 */
ve.ui.MWMediaSearchWidget.prototype.setSources = function ( sources ) {
	this.sources = sources;
};

/**
 * Handle select widget select events.
 *
 * @param {string} value New value
 */
ve.ui.MWMediaSearchWidget.prototype.onQueryChange = function () {
	var i, len;

	// Parent method
	OO.ui.SearchWidget.prototype.onQueryChange.call( this );

	// Reset
	this.titles = {};
	for ( i = 0, len = this.sources.length; i < len; i++ ) {
		delete this.sources[i].gsroffset;
	}

	// Queue
	clearTimeout( this.queryTimeout );
	this.queryTimeout = setTimeout( this.queryMediaSourcesCallback, 100 );
};

/**
 * Handle results scroll events.
 *
 * @param {jQuery.Event} e Scroll event
 */
ve.ui.MWMediaSearchWidget.prototype.onResultsScroll = function () {
	var position = this.$results.scrollTop() + this.$results.outerHeight(),
		threshold = this.results.$element.outerHeight() - this.size;
	if ( !this.query.isPending() && position > threshold ) {
		this.queryMediaSources();
	}
};

/**
 * Query all sources for media.
 *
 * @method
 */
ve.ui.MWMediaSearchWidget.prototype.queryMediaSources = function () {
	var i, len, source, url,
		value = this.query.getValue();

	if ( value === '' ) {
		return;
	}

	for ( i = 0, len = this.sources.length; i < len; i++ ) {
		source = this.sources[i];
		// If we don't have either 'apiurl' or 'scriptDirUrl'
		// the source is invalid, and we will skip it
		if ( source.apiurl || source.scriptDirUrl ) {
			if ( source.request ) {
				source.request.abort();
			}
			if ( !source.gsroffset ) {
				source.gsroffset = 0;
			}
			if ( source.local ) {
				url = mw.util.wikiScript( 'api' );
			} else {
				// If 'apiurl' is set, use that. Otherwise, build the url
				// from scriptDirUrl and /api.php suffix
				url = source.apiurl || ( source.scriptDirUrl + '/api.php' );
			}
			this.query.pushPending();
			source.request = ve.init.mw.Target.static.apiRequest( {
				'action': 'query',
				'generator': 'search',
				'gsrsearch': value,
				'gsrnamespace': 6,
				'gsrlimit': 15,
				'gsroffset': source.gsroffset,
				'prop': 'imageinfo',
				'iiprop': 'dimensions|url',
				'iiurlheight': this.size
			}, {
				'url': url,
				// This request won't be cached since the JSON-P callback is unique. However make sure
				// to allow jQuery to cache otherwise so it won't e.g. add "&_=(random)" which will
				// trigger a MediaWiki API error for invalid parameter "_".
				'cache': true,
				// TODO: Only use JSON-P for cross-domain.
				// jQuery has this logic built-in (if url is not same-origin ..)
				// but isn't working for some reason.
				'dataType': 'jsonp'
			} )
				.done( ve.bind( this.onMediaQueryDone, this, source ) )
				.always( ve.bind( this.onMediaQueryAlways, this, source ) );
			source.value = value;
		}
	}
};

/**
 * Handle media query response events.
 *
 * @method
 * @param {Object} source Media query source
 */
ve.ui.MWMediaSearchWidget.prototype.onMediaQueryAlways = function ( source ) {
	source.request = null;
	this.query.popPending();
};

/**
 * Handle media query load events.
 *
 * @method
 * @param {Object} source Media query source
 * @param {Object} data Media query response
 */
ve.ui.MWMediaSearchWidget.prototype.onMediaQueryDone = function ( source, data ) {
	if ( !data.query || !data.query.pages ) {
		return;
	}

	var page, title,
		items = [],
		pages = data.query.pages,
		value = this.query.getValue();

	if ( value === '' || value !== source.value ) {
		return;
	}

	if ( data['query-continue'] && data['query-continue'].search ) {
		source.gsroffset = data['query-continue'].search.gsroffset;
	}

	for ( page in pages ) {
		title = new mw.Title( pages[page].title ).getMainText();
		if ( !( title in this.titles ) ) {
			this.titles[title] = true;
			items.push(
				new ve.ui.MWMediaResultWidget(
					pages[page],
					{ '$': this.$, 'size': this.size }
				)
			);
		}
	}

	this.results.addItems( items );
};
