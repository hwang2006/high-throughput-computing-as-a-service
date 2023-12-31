<?php
/**
 * Unit tests for api module.
 *
 * @file
 * @author Harry Burt
 * @copyright Copyright � 2012, Harry Burt
 * @license http://www.gnu.org/copyleft/gpl.html GNU General Public License 2.0 or later
 */

/**
 * @group Database
 */
class ApiQueryMessageGroupsTest extends ApiTestCase {

	protected function setUp() {
		parent::setUp();

		global $wgHooks;
		$this->setMwGlobals( array(
			'wgHooks' => $wgHooks,
			'wgTranslateCC' => array(),
			'wgTranslateMessageIndex' => array( 'DatabaseMessageIndex' ),
			'wgTranslateWorkflowStates' => false,
			'wgTranslateGroupFiles' => array(),
			'wgEnablePageTranslation' => false,
			'wgTranslateTranslationServices' => array(),
		) );
		$wgHooks['TranslatePostInitGroups'] = array( array( $this, 'getTestGroups' ) );
		MessageGroups::clearCache();
		MessageIndexRebuildJob::newJob()->run();
	}

	public function getTestGroups( &$list ) {
		$exampleMessageGroup = new WikiMessageGroup( 'theid', 'thesource' );
		$exampleMessageGroup->setLabel( 'thelabel' ); // Example
		$exampleMessageGroup->setNamespace( 5 ); // Example
		$list['theid'] = $exampleMessageGroup;

		$anotherExampleMessageGroup = new WikiMessageGroup( 'anotherid', 'thesource' );
		$anotherExampleMessageGroup->setLabel( 'thelabel' ); // Example
		$anotherExampleMessageGroup->setNamespace( 5 ); // Example
		$list['anotherid'] = $anotherExampleMessageGroup;

		return false;
	}

	public function testAPIAccuracy() {
		list( $data ) = $this->doApiRequest(
			array(
				'action' => 'query',
				'meta' => 'messagegroups',
				'mgprop' => 'id|label|class|namespace|exists',
			)
		);

		// Check structure
		$this->assertCount( 1, $data );
		$this->assertArrayHasKey( 'query', $data );
		$this->assertCount( 1, $data['query'] );
		$this->assertArrayHasKey( 'messagegroups', $data['query'] );
		$this->assertCount( 2, $data['query']['messagegroups'] );

		// Basic content checks
		$items = $data['query']['messagegroups'];
		$this->assertStringEndsWith( 'id', $items[0]['id'] );
		$this->assertStringEndsWith( 'id', $items[1]['id'] );
		$this->assertSame( $items[0]['label'], 'thelabel' );
		$this->assertSame( $items[1]['label'], 'thelabel' );
		$this->assertSame( $items[0]['exists'], true );
		$this->assertSame( $items[1]['exists'], true );
		$this->assertSame( $items[0]['namespace'], 5 );
		$this->assertSame( $items[1]['namespace'], 5 );
		$this->assertSame( $items[0]['class'], 'WikiMessageGroup' );
		$this->assertSame( $items[1]['class'], 'WikiMessageGroup' );
	}

	public function testAPIFilterAccuracy() {
		$ids = array( 'MadeUpGroup' );
		$ids += array_keys( MessageGroups::getAllGroups() );

		foreach ( $ids as $id ) {
			list( $data ) = $this->doApiRequest(
				array(
					'action' => 'query',
					'meta' => 'messagegroups',
					'mgprop' => 'id|label|class|namespace|exists',
					'mgfilter' => $id
				)
			);

			if ( $id === 'MadeUpGroup' ) {
				// Check structure (shouldn't find anything)
				$this->assertCount( 1, $data );
				$this->assertArrayHasKey( 'query', $data );
				$this->assertCount( 1, $data['query'] );
				$this->assertArrayHasKey( 'messagegroups', $data['query'] );
				$this->assertCount( 0, $data['query']['messagegroups'] );
				continue;
			}

			// Check structure (filter is unique given these names)
			$this->assertCount( 1, $data );
			$this->assertArrayHasKey( 'query', $data );
			$this->assertCount( 1, $data['query'] );
			$this->assertArrayHasKey( 'messagegroups', $data['query'] );
			$this->assertCount( 1, $data['query']['messagegroups'] );

			// Check content
			$item = $data['query']['messagegroups'][0];
			$this->assertCount( 5, $item );

			$this->assertSame( $item['id'], $id );
			$this->assertSame( $item['label'], 'thelabel' );
			$this->assertSame( $item['exists'], true );
			$this->assertStringEndsWith( 'id', $item['id'] ); // theid, anotherid
			$this->assertSame( $item['namespace'], 5 );
			$this->assertSame( $item['class'], 'WikiMessageGroup' );
		}
	}

	public function testBadProperty() {
		list( $data ) = $this->doApiRequest(
			array(
				'action' => 'query',
				'meta' => 'messagegroups',
				'mgprop' => 'madeupproperty'
			)
		);

		$this->assertCount( 2, $data );

		$this->assertArrayHasKey( 'query', $data );
		$this->assertCount( 1, $data['query'] );
		$this->assertArrayHasKey( 'messagegroups', $data['query'] );
		// This doesn't work. invalid properties are only warnings,
		// so we ged empty groups listed
		// $this->assertCount( 0, $data['query']['messagegroups'] );

		$this->assertArrayHasKey( 'warnings', $data );
		$this->assertCount( 1, $data['warnings'] );
		$this->assertArrayHasKey( 'messagegroups', $data['warnings'] );
		$this->assertCount( 1, $data['warnings']['messagegroups'] );
		$this->assertArrayHasKey( '*', $data['warnings']['messagegroups'] );
	}

}
