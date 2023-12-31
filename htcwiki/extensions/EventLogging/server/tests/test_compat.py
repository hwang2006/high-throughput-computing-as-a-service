# -*- coding: utf-8 -*-
"""
  eventlogging unit tests
  ~~~~~~~~~~~~~~~~~~~~~~~

  This module contains tests for :module:`eventlogging.compat`.

"""
from __future__ import unicode_literals

import multiprocessing
import os
import unittest
import wsgiref.simple_server

import eventlogging


CI = 'TRAVIS' in os.environ or 'JENKINS_URL' in os.environ


class SingleServingHttpd(multiprocessing.Process):
    def __init__(self, resp):
        self.resp = resp.encode('utf-8')
        super(SingleServingHttpd, self).__init__()

    def run(self):
        def app(environ, start_response):
            start_response(str('200 OK'), [])
            return [self.resp]
        httpd = wsgiref.simple_server.make_server('127.0.0.1', 44080, app)
        httpd.handle_request()


class UriSplitTestCase(unittest.TestCase):
    """Test cases for ``urisplit``."""

    def test_urisplit(self):
        uri = 'tcp://127.0.0.1:8600/?q=1#f=2'
        parts = eventlogging.urisplit(uri)
        self.assertEquals(parts.query, 'q=1')
        self.assertEquals(parts.fragment, 'f=2')


class HttpGetTestCase(unittest.TestCase):
    """Test cases for ``http_get``."""

    @unittest.skipIf(CI, 'Running in a CI environment')
    def test_http_get(self):
        """``http_get`` can pull content via HTTP."""
        server = SingleServingHttpd('secret')
        server.start()
        response = eventlogging.http_get('http://127.0.0.1:44080')
        self.assertEquals(response, 'secret')
