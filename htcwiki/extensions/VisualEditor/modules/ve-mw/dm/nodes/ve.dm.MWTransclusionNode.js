/*!
 * VisualEditor DataModel MWTransclusionNode class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki transclusion node.
 *
 * @class
 * @abstract
 * @extends ve.dm.LeafNode
 * @mixins ve.dm.GeneratedContentNode
 *
 * @constructor
 * @param {number} [length] Length of content data in document; ignored and overridden to 0
 * @param {Object} [element] Reference to element in linear model
 */
ve.dm.MWTransclusionNode = function VeDmMWTransclusionNode( length, element ) {
	// Parent constructor
	ve.dm.LeafNode.call( this, 0, element );

	// Mixin constructors
	ve.dm.GeneratedContentNode.call( this );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWTransclusionNode, ve.dm.LeafNode );

OO.mixinClass( ve.dm.MWTransclusionNode, ve.dm.GeneratedContentNode );

/* Static members */

ve.dm.MWTransclusionNode.static.name = 'mwTransclusion';

ve.dm.MWTransclusionNode.static.matchTagNames = null;

ve.dm.MWTransclusionNode.static.matchRdfaTypes = [
	'mw:Transclusion',
	// We're interested in all nodes that have mw:Transclusion, even if they also have other mw:
	// types. So we match all mw: types, then use a matchFunction to assert that mw:Transclusion
	// is in there.
	/^mw:/
];

ve.dm.MWTransclusionNode.static.matchFunction = function ( domElement ) {
	return ve.indexOf( 'mw:Transclusion',
		( domElement.getAttribute( 'typeof' ) || '' ).split( ' ' )
	) !== -1;
};

ve.dm.MWTransclusionNode.static.enableAboutGrouping = true;

ve.dm.MWTransclusionNode.static.getHashObject = function ( dataElement ) {
	return {
		type: dataElement.type,
		mw: dataElement.attributes.mw
	};
};

ve.dm.MWTransclusionNode.static.toDataElement = function ( domElements, converter ) {
	if ( converter.isDomAllMetaOrWhitespace( domElements, ['mwTransclusion', 'mwTransclusionInline', 'mwTransclusionBlock'] ) ) {
		return ve.dm.MWTransclusionMetaItem.static.toDataElement( domElements, converter );
	}

	var dataElement, index,
		mwDataJSON = domElements[0].getAttribute( 'data-mw' ),
		mwData = mwDataJSON ? JSON.parse( mwDataJSON ) : {},
		isInline = this.isHybridInline( domElements, converter ),
		type = isInline ? 'mwTransclusionInline' : 'mwTransclusionBlock';

	dataElement = {
		'type': type,
		'attributes': {
			'mw': mwData,
			'originalDomElements': ve.copy( domElements ),
			'originalMw': mwDataJSON
		}
	};

	if ( !domElements[0].getAttribute( 'data-ve-no-generated-contents' ) ) {
		index = this.storeGeneratedContents( dataElement, domElements, converter.getStore() );
		dataElement.attributes.originalIndex = index;
	}

	return dataElement;
};

ve.dm.MWTransclusionNode.static.toDomElements = function ( dataElement, doc, converter ) {
	var els, currentDom, i, len, wrapper, aboutGroup,
		index = converter.getStore().indexOfHash( OO.getHash( [ this.getHashObject( dataElement ), undefined ] ) ),
		originalMw = dataElement.attributes.originalMw;

	// If the transclusion is unchanged just send back the
	// original DOM elements so selser can skip over it
	if (
		dataElement.attributes.originalDomElements && (
			index === dataElement.attributes.originalIndex ||
			( originalMw && ve.compare( dataElement.attributes.mw, JSON.parse( originalMw ) ) )
		)
	) {
		// The object in the store is also used for CE rendering so return a copy
		return ve.copyDomElements( dataElement.attributes.originalDomElements, doc );
	} else {
		if ( dataElement.attributes.originalDomElements ) {
			els = [ doc.createElement( dataElement.attributes.originalDomElements[0].nodeName ) ];
		} else {
			els = [ doc.createElement( 'span' ) ];
			// For the clipboard use the current DOM contents but mark as ignored
			// for the converter
			currentDom = converter.getStore().value( index );
			// About-group elements together
			aboutGroup = 'g' + Math.random();
			if ( currentDom ) {
				currentDom = ve.copyDomElements( currentDom, doc );
				// i = 0 is the data-mw span
				for ( i = 1, len = currentDom.length; i < len; i++ ) {
					// Wrap plain text nodes so we can give them an attribute
					if ( currentDom[i].nodeType === Node.TEXT_NODE ) {
						wrapper = doc.createElement( 'span' );
						wrapper.appendChild( currentDom[i] );
						currentDom[i] = wrapper;
					}
					currentDom[i].setAttribute( 'data-ve-ignore', 'true' );
					currentDom[i].setAttribute( 'about', aboutGroup );
					els.push( currentDom[i] );
				}
				els[0].setAttribute( 'about', aboutGroup );
			}
		}
		// All we need to send back to Parsoid is the original transclusion marker, with a
		// reconstructed data-mw property.
		els[0].setAttribute( 'typeof', 'mw:Transclusion' );
		els[0].setAttribute( 'data-mw', JSON.stringify( dataElement.attributes.mw ) );
		// Mark the element as not having valid generated contents with it in case it is
		// inserted into another editor (e.g. via paste).
		els[0].setAttribute( 'data-ve-no-generated-contents', true );
		// TODO: Include last-known generated contents in the output for rich
		// paste into a non-VE editor
		return els;
	}
};

/**
 * Escape a template parameter. Helper function for #getWikitext.
 *
 * @static
 * @param {string} param Parameter value
 * @returns {string} Escaped parameter value
 */
ve.dm.MWTransclusionNode.static.escapeParameter = function ( param ) {
	var match, needsNowiki, input = param, output = '',
		inNowiki = false, bracketStack = 0, linkStack = 0;
	while ( input.length > 0 ) {
		match = input.match( /(?:\[\[)|(?:\]\])|(?:\{\{)|(?:\}\})|\|+|<\/?nowiki>|<nowiki\s*\/>/ );
		if ( !match ) {
			output += input;
			break;
		}
		output += input.substr( 0, match.index );
		input = input.substr( match.index + match[0].length );
		if ( inNowiki ) {
			if ( match[0] === '</nowiki>' ) {
				inNowiki = false;
				output += match[0];
			} else {
				output += match[0];
			}
		} else {
			needsNowiki = true;
			if ( match[0] === '<nowiki>' ) {
				inNowiki = true;
				needsNowiki = false;
			} else if ( match[0] === '</nowiki>' || match[0].match( /<nowiki\s*\/>/ ) ) {
				needsNowiki = false;
			} else if ( match[0].match( /(?:\[\[)/ ) ) {
				linkStack++;
				needsNowiki = false;
			} else if ( match[0].match( /(?:\]\])/ ) ) {
				if ( linkStack > 0 ) {
					linkStack--;
					needsNowiki = false;
				}
			} else if ( match[0].match( /(?:\{\{)/ ) ) {
				bracketStack++;
				needsNowiki = false;
			} else if ( match[0].match( /(?:\}\})/ ) ) {
				if ( bracketStack > 0 ) {
					bracketStack--;
					needsNowiki = false;
				}
			} else if ( match[0].match( /\|+/ ) ) {
				if ( bracketStack > 0 || linkStack > 0 ) {
					needsNowiki = false;
				}
			}

			if ( needsNowiki ) {
				output += '<nowiki>' + match[0] + '</nowiki>';
			} else {
				output += match[0];
			}
		}
	}
	return output;
};

/* Methods */

/**
 * Get the wikitext for this transclusion.
 *
 * @method
 * @returns {string} Wikitext like `{{foo|1=bar|baz=quux}}`
 */
ve.dm.MWTransclusionNode.prototype.getWikitext = function () {
	var i, len, part, template, param,
		content = this.getAttribute( 'mw' ),
		wikitext = '';

	// Normalize to multi template format
	if ( content.params ) {
		content = { 'parts': [ { 'template': content } ] };
	}
	// Build wikitext from content
	for ( i = 0, len = content.parts.length; i < len; i++ ) {
		part = content.parts[i];
		if ( part.template ) {
			// Template
			template = part.template;
			wikitext += '{{' + template.target.wt;
			for ( param in template.params ) {
				wikitext += '|' + param + '=' +
					this.constructor.static.escapeParameter( template.params[param].wt );
			}
			wikitext += '}}';
		} else {
			// Plain wikitext
			wikitext += part;
		}
	}
	return wikitext;
};

/** */
ve.dm.MWTransclusionNode.prototype.getClonedElement = function () {
	var clone = ve.dm.LeafNode.prototype.getClonedElement.call( this );
	delete clone.attributes.originalMw;
	delete clone.attributes.originalDomElements;
	// Remove about attribute to prevent about grouping of duplicated transclusions
	this.constructor.static.removeHtmlAttribute( clone, 'about' );
	return clone;
};

/* Concrete subclasses */

/**
 * DataModel MediaWiki transclusion block node.
 *
 * @class
 * @extends ve.dm.MWTransclusionNode
 * @constructor
 * @param {number} [length] Length of content data in document; ignored and overridden to 0
 * @param {Object} [element] Reference to element in linear model
 */
ve.dm.MWTransclusionBlockNode = function VeDmMWTransclusionBlockNode( length, element ) {
	// Parent constructor
	ve.dm.MWTransclusionNode.call( this, length, element );
};

OO.inheritClass( ve.dm.MWTransclusionBlockNode, ve.dm.MWTransclusionNode );

ve.dm.MWTransclusionBlockNode.static.matchTagNames = [];

ve.dm.MWTransclusionBlockNode.static.name = 'mwTransclusionBlock';

/**
 * DataModel MediaWiki transclusion inline node.
 *
 * @class
 * @extends ve.dm.MWTransclusionNode
 * @constructor
 * @param {number} [length] Length of content data in document; ignored and overridden to 0
 * @param {Object} [element] Reference to element in linear model
 */
ve.dm.MWTransclusionInlineNode = function VeDmMWTransclusionInlineNode( length, element ) {
	// Parent constructor
	ve.dm.MWTransclusionNode.call( this, length, element );
};

OO.inheritClass( ve.dm.MWTransclusionInlineNode, ve.dm.MWTransclusionNode );

ve.dm.MWTransclusionInlineNode.static.matchTagNames = [];

ve.dm.MWTransclusionInlineNode.static.name = 'mwTransclusionInline';

ve.dm.MWTransclusionInlineNode.static.isContent = true;

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWTransclusionNode );
ve.dm.modelRegistry.register( ve.dm.MWTransclusionBlockNode );
ve.dm.modelRegistry.register( ve.dm.MWTransclusionInlineNode );
