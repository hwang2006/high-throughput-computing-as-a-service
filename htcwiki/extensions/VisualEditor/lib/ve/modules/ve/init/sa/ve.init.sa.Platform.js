/*!
 * VisualEditor Standalone Initialization Platform class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Initialization Standalone platform.
 *
 * @class
 * @extends ve.init.Platform
 *
 * @constructor
 */
ve.init.sa.Platform = function VeInitSaPlatform() {
	// Parent constructor
	ve.init.Platform.call( this );

	// Properties
	this.externalLinkUrlProtocolsRegExp = /^https?\:\/\//;
	this.modulesUrl = 'extensions/VisualEditor/modules';
	this.parsedMessages = {};
};

/* Inheritance */

OO.inheritClass( ve.init.sa.Platform, ve.init.Platform );

/* Methods */

/** @inheritdoc */
ve.init.sa.Platform.prototype.getExternalLinkUrlProtocolsRegExp = function () {
	return this.externalLinkUrlProtocolsRegExp;
};

/**
 * Set the remotely accessible URL to the modules directory.
 *
 * @param {string} url Remote modules URL
 */
ve.init.sa.Platform.prototype.setModulesUrl = function ( url ) {
	this.modulesUrl = url;
};

/** @inheritdoc */
ve.init.sa.Platform.prototype.getModulesUrl = function () {
	return this.modulesUrl;
};

/** @inheritdoc */
ve.init.sa.Platform.prototype.addMessages = function ( messages ) {
	$.i18n().load( messages, $.i18n().locale );
};

/**
 * @method
 * @inheritdoc
 */
ve.init.sa.Platform.prototype.getMessage = $.i18n;

/** @inheritdoc */
ve.init.sa.Platform.prototype.addParsedMessages = function ( messages ) {
	for ( var key in messages ) {
		this.parsedMessages[key] = messages[key];
	}
};

/** @inheritdoc */
ve.init.sa.Platform.prototype.getParsedMessage = function ( key ) {
	if ( key in this.parsedMessages ) {
		return this.parsedMessages[key];
	}
	// Fallback to regular messages, html escaping applied.
	return this.getMessage( key ).replace( /['"<>&]/g, function escapeCallback( s ) {
		switch ( s ) {
			case '\'':
				return '&#039;';
			case '"':
				return '&quot;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '&':
				return '&amp;';
		}
	} );
};

/** @inheritdoc */
ve.init.sa.Platform.prototype.getSystemPlatform = function () {
	var platforms = ['win', 'mac', 'linux', 'sunos', 'solaris', 'iphone'],
		match = new RegExp( '(' + platforms.join( '|' ) + ')' ).exec( window.navigator.platform.toLowerCase() );
	if ( match ) {
		return match[1];
	}
};

/** @inheritdoc */
ve.init.sa.Platform.prototype.getUserLanguages = function () {
	// IE or Firefox Safari Opera
	var lang = window.navigator.userLanguage || window.navigator.language,
		langParts = lang.split( '-' ),
		langs = [ lang ];

	if ( langParts.length > 1 ) {
		langs.push( langParts[0] );
	}

	return langs;
};

ve.init.sa.Platform.prototype.initialize = function () {
	var i, len, partialLocale, localeParts, deferred,
		path = this.getModulesUrl(),
		locale = $.i18n().locale,
		languages = [ locale, 'en' ], // Always use 'en' as the final fallback
		languagesCovered = {},
		promises = [],
		fallbacks = $.i18n.fallbacks[locale];

	if ( !fallbacks ) {
		// Try to find something that has fallbacks (which means it's a language we know about)
		// by stripping things from the end. But collect all the intermediate ones in case we
		// go past languages that don't have fallbacks but do exist.
		localeParts = locale.split( '-' );
		localeParts.pop();
		while ( localeParts.length && !fallbacks ) {
			partialLocale = localeParts.join( '-' );
			languages.push( partialLocale );
			fallbacks = $.i18n.fallbacks[partialLocale];
			localeParts.pop();
		}
	}

	if ( fallbacks ) {
		languages = languages.concat( fallbacks );
	}

	for ( i = 0, len = languages.length; i < len; i++ ) {
		if ( languagesCovered[languages[i]] ) {
			continue;
		}
		languagesCovered[languages[i]] = true;

		deferred = $.Deferred();
		$.i18n().load( path + '/ve/i18n/' + languages[i] + '.json', languages[i] )
			.always( deferred.resolve );
		promises.push( deferred.promise() );

		deferred = $.Deferred();
		$.i18n().load( path + '/../lib/oojs-ui/i18n/' + languages[i] + '.json', languages[i] )
			.always( deferred.resolve );
		promises.push( deferred.promise() );
	}
	return $.when.apply( $, promises );
};

/* Initialization */

ve.init.platform = new ve.init.sa.Platform();

/* Extension */

OO.ui.msg = ve.bind( ve.init.platform.getMessage, ve.init.platform );
