<?php
/**
 * Unit tests.
 *
 * @file
 * @author Niklas Laxström
 * @copyright Copyright © 2012, Niklas Laxström
 * @license http://www.gnu.org/copyleft/gpl.html GNU General Public License 2.0 or later
 */

/**
 * Unit tests for api token retrieval.
 */
class ApiTokensTest extends MediaWikiTestCase {

	/** @dataProvider provideTokenClasses */
	public function testTokenRetrieval( $id, $class ) {
		// Make sure we have the right to get the token
		global $wgGroupPermissions, $wgUser;
		$wgGroupPermissions['*'][$class::getRight()] = true;
		$wgUser->clearInstanceCache(); // Reread above global

		// We should be getting anonymous user token
		$expected = $class::getToken();
		$this->assertNotSame( false, $expected, 'We did not get a valid token' );

		$actionString = TranslateUtils::getTokenAction( $id );
		$params = wfCgiToArray( $actionString );

		$req = new FauxRequest( $params );
		$api = new ApiMain( $req );
		$api->execute();

		$data = $api->getResultData();
		if ( isset( $data['query'] ) ) {
			foreach ( $data['query']['pages'] as $page ) {
				$this->assertSame( $expected, $page[$id . 'token'] );
			}
		} else {
			$this->assertArrayHasKey( 'tokens', $data, 'Result has tokens' );
			$this->assertSame( $expected, $data['tokens'][$id . 'token'] );
		}
	}

	public static function provideTokenClasses() {
		return array(
			array( 'groupreview', 'ApiGroupReview' ),
			array( 'translationreview', 'ApiTranslationReview' ),
			array( 'aggregategroups', 'ApiAggregateGroups' ),
		);
	}
}
