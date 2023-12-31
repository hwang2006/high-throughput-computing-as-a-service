<?php
/**
 * Api module for querying MessageGroups.
 *
 * @file
 * @author Niklas Laxström
 * @author Harry Burt
 * @copyright Copyright © 2010-2012, Niklas Laxström
 * @copyright Copyright © 2012, Harry Burt
 * @license http://www.gnu.org/copyleft/gpl.html GNU General Public License 2.0 or later
 */

/**
 * Api module for querying MessageGroups.
 *
 * @ingroup API TranslateAPI
 */
class ApiQueryMessageGroups extends ApiQueryBase {

	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'mg' );
	}

	public function getCacheMode( $params ) {
		return 'public';
	}

	public function execute() {
		$params = $this->extractRequestParams();
		$filter = $params['filter'];

		$groups = array();
		if ( $params['format'] === 'flat' ) {
			$groups = MessageGroups::getAllGroups();

			// Not sorted by default, so do it now
			// Work around php bug: https://bugs.php.net/bug.php?id=50688
			wfSuppressWarnings();
			usort( $groups, array( 'MessageGroups', 'groupLabelSort' ) );
			wfRestoreWarnings();

		// format=tree from now on, as it is the only other valid option
		} elseif ( $params['root'] !== '' ) {
			$group = MessageGroups::getGroup( $params['root'] );
			if ( $group instanceof AggregateMessageGroup ) {
				$groups = MessageGroups::subGroups( $group );
				// The parent group is the first, ignore it
				array_shift( $groups );
			}
		} else {
			$groups = MessageGroups::getGroupStructure();
		}

		$props = array_flip( $params['prop'] );

		$result = $this->getResult();
		$matcher = new StringMatcher( '', $filter );
		/**
		 * @var MessageGroup $mixed
		 */
		foreach ( $groups as $mixed ) {
			if ( $filter !== array() && !$matcher->match( $mixed->getId() ) ) {
				continue;
			}

			$a = $this->formatGroup( $mixed, $props );

			$result->setIndexedTagName( $a, 'group' );

			// TODO: Add a continue?
			$fit = $result->addValue( array( 'query', $this->getModuleName() ), null, $a );
			if ( !$fit ) {
				$this->setWarning( 'Could not fit all groups in the resultset.' );
				// Even if we're not going to give a continue, no point carrying on if the result is full
				break;
			}
		}

		$result->setIndexedTagName_internal( array( 'query', $this->getModuleName() ), 'group' );
	}

	/**
	 * @param array|MessageGroup $mixed
	 * @param array $props List of props as the array keys
	 * @param int $depth
	 * @return array
	 */
	protected function formatGroup( $mixed, $props, $depth = 0 ) {
		$params = $this->extractRequestParams();

		// Default
		$g = $mixed;
		$subgroups = array();

		// Format = tree and has subgroups
		if ( is_array( $mixed ) ) {
			$g = array_shift( $mixed );
			$subgroups = $mixed;
		}

		$a = array();

		if ( isset( $props['id'] ) ) {
			$a['id'] = $g->getId();
		}

		if ( isset( $props['label'] ) ) {
			$a['label'] = $g->getLabel();
		}

		if ( isset( $props['description'] ) ) {
			$a['description'] = $g->getDescription();
		}

		if ( isset( $props['class'] ) ) {
			$a['class'] = get_class( $g );
		}

		if ( isset( $props['namespace'] ) ) {
			$a['namespace'] = $g->getNamespace();
		}

		if ( isset( $props['exists'] ) ) {
			$a['exists'] = $g->exists();
		}

		if ( isset( $props['icon'] ) ) {
			$formats = $this->getIcon( $g, $params['iconsize'] );
			if ( $formats ) {
				$a['icon'] = $formats;
			}
		}

		if ( isset( $props['priority'] ) ) {
			$priority = MessageGroups::getPriority( $g );
			$a['priority'] = $priority ?: 'default';
		}

		wfRunHooks( 'TranslateProcessAPIMessageGroupsProperties', array( &$a, $props, $params, $g ) );

		// Depth only applies to tree format
		if ( $depth >= $params['depth'] && $params['format'] === 'tree' ) {
			$a['groupcount'] = count( $subgroups );
			// Prevent going further down in the three
			return $a;
		}

		// Always empty array for flat format, only sometimes for tree format
		if ( $subgroups !== array() ) {
			foreach ( $subgroups as $sg ) {
				$a['groups'][] = $this->formatGroup( $sg, $props );
			}
			$result = $this->getResult();
			$result->setIndexedTagName( $a['groups'], 'group' );
		}

		return $a;
	}

	protected function getIcon( MessageGroup $g, $size ) {
		global $wgServer;
		$icon = $g->getIcon();
		if ( substr( $icon, 0, 7 ) !== 'wiki://' ) {
			return null;
		}

		$formats = array();

		$filename = substr( $icon, 7 );
		$file = wfFindFile( $filename );
		if ( !$file ) {
			$this->setWarning( "Unknown file $icon" );
			return null;
		}

		if ( $file->isVectorized() ) {
			$formats['vector'] = $file->getUrl();
		}

		$formats['raster'] = $wgServer . $file->createThumb( $size, $size );

		foreach ( $formats as $key => &$url ) {
			$url = wfExpandUrl( $url, PROTO_RELATIVE );
		}

		return $formats;
	}

	public function getAllowedParams() {
		$allowedParams = array(
			'depth' => array(
				ApiBase::PARAM_TYPE => 'integer',
				ApiBase::PARAM_DFLT => '100',
			),
			'format' => array(
				ApiBase::PARAM_TYPE => array( 'flat', 'tree' ),
				ApiBase::PARAM_DFLT => 'flat',
			),
			'iconsize' => array(
				ApiBase::PARAM_TYPE => 'integer',
				ApiBase::PARAM_DFLT => 64,
			),
			'prop' => array(
				ApiBase::PARAM_TYPE => array_keys( self::getPropertyList() ),
				ApiBase::PARAM_DFLT => 'id|label|description|class|exists',
				ApiBase::PARAM_ISMULTI => true,
			),
			'root' => array(
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_DFLT => '',
			),
			'filter' => array(
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_DFLT => '',
				ApiBase::PARAM_ISMULTI => true,
			),
		);
		wfRunHooks( 'TranslateGetAPIMessageGroupsParameterList', array( &$allowedParams ) );
		return $allowedParams;
	}

	public function getParamDescription() {
		$depth = <<<TEXT
When using the tree format, limit the depth to this many levels. Value 0 means
that no subgroups are shown. If the limit is reached, a prop groupcount is
added and it states the number of direct children.
TEXT;
		$root = <<<TEXT
When using the tree format, instead of starting from top level start from the
given message group, which must be aggregate message group.
TEXT;
		$filter = <<<TEXT
Only return messages with IDs that match one or more of the input(s) given
(case-insensitive, separated by pipes, * wildcard).
TEXT;

		$propIntro = array( 'What translation-related information to get:' );

		$paramDescs = array(
			'depth' => $depth,
			'format' => 'In a tree format message groups can exist multiple places in the tree.',
			'iconsize' => 'Preferred size of rasterised group icon',
			'root' => $root,
			'filter' => $filter,
			'prop' => array_merge( $propIntro, self::getPropertyList() ),
		);

		$p = $this->getModulePrefix(); // Can be useful for documentation
		wfRunHooks( 'TranslateGetAPIMessageGroupsParameterDescs', array( &$paramDescs, $p ) );

		$indent = "\n" . str_repeat( ' ', 24 );
		$wrapWidth = 104 - 24;
		foreach ( $paramDescs as $key => &$val ) {
			if ( is_string( $val ) ) {
				$val = wordwrap( str_replace( "\n", ' ', $val ), $wrapWidth, $indent );
			}
		}
		return $paramDescs;
	}

	/**
	 * Returns array of key value pairs of properties and their descriptions
	 *
	 * @return array
	 */
	protected static function getPropertyList() {
		$properties = array(
			'id'          => ' id           - Include id of the group',
			'label'       => ' label        - Include label of the group',
			'description' => ' description  - Include description of the group',
			'class'       => ' class        - Include class name of the group',
			'namespace'   => ' namespace    - Include namespace of the group. Not all groups belong to a single namespace.',
			'exists'      => ' exists       - Include self-calculated existence property of the group',
			'icon'        => ' icon         - Include urls to icon of the group',
			'priority'    => ' priority     - Include priority status like discouraged',
		);
		wfRunHooks( 'TranslateGetAPIMessageGroupsPropertyDescs', array( &$properties ) );
		return $properties;
	}

	public function getDescription() {
		return 'Return information about message groups';
	}

	protected function getExamples() {
		return array(
			'api.php?action=query&meta=messagegroups',
		);
	}

	public function getVersion() {
		return __CLASS__ . ': ' . TRANSLATE_VERSION;
	}
}
