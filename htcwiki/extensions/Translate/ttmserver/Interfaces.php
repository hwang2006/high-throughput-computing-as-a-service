<?php
/**
 * TTMServer - The Translate extension translation memory interface
 *
 * @file
 * @author Niklas Laxström
 * @copyright Copyright © 2012, Niklas Laxström
 * @license http://www.gnu.org/copyleft/gpl.html GNU General Public License 2.0 or later
 * @ingroup TTMServer
 */

/**
 * Interface for TTMServer that can be queried (=all of them).
 * @ingroup TTMServer
 * @since 2012-06-27
 */
interface ReadableTTMServer {
	/**
	 * Fetches all relevant suggestions for given text.
	 *
	 * @param $sourceLanguage String: language code for the provide text
	 * @param $targetLanguage String: language code for the suggestions
	 * @param $text String: the text for which to search suggestions
	 * @return array List: unordered suggestions, which each has fields:
	 *   - source: String: the original text of the suggestion
	 *   - target: String: the suggestion
	 *   - context: String: title of the page where the suggestion comes from
	 *   - quality: Float: the quality of suggestion, 1 is perfect match
	 */
	public function query( $sourceLanguage, $targetLanguage, $text );

	/**
	 * Determines if the suggestion returned by this TTMServer comes
	 * from this wiki or any other wiki.
	 * @param array $suggestion
	 * @return Bool
	 */
	public function isLocalSuggestion( array $suggestion );

	/**
	 * Given suggestion returned by this TTMServer, constructs fully
	 * qualified URL to the location of the translation.
	 * @param array $suggestion
	 * @return String URL
	 */
	public function expandLocation( array $suggestion );

}

/**
 * Interface for TTMServer that can be updated.
 * @ingroup TTMServer
 * @since 2012-06-27
 */
interface WritableTTMServer {
	/**
	 * Shovels the new translation into translation memory.
	 * Use this for single updates (=after message edit).
	 *
	 * @param $handle MessageHandle
	 * @param $targetText String
	 */
	public function update( MessageHandle $handle, $targetText );

	/**
	 * Called when starting to fill the translation memory.
	 * Set up necessary variables and remove old content
	 * from the server.
	 */
	public function beginBootstrap();

	/**
	 * Called before every batch (MessageGroup).
	 */
	public function beginBatch();

	/**
	 * Called multiple times per batch if necessary.
	 */
	public function batchInsertDefinitions( array $batch );

	/**
	 * Called multiple times per batch if necessary.
	 */
	public function batchInsertTranslations( array $batch );

	/**
	 * Called before every batch (MessageGroup).
	 */
	public function endBatch();

	/**
	 * Do any cleanup, optimizing etc.
	 */
	public function endBootstrap();
}
