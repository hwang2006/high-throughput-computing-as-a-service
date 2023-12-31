<?php
/**
 * Checks hook documentation is up to date.
 *
 * @file
 * @author Niklas Laxström
 * @copyright Copyright © 2012, Niklas Laxström
 * @license http://www.gnu.org/copyleft/gpl.html GNU General Public License 2.0 or later
 */

class HookDocTest extends MediaWikiTestCase {
	protected $documented = array();
	protected $used = array();
	protected $paths = array(
		'php' => array(
			'',
			'api',
			'ffs',
			'messagegroups',
			'specials',
			'tag',
			'ttmserver',
			'utils',
		),
		'js' => array(
			'resources/js',
		),
	);

	protected function setUp() {
		parent::setUp();
		$contents = file_get_contents( __DIR__ . "/../hooks.txt" );
		$blocks = preg_split( '/\n\n/', $contents );
		$type = false;

		foreach ( $blocks as $block ) {
			if ( $block === '=== PHP events ===' ) {
				$type = 'php';
				continue;
			} elseif ( $block === '=== JavaScript events ===' ) {
				$type = 'js';
				continue;
			} elseif ( !$type ) {
				continue;
			}

			if ( $type ) {
				list( $name, $params ) = self::parseDocBlock( $block );
				$this->documented[$type][$name] = $params;
			}
		}

		$prefix = __DIR__ . '/..';
		foreach ( $this->paths['php'] as $path ) {
			$path = "$prefix/$path/";
			$hooks = self::getHooksFromPath( $path, 'self::getPHPHooksFromFile' );
			foreach ( $hooks as $name => $params ) {
				$this->used['php'][$name] = $params;
			}
		}

		foreach ( $this->paths['js'] as $path ) {
			$path = "$prefix/$path/";
			$hooks = self::getHooksFromPath( $path, 'self::getJSHooksFromFile' );
			foreach ( $hooks as $name => $params ) {
				$this->used['js'][$name] = $params;
			}
		}
	}

	protected static function getJSHooksFromFile( $file ) {
		$content = file_get_contents( $file );
		$m = array();
		preg_match_all( '/(?:mw\.translateHooks\.run)\(\s*([\'"])(.*?)\1/', $content, $m );
		$hooks = array();
		foreach ( $m[2] as $hook ) {
			$hooks[$hook] = array();
		}

		return $hooks;
	}

	protected static function getPHPHooksFromFile( $file ) {
		$content = file_get_contents( $file );
		$m = array();
		preg_match_all( '/(?:wfRunHooks|Hooks\:\:run)\(\s*([\'"])(.*?)\1/', $content, $m );
		$hooks = array();
		foreach ( $m[2] as $hook ) {
			$hooks[$hook] = array();
		}

		return $hooks;
	}

	protected static function getHooksFromPath( $path, $callback ) {
		$hooks = array();
		$dh = opendir( $path );
		if ( $dh ) {
			while ( ( $file = readdir( $dh ) ) !== false ) {
				if ( filetype( $path . $file ) == 'file' ) {
					$hooks = array_merge( $hooks, call_user_func( $callback, $path . $file ) );
				}
			}
			closedir( $dh );
		}
		return $hooks;
	}

	protected static function parseDocBlock( $block ) {
		preg_match( '/^;([^ ]+):/', $block, $match );
		$name = $match[1];
		preg_match_all( '/^ ([^ ]+)\s+([ ^])/', $block, $matches, PREG_SET_ORDER );
		$params = array();
		foreach ( $matches as $match ) {
			$params[$match[2]] = $match[1];
		}

		return array( $name, $params );
	}

	public function testHookIsDocumentedPHP() {
		foreach ( $this->documented['php'] as $hook => $params ) {
			$this->assertArrayHasKey( $hook, $this->used['php'], "PHP hook $hook is documented" );
		}
	}

	public function testHookExistsPHP() {
		foreach ( $this->used['php'] as $hook => $params ) {
			$this->assertArrayHasKey( $hook, $this->documented['php'], "Documented php hook $hook exists" );
		}
	}

	public function testHookIsDocumentedJS() {
		foreach ( $this->documented['js'] as $hook => $params ) {
			$this->assertArrayHasKey( $hook, $this->used['js'], "Js hook $hook is documented" );
		}
	}

	public function testHookExistsJS() {
		foreach ( $this->used['js'] as $hook => $params ) {
			$this->assertArrayHasKey( $hook, $this->documented['js'], "Documented js hook $hook exists" );
		}
	}
}
