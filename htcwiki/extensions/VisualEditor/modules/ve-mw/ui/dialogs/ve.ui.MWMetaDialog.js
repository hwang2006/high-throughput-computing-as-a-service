/*!
 * VisualEditor user interface MWMetaDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for editing MediaWiki page meta information.
 *
 * @class
 * @extends ve.ui.MWDialog
 *
 * @constructor
 * @param {ve.ui.WindowSet} windowSet Window set this dialog is part of
 * @param {Object} [config] Configuration options
 */
ve.ui.MWMetaDialog = function VeUiMWMetaDialog( windowSet, config ) {
	// Parent constructor
	ve.ui.MWDialog.call( this, windowSet, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMetaDialog, ve.ui.MWDialog );

/* Static Properties */

ve.ui.MWMetaDialog.static.name = 'meta';

ve.ui.MWMetaDialog.static.titleMessage = 'visualeditor-dialog-meta-title';

ve.ui.MWMetaDialog.static.icon = 'window';

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWDialog.prototype.initialize.call( this );

	// Properties
	this.bookletLayout = new OO.ui.BookletLayout( { '$': this.$, 'outlined': true } );
	this.applyButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-action-apply' ),
		'flags': ['primary']
	} );
	this.settingsPage = new ve.ui.MWSettingsPage( this.surface, 'settings', { '$': this.$ } );
	this.categoriesPage = new ve.ui.MWCategoriesPage( this.surface, 'categories', {
		'$': this.$, '$overlay': this.$overlay
	} );
	this.languagesPage = new ve.ui.MWLanguagesPage( 'languages', { '$': this.$ } );

	// Events
	this.applyButton.connect( this, { 'click': [ 'close', { 'action': 'apply' } ] } );

	// Initialization
	this.$body.append( this.bookletLayout.$element );
	this.$foot.append( this.applyButton.$element );
	this.bookletLayout.addPages( [
		this.settingsPage,
		this.categoriesPage,
		this.languagesPage
	] );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.setup = function ( data ) {
	// Parent method
	ve.ui.MWDialog.prototype.setup.call( this, data );

	// Data initialization
	data = data || {};

	var surfaceModel = this.surface.getModel();

	if ( data.page && this.bookletLayout.getPage( data.page ) ) {
		this.bookletLayout.setPage( data.page );
	}

	// Force all previous transactions to be separate from this history state
	surfaceModel.breakpoint();
	surfaceModel.stopHistoryTracking();

	// Let each page set itself up ('languages' page doesn't need this yet)
	this.settingsPage.setup( data );
	this.categoriesPage.setup( data );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.teardown = function ( data ) {
	var surfaceModel = this.surface.getModel(),
		// Place transactions made while dialog was open in a common history state
		hasTransactions = surfaceModel.breakpoint();

	// Undo everything done in the dialog and prevent redoing those changes
	if ( data.action === 'cancel' && hasTransactions ) {
		surfaceModel.undo();
		surfaceModel.truncateUndoStack();
	}

	// Let each page tear itself down ('languages' page doesn't need this yet)
	this.settingsPage.teardown( data );
	this.categoriesPage.teardown( data );

	// Return to normal tracking behavior
	this.surface.getModel().startHistoryTracking();

	// Parent method
	ve.ui.MWDialog.prototype.teardown.call( this, data );
};

/* Registration */

ve.ui.dialogFactory.register( ve.ui.MWMetaDialog );
