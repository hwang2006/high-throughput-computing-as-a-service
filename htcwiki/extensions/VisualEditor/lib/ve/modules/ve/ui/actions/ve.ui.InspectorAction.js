/*!
 * VisualEditor UserInterface InspectorAction class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Inspector action.
 *
 * @class
 * @extends ve.ui.Action
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 */
ve.ui.InspectorAction = function VeUiInspectorAction( surface ) {
	// Parent constructor
	ve.ui.Action.call( this, surface );
};

/* Inheritance */

OO.inheritClass( ve.ui.InspectorAction, ve.ui.Action );

/* Static Properties */

ve.ui.InspectorAction.static.name = 'inspector';

/**
 * List of allowed methods for the action.
 *
 * @static
 * @property
 */
ve.ui.InspectorAction.static.methods = [ 'open' ];

/* Methods */

/**
 * Open an inspector.
 *
 * @method
 * @param {string} name Symbolic name of inspector to open
 * @param {Object} [config] Configuration options for inspector setup
 */
ve.ui.InspectorAction.prototype.open = function ( name, config ) {
	this.surface.getContext().getInspector( name ).open( config );
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.InspectorAction );
